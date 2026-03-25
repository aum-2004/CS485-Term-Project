import { pool } from "../config/database";

/**
 * Seed script – no fake data in production.
 * Real threads are added by users via POST /api/threads with a Reddit URL.
 */
async function seed(): Promise<void> {
  console.log("[seed] No seed data to insert. Add threads via the UI.");
  await pool.end();
}

seed().catch((err) => {
  console.error("[seed] Error:", err.message);
  process.exit(1);
});
