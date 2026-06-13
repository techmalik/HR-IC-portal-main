import type { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, requireRole } from "./shared";

export function registerBillingRoutes(app: Express): void {
  app.get("/api/billing", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(400).json({ error: "User is not associated with an organization" });
    }
    const subscription = await storage.getSubscriptionByOrganization(currentUser.organizationId);
    const organization = await storage.getOrganization(currentUser.organizationId);
    if (!subscription || !organization) {
      return res.status(404).json({ error: "Billing information not found" });
    }
    res.json({
      subscription,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        billingEmail: organization.billingEmail,
      },
    });
  });

  app.get("/api/billing/usage", authMiddleware, requireRole("admin", "owner"), async (req, res) => {
    const currentUser = req.authenticatedUser!;
    if (!currentUser.organizationId) {
      return res.status(400).json({ error: "User is not associated with an organization" });
    }
    const subscription = await storage.getSubscriptionByOrganization(currentUser.organizationId);
    const currentSeats = await storage.getUserCountByOrganization(currentUser.organizationId);
    const plan = subscription?.plan || "free";
    const maxSeats = subscription?.maxSeats || 3;
    const percentUsed = maxSeats > 0 ? Math.round((currentSeats / maxSeats) * 100) : 0;
    res.json({ currentSeats, maxSeats, plan, percentUsed });
  });

  // Paid plan changes require Stripe integration which is not yet wired up.
  // Return 402 so the frontend can show a "coming soon" message.
  app.post("/api/billing/change-plan", authMiddleware, requireRole("admin", "owner"), (_req, res) => {
    return res.status(402).json({
      error: "Plan upgrades are coming soon. Please contact support to change your plan.",
    });
  });
}
