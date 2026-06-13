import type { Express } from "express";
import { storage } from "../storage";
import type { InsertContract } from "@shared/schema";
import { authMiddleware, requireRole } from "./shared";
import { normalizeFileUrl, uploadBase64ToObjectStorage } from "./helpers";

export function registerContractRoutes(app: Express): void {
  app.get("/api/contracts", authMiddleware, async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
    const userIdParam = req.query.userId as string | undefined;

    let list;
    if (userIdParam) {
      if (!isAdmin && userIdParam !== currentUser.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (isAdmin && userIdParam !== currentUser.id && currentUser.organizationId) {
        const target = await storage.getUser(userIdParam);
        if (!target || target.organizationId !== currentUser.organizationId) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
      list = await storage.getContractsByUser(userIdParam);
    } else {
      if (!isAdmin) {
        list = await storage.getContractsByUser(currentUser.id);
      } else {
        list = await storage.getAllContracts(currentUser.organizationId ?? undefined);
      }
    }
    res.json(list.map((c) => ({ ...c, fileUrl: normalizeFileUrl(c.fileUrl) })));
  });

  app.get("/api/contracts/expiring", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const all = await storage.getAllContracts(currentUser.organizationId ?? undefined);
    const now = Date.now();
    const expiring = all.filter((c) => {
      const end = new Date(c.endDate).getTime();
      const noticeMs = (c.noticePeriodDays || 30) * 24 * 60 * 60 * 1000;
      return end >= now && end - now <= noticeMs;
    });
    res.json(expiring.map((c) => ({ ...c, fileUrl: normalizeFileUrl(c.fileUrl) })));
  });

  app.post("/api/contracts", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    try {
      const currentUser = req.authenticatedUser!;
      const { userId, title, startDate, endDate, noticePeriodDays, fileUrl, fileName } = req.body || {};
      if (!userId || !title || !startDate || !endDate || !fileUrl || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const contractor = await storage.getUser(userId);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      if (currentUser.organizationId && contractor.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      let storedFileUrl = fileUrl as string;
      if (storedFileUrl.startsWith("data:")) {
        const uploaded = await uploadBase64ToObjectStorage(storedFileUrl, fileName);
        if (!uploaded) {
          return res.status(500).json({ error: "Failed to upload contract file" });
        }
        storedFileUrl = uploaded;
      }

      const noticeDaysNum = Number(noticePeriodDays);
      const validNoticeDays =
        Number.isFinite(noticeDaysNum) && noticeDaysNum > 0 ? Math.floor(noticeDaysNum) : 30;
      const startDateStr = String(startDate);
      const endDateStr = String(endDate);
      if (
        Number.isNaN(new Date(startDateStr).getTime()) ||
        Number.isNaN(new Date(endDateStr).getTime())
      ) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      if (new Date(endDateStr) < new Date(startDateStr)) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      const insertPayload: InsertContract = {
        organizationId: currentUser.organizationId ?? null,
        userId,
        title: String(title),
        startDate: startDateStr,
        endDate: endDateStr,
        noticePeriodDays: validNoticeDays,
        fileUrl: storedFileUrl,
        fileName: String(fileName),
        createdBy: currentUser.id,
      };
      const created = await storage.createContract(insertPayload);

      await storage.createActivityLog({
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        action: "Contract uploaded",
        details: `Uploaded contract "${title}" for ${contractor.firstName} ${contractor.lastName}`,
        entityType: "contract",
        entityId: created.id,
      });

      res.status(201).json({ ...created, fileUrl: normalizeFileUrl(created.fileUrl) });
    } catch (error: any) {
      console.error("Contract creation error:", error?.message || error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  });

  app.delete("/api/contracts/:id", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    const contract = await storage.getContract(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    if (currentUser.organizationId && contract.organizationId !== currentUser.organizationId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const success = await storage.deleteContract(req.params.id);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete contract" });
    }
    await storage.createActivityLog({
      userId: currentUser.id,
      organizationId: currentUser.organizationId,
      action: "Contract deleted",
      details: `Deleted contract "${contract.title}"`,
      entityType: "contract",
      entityId: contract.id,
    });
    res.status(204).send();
  });
}
