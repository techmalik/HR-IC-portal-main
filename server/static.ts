import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectRouteMeta, isPublicSpaRoute } from "./spa-meta";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");

    const pathname = req.path || "/";
    if (isPublicSpaRoute(pathname)) {
      html = injectRouteMeta(html, pathname);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });
}
