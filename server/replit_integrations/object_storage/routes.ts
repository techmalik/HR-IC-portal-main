import type { Express, RequestHandler } from "express";
import { Client } from "@replit/object-storage";
import path from "path";
import type { IStorage } from "../../storage";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".json": "application/json",
};

async function isAuthorizedForObject(
  callerFileUrl: string,
  caller: Express.Request["authenticatedUser"] & {},
  storage: IStorage,
): Promise<boolean> {
  const isAdmin = caller.role === "admin" || caller.role === "owner";
  const callerOrgId = caller.organizationId;

  const invoice = await storage.getInvoiceByFileUrl(callerFileUrl);
  if (invoice) {
    if (caller.id === invoice.userId) return true;
    if (isAdmin) return callerOrgId === invoice.organizationId;
    const directReports = await storage.getUsersBySupervisor(caller.id);
    return (
      directReports.some((u) => u.id === invoice.userId) &&
      callerOrgId === invoice.organizationId
    );
  }

  const contract = await storage.getContractByFileUrl(callerFileUrl);
  if (contract) {
    if (caller.id === contract.userId) return true;
    if (isAdmin) return callerOrgId === contract.organizationId;
    const directReports = await storage.getUsersBySupervisor(caller.id);
    return (
      directReports.some((u) => u.id === contract.userId) &&
      callerOrgId === contract.organizationId
    );
  }

  const expense = await storage.getExpenseByReceiptUrl(callerFileUrl);
  if (expense) {
    if (caller.id === expense.userId) return true;
    if (isAdmin) return callerOrgId === expense.organizationId;
    const directReports = await storage.getUsersBySupervisor(caller.id);
    return (
      directReports.some((u) => u.id === expense.userId) &&
      callerOrgId === expense.organizationId
    );
  }

  return isAdmin;
}

export function registerObjectStorageRoutes(
  app: Express,
  authMiddleware: RequestHandler,
  storage: IStorage,
): void {
  const storageClient = new Client();

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const { randomUUID } = await import("crypto");
      const objectId = randomUUID();
      const storagePath = `.private/uploads/${objectId}`;
      const objectPath = `/objects/uploads/${objectId}`;

      res.json({
        storagePath,
        objectPath,
        metadata: { name },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", authMiddleware, async (req, res) => {
    try {
      const requestedPath = req.params.objectPath || req.path.replace(/^\/objects\//, "");
      const storagePath = `.private/${requestedPath}`;
      const callerFileUrl = `/objects/${requestedPath}`;

      const caller = req.authenticatedUser;
      if (!caller) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const authorized = await isAuthorizedForObject(callerFileUrl, caller, storage);
      if (!authorized) {
        return res.status(403).json({ error: "Forbidden - Access denied" });
      }

      let fileBuffer: Buffer | null = null;
      let resolvedPath = storagePath;

      const result = await storageClient.downloadAsBytes(storagePath);
      if (result.ok && Array.isArray(result.value) && result.value.length > 0) {
        fileBuffer = Buffer.from(result.value[0]);
      }

      if (!fileBuffer) {
        const ext = path.extname(storagePath);
        if (!ext) {
          const listing = await storageClient.list({ prefix: storagePath + "." });
          if (listing.ok && listing.value.length > 0) {
            const match = listing.value.find(
              (f) => f.name !== storagePath + "/" && f.name.startsWith(storagePath + ".")
            );
            if (match) {
              resolvedPath = match.name;
              const retry = await storageClient.downloadAsBytes(match.name);
              if (retry.ok && Array.isArray(retry.value) && retry.value.length > 0) {
                fileBuffer = Buffer.from(retry.value[0]);
              }
            }
          }
        }
      }

      if (!fileBuffer) {
        return res.status(404).json({ error: "Object not found" });
      }

      const resolvedExt = path.extname(resolvedPath) || "";
      const contentType = MIME_TYPES[resolvedExt.toLowerCase()] || "application/octet-stream";

      const filename = req.query.filename as string | undefined;
      const download = req.query.download === "true";

      if (filename) {
        const sanitizedFilename = filename.replace(/["\r\n]/g, "");
        if (download) {
          res.set("Content-Disposition", `attachment; filename="${sanitizedFilename}"`);
        } else {
          res.set("Content-Disposition", `inline; filename="${sanitizedFilename}"`);
        }
      }

      res.set("Content-Type", contentType);
      res.set("Content-Length", String(fileBuffer.length));
      res.set("Cache-Control", "private, max-age=3600");
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error serving object:", error);
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
