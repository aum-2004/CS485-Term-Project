import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getComments } from "./modules/comments/comment.controller";
import { getSummary, regenerateSummary } from "./modules/summary/summary.controller";
import { getThreads, createThread, createCustomThread, deleteThread } from "./modules/threads/thread.controller";
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"],
  })
);
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Thread management ─────────────────────────────────────────────────────────
app.get("/api/threads", getThreads);
app.post("/api/threads", createThread);
app.post("/api/threads/custom", createCustomThread);
app.delete("/api/threads/:threadId", deleteThread);

// ── User Story A: Inline AI Reasoning Summary ────────────────────────────────
app.get("/api/threads/:threadId/comments", getComments);

// ── User Story B: Moderator Debate Summary ───────────────────────────────────
app.get("/api/threads/:threadId/summary", getSummary);
app.post("/api/threads/:threadId/summary/regenerate", regenerateSummary);

app.use(errorHandler);

export default app;
