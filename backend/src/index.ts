import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import sessionRoutes from "./routes/session.routes";
import schoolRoutes from "./routes/school.routes";
import quizRoutes from "./routes/quiz.routes";

// Register AI queue workers (side-effect import — starts Bull processors)
import "./queues/aiProcessor";

const app = express();

// ─── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ─── Routes ─────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/school", schoolRoutes);
app.use("/api/quiz", quizRoutes);

// ─── Error Handler ──────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────
app.listen(env.PORT, () => {
    console.log(`🚀 Mass Assessment API running on http://localhost:${env.PORT}`);
});

export default app;
