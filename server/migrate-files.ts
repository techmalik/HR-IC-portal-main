import { Router, type RequestHandler } from "express";
import multer from "multer";
import { Client } from "@replit/object-storage";
import { randomUUID } from "crypto";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export function createMigrateFilesRouter(authMiddleware: RequestHandler, requireAdmin: RequestHandler): Router {
  const router = Router();
  const getStorageClient = () => new Client();

  router.post("/api/admin/migrate-files", authMiddleware, requireAdmin, upload.array("files", 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const results: Array<{
        originalName: string;
        objectPath: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const file of files) {
        try {
          const originalName = file.originalname;
          // Use a server-generated key rather than the client-supplied
          // filename — a raw filename could traverse paths (`../..`) or
          // overwrite an existing object (e.g. another invoice's UUID key).
          const ext = path.extname(originalName);
          const objectId = randomUUID();
          const storagePath = `.private/uploads/${objectId}${ext}`;

          const uploadResult = await getStorageClient().uploadFromBytes(storagePath, file.buffer);
          if (!uploadResult.ok) {
            throw new Error(String(uploadResult.error) || "Upload failed");
          }

          const objectPath = `/objects/uploads/${objectId}${ext}`;

          console.log(`[MigrateFiles] Uploaded ${originalName} -> ${objectPath}`);
          results.push({ originalName, objectPath, success: true });
        } catch (err: any) {
          console.error(`[MigrateFiles] Failed to upload ${file.originalname}:`, err.message);
          results.push({
            originalName: file.originalname,
            objectPath: "",
            success: false,
            error: err.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      res.json({
        message: `Uploaded ${successCount} of ${results.length} files`,
        successCount,
        failCount,
        results,
      });
    } catch (err: any) {
      console.error("[MigrateFiles] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
