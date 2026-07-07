import { NextFunction, Request, Response } from "express";
import multer from "multer";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
