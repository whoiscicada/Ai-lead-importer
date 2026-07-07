import multer from "multer";
import { env } from "../config/env";
import { HttpError } from "./error.middleware";

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsvExtension = file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsvExtension) {
      cb(new HttpError(400, "Only .csv files are accepted"));
      return;
    }
    cb(null, true);
  },
});
