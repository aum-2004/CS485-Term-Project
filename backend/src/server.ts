import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { pool } from "./config/database";
import { redis } from "./config/redis";
import { ThreadService } from "./modules/threads/thread.service";
import { ThreadRepository } from "./modules/threads/thread.repository";
import { RedditService } from "./services/reddit.service";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function start(): Promise<void> {
  // Verify database connectivity
  try {
    await pool.query("SELECT 1");
    console.log("[DB] Connected to PostgreSQL");
  } catch (err) {
    console.error("[DB] Cannot connect – is PostgreSQL running?", (err as Error).message);
    process.exit(1);
  }

  // Connect Redis (non-fatal)
  try {
    await redis.connect();
  } catch (err) {
    console.warn("[Redis] Unavailable – cache disabled:", (err as Error).message);
  }

  // Auto-seed default threads from Reddit (non-fatal, runs in background)
  const threadService = new ThreadService(new ThreadRepository(), new RedditService());
  threadService.seedDefaultThreads()
    .then(() => console.log("[seed] Default Reddit threads ready"))
    .catch((err) => console.warn("[seed] Could not seed default threads:", (err as Error).message));

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

start();
