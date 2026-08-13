import express from "express";
import type { Express } from "express";
import path from "path";

export function registerStorageProxy(app: Express) {
  // Serve the local uploads directory statically at /manus-storage
  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use("/manus-storage", express.static(uploadsDir));
}
