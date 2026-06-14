import type { Express } from "express";
import { storage } from "../storage";
import type { User } from "@shared/schema";
import { createEvaluationBodySchema } from "@shared/schema";
import { validateBody } from "../middleware/validate";
import {
  authMiddleware,
  asyncHandler,
  hasSupervisorPrivileges,
  checkOrgBoundary,
} from "./shared";
import {
  createNotification,
  notifyFeedbackRequested,
  notifyEvaluationOutcome,
} from "../notificationService";

function canReadEvaluation(
  currentUser: User,
  evaluation: { icId: string; managerId: string; organizationId: string | null }
): boolean {
  if (currentUser.id === evaluation.icId || currentUser.id === evaluation.managerId) return true;
  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  return isAdmin && currentUser.organizationId === evaluation.organizationId;
}

export function registerEvaluationRoutes(app: Express): void {
  app.get("/api/evaluations", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";

    if (!isAdmin) {
      const own = await storage.getEvaluationsByIC(currentUser.id);
      const managed = await storage.getEvaluationsByManager(currentUser.id);
      const deduped = new Map([...own, ...managed].map((e) => [e.id, e]));
      return res.json(Array.from(deduped.values()));
    }

    const { managerId, icId } = req.query;
    if (managerId) {
      const target = await storage.getUser(managerId as string);
      if (!target || !checkOrgBoundary(currentUser, target)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.json(await storage.getEvaluationsByManager(managerId as string));
    } else if (icId) {
      const target = await storage.getUser(icId as string);
      if (!target || !checkOrgBoundary(currentUser, target)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.json(await storage.getEvaluationsByIC(icId as string));
    } else {
      return res.json(await storage.getAllEvaluations(currentUser.organizationId ?? undefined));
    }
  }));

  app.get("/api/evaluations/pending-count", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    let count = 0;
    if (currentUser.role === "ic") {
      const evaluations = await storage.getEvaluationsByIC(currentUser.id);
      count = evaluations.filter(e => e.status === "draft").length;
    } else {
      const evaluations = await storage.getEvaluationsByManager(currentUser.id);
      count = evaluations.filter(e => e.status === "ic_submitted").length;
    }
    res.json({ count });
  });

  app.get("/api/evaluations/:id", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (!canReadEvaluation(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(evaluation);
  });

  app.get("/api/evaluations/:id/sections", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (!canReadEvaluation(currentUser, evaluation)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const sections = await storage.getEvaluationSections(req.params.id);
    res.json(sections);
  });

  app.get("/api/users/:id/last-evaluation", authMiddleware, asyncHandler(async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const targetUserId = req.params.id;
    const isSelf = currentUser.id === targetUserId;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    if (!isSelf && !isAdmin) {
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser || !checkOrgBoundary(currentUser, targetUser)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const directReports = await storage.getUsersBySupervisor(currentUser.id);
      if (!directReports.some((u) => u.id === targetUserId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const evaluation = await storage.getLastCompletedEvaluation(targetUserId);
    res.json(evaluation || null);
  }));

  app.post("/api/evaluations", authMiddleware, validateBody(createEvaluationBodySchema), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isSupervisor = await hasSupervisorPrivileges(currentUser.id);
    const isCreatingSelfEvaluation = req.body.icId === currentUser.id;

    if (!isSupervisor && !isCreatingSelfEvaluation) {
      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    }

    if (isCreatingSelfEvaluation) {
      if (!req.body.managerId) {
        return res.status(400).json({ error: "Manager/supervisor is required for self-evaluations" });
      }
      const manager = await storage.getUser(req.body.managerId);
      if (!manager) {
        return res.status(400).json({ error: "Selected supervisor does not exist" });
      }
      const managerIsSupervisor = await hasSupervisorPrivileges(req.body.managerId);
      if (!managerIsSupervisor && manager.role !== "admin") {
        return res.status(400).json({ error: "Selected user is not a valid supervisor" });
      }
    }

    const evaluationData = {
      icId: isCreatingSelfEvaluation ? currentUser.id : req.body.icId,
      managerId: isCreatingSelfEvaluation ? req.body.managerId : (req.body.managerId || currentUser.id),
      periodStart: req.body.periodStart,
      periodEnd: req.body.periodEnd,
      status: "draft",
      organizationId: currentUser.organizationId,
    };

    try {
      const evaluation = await storage.createEvaluation(evaluationData);
      await storage.createDefaultSectionsForEvaluation(evaluation.id);

      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: isCreatingSelfEvaluation ? "Self-evaluation started" : "Evaluation created",
        details: `Created performance evaluation for period ${req.body.periodStart} to ${req.body.periodEnd}`,
        entityType: "evaluation",
        entityId: evaluation.id,
      });

      if (isCreatingSelfEvaluation) {
        const manager = await storage.getUser(req.body.managerId);
        if (manager) {
          await createNotification(manager.id, {
            type: "evaluation_created",
            title: "Self-Evaluation Started",
            message: `${currentUser.firstName} ${currentUser.lastName} has started a self-evaluation and will submit it for your review.`,
            entityType: "evaluation",
            entityId: evaluation.id,
            actorId: currentUser.id,
          });
        }
      } else {
        const ic = await storage.getUser(req.body.icId);
        if (ic) {
          await createNotification(ic.id, {
            type: "evaluation_created",
            title: "New Performance Evaluation",
            message: `A new performance evaluation has been created for you. Please complete your self-assessment.`,
            entityType: "evaluation",
            entityId: evaluation.id,
            actorId: currentUser.id,
          });
        }
      }

      res.status(201).json(evaluation);
    } catch (error) {
      console.error("Error creating evaluation:", error);
      res.status(500).json({ error: "Failed to create evaluation" });
    }
  });

  app.patch("/api/evaluations/:id", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingEvaluation = await storage.getEvaluation(req.params.id);
    if (!existingEvaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (currentUser.role === "ic" && existingEvaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      status,
      overallSelfRating, overallManagerRating, overallScore,
      outcomes, expectationsForNextReview, managerSummary,
      newExperienceLevel, experienceLevelAtEval,
    } = req.body;
    const updates: Record<string, unknown> = {
      status, overallSelfRating, overallManagerRating, overallScore,
      outcomes, expectationsForNextReview, managerSummary,
      newExperienceLevel, experienceLevelAtEval,
    };
    for (const k of Object.keys(updates)) { if (updates[k] === undefined) delete updates[k]; }

    if (status === "ic_submitted") {
      updates.icSubmittedAt = new Date();
    } else if (status === "manager_submitted" || status === "completed") {
      updates.managerSubmittedAt = new Date();
      if (status === "completed") updates.completedAt = new Date();
    }

    const evaluation = await storage.updateEvaluation(req.params.id, updates as Partial<import("@shared/schema").Evaluation>);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }

    if (req.body.status === "ic_submitted") {
      const manager = await storage.getUser(evaluation.managerId);
      const ic = await storage.getUser(evaluation.icId);
      if (manager && ic) {
        await createNotification(manager.id, {
          type: "evaluation_ic_submitted",
          title: "Self-Assessment Submitted",
          message: `${ic.firstName} ${ic.lastName} has submitted their self-assessment. Please review and complete the evaluation.`,
          entityType: "evaluation",
          entityId: evaluation.id,
          actorId: ic.id,
        });
      }
    }

    if (req.body.status === "completed") {
      await storage.createActivityLog({
        userId: evaluation.managerId,
        organizationId: currentUser.organizationId,
        action: "Evaluation completed",
        details: `Completed performance evaluation for period ${evaluation.periodStart} to ${evaluation.periodEnd}`,
        entityType: "evaluation",
        entityId: evaluation.id,
      });

      const ic = await storage.getUser(evaluation.icId);
      const manager = await storage.getUser(evaluation.managerId);
      if (ic && manager) {
        await createNotification(ic.id, {
          type: "evaluation_completed",
          title: "Evaluation Finalized",
          message: `Your performance evaluation has been completed by ${manager.firstName} ${manager.lastName}.`,
          entityType: "evaluation",
          entityId: evaluation.id,
          actorId: manager.id,
        });

        if (evaluation.outcomes && evaluation.outcomes.length > 0) {
          try {
            await notifyEvaluationOutcome(evaluation.id, ic.id, evaluation.outcomes, manager.id);
          } catch (err) {
            console.error("Failed to send evaluation outcome notification:", err);
          }
        }

        if (evaluation.newExperienceLevel && evaluation.newExperienceLevel !== ic.experienceLevel) {
          await storage.updateUser(ic.id, { experienceLevel: evaluation.newExperienceLevel });
        }
      }
    }

    res.json(evaluation);
  });

  app.patch("/api/evaluation-sections/:id", authMiddleware, async (req, res) => {
    const section = await storage.updateEvaluationSection(req.params.id, req.body);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json(section);
  });

  app.post("/api/evaluations/:id/sections/bulk-update", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const evaluation = await storage.getEvaluation(req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    if (currentUser.role === "ic" && evaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const { sections } = req.body;
      const updatedSections = [];
      for (const sectionUpdate of sections) {
        const updated = await storage.updateEvaluationSection(sectionUpdate.id, sectionUpdate);
        if (updated) updatedSections.push(updated);
      }
      res.json(updatedSections);
    } catch (error) {
      res.status(500).json({ error: "Failed to update sections" });
    }
  });

  app.post("/api/evaluations/:id/finalize", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const existingEvaluation = await storage.getEvaluation(req.params.id);
    if (!existingEvaluation) {
      return res.status(404).json({ error: "Evaluation not found" });
    }
    const isIC = currentUser.role === "ic";
    const isManager = await hasSupervisorPrivileges(currentUser.id);
    if (isIC && existingEvaluation.icId !== currentUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!isIC && !isManager) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const { sections, evaluationUpdates, finalizeAs } = req.body;
      if (sections && sections.length > 0) {
        for (const sectionUpdate of sections) {
          await storage.updateEvaluationSection(sectionUpdate.id, sectionUpdate);
        }
      }

      const updates: Record<string, any> = { ...evaluationUpdates };
      if (finalizeAs === "ic") {
        updates.status = "ic_submitted";
        updates.icSubmittedAt = new Date();
      } else if (finalizeAs === "manager") {
        updates.status = "completed";
        updates.managerSubmittedAt = new Date();
        updates.completedAt = new Date();

        const allSections = await storage.getEvaluationSections(req.params.id);
        const managerRatings = allSections
          .map(s => s.managerRating)
          .filter((r): r is number => r !== null && r !== undefined);
        if (managerRatings.length > 0) {
          updates.overallScore = Math.round(managerRatings.reduce((a, b) => a + b, 0) / managerRatings.length);
        }

        if (updates.newExperienceLevel) {
          await storage.updateUser(existingEvaluation.icId, { experienceLevel: updates.newExperienceLevel });
        }
      }

      const updatedEvaluation = await storage.updateEvaluation(req.params.id, updates);
      if (!updatedEvaluation) {
        return res.status(500).json({ error: "Failed to update evaluation" });
      }

      if (finalizeAs === "ic") {
        const manager = await storage.getUser(existingEvaluation.managerId);
        const ic = await storage.getUser(existingEvaluation.icId);
        if (manager && ic) {
          await createNotification(manager.id, {
            type: "evaluation_ic_submitted",
            title: "Self-Assessment Submitted",
            message: `${ic.firstName} ${ic.lastName} has submitted their self-assessment. Please review and complete the evaluation.`,
            entityType: "evaluation",
            entityId: existingEvaluation.id,
            actorId: ic.id,
          });
        }
      } else if (finalizeAs === "manager") {
        const ic = await storage.getUser(existingEvaluation.icId);
        const manager = await storage.getUser(existingEvaluation.managerId);
        if (ic && manager) {
          await createNotification(ic.id, {
            type: "evaluation_completed",
            title: "Evaluation Completed",
            message: `Your performance evaluation for ${existingEvaluation.periodStart} to ${existingEvaluation.periodEnd} has been completed by ${manager.firstName} ${manager.lastName}.`,
            entityType: "evaluation",
            entityId: existingEvaluation.id,
            actorId: manager.id,
          });
        }
      }

      try {
        await storage.createActivityLog({
          userId: currentUser.id,
          organizationId: currentUser.organizationId,
          action: finalizeAs === "ic" ? "Self-assessment submitted" : "Evaluation completed",
          details: `${finalizeAs === "ic" ? "Submitted self-assessment" : "Finalized evaluation"} for period ${existingEvaluation.periodStart} to ${existingEvaluation.periodEnd}`,
          entityType: "evaluation",
          entityId: existingEvaluation.id,
        });
      } catch (e) {
        console.error("Failed to create activity log:", e);
      }

      res.json(updatedEvaluation);
    } catch (error) {
      console.error("Finalization error:", error);
      res.status(500).json({ error: "Failed to finalize evaluation" });
    }
  });

  // Feedback invitations
  app.get("/api/feedback-invitations", authMiddleware, async (req, res) => {
    const { evaluationId } = req.query;
    if (evaluationId) {
      const invitations = await storage.getFeedbackInvitationsByEvaluation(evaluationId as string);
      res.json(invitations);
    } else {
      res.json([]);
    }
  });

  app.post("/api/feedback-invitations", authMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers(req.authenticatedUser!.organizationId ?? undefined);
      const invitedUser = users.find(u => u.email === req.body.email);

      const { evaluationId, invitedById, email } = req.body;
      const invitation = await storage.createFeedbackInvitation({
        evaluationId,
        invitedById,
        invitedUserId: invitedUser?.id || "unknown",
        organizationId: req.authenticatedUser!.organizationId,
      });
      void email;

      try {
        await storage.createActivityLog({
          userId: req.body.invitedById,
          organizationId: req.authenticatedUser!.organizationId,
          action: "Feedback invitation sent",
          details: `Invited ${req.body.email} to provide feedback`,
          entityType: "evaluation",
          entityId: req.body.evaluationId,
        });
      } catch (e) {
        console.error("Failed to create activity log:", e);
      }

      if (invitedUser && req.body.evaluationId) {
        try {
          const evaluation = await storage.getEvaluation(req.body.evaluationId);
          let icName = "a team member";
          if (evaluation) {
            const ic = await storage.getUser(evaluation.icId);
            if (ic) icName = `${ic.firstName} ${ic.lastName}`;
          }
          await notifyFeedbackRequested(
            req.body.evaluationId,
            req.body.invitedById || req.authenticatedUser!.id,
            invitedUser.id,
            icName,
          );
        } catch (notifyErr) {
          console.error("Failed to send feedback invitation notification:", notifyErr);
        }
      }

      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.patch("/api/feedback-invitations/:id", authMiddleware, async (req, res) => {
    const { status, feedback, rating } = req.body;
    const invitation = await storage.updateFeedbackInvitation(req.params.id, {
      status,
      feedback,
      rating,
      completedAt: status === "completed" ? new Date() : undefined,
    });
    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }
    res.json(invitation);
  });
}
