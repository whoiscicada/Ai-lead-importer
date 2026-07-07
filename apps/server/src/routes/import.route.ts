import { Router } from "express";
import { uploadCsv } from "../middleware/upload.middleware";
import { importCsv } from "../controllers/import.controller";

export const importRouter = Router();

importRouter.post("/", uploadCsv.single("file"), (req, res, next) => {
  importCsv(req, res).catch(next);
});
