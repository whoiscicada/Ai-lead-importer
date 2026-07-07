import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { importRouter } from "./routes/import.route";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/import", importRouter);

app.use(errorMiddleware);

app.listen(env.port, () => {
  console.log(`GrowEasy server listening on port ${env.port}`);
});
