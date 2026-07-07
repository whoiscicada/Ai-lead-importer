import { Router } from "express";
import { uploadCsv } from "../middleware/upload.middleware";
import { importCsv } from "../controllers/import.controller";
import { startImportJob, streamImportJob } from "../controllers/importStream.controller";

export const importRouter = Router();

importRouter.post("/", uploadCsv.single("file"), (req, res, next) => {
  importCsv(req, res).catch(next);
});

importRouter.post("/jobs", uploadCsv.single("file"), (req, res, next) => {
  startImportJob(req, res).catch(next);
});

importRouter.get("/jobs/:jobId/stream", (req, res, next) => {
  try {
    streamImportJob(req, res);
  } catch (err) {
    next(err);
  }
});
