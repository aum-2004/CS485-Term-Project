/**
 * seed-neon.ts
 *
 * Run this ONCE from your local Mac to populate the Neon (cloud) database
 * with real Reddit threads.  Reddit API works fine from a home/campus IP.
 *
 * Usage:
 *   DATABASE_URL=<your-neon-url> npx ts-node scripts/seed-neon.ts
 *
 * The script:
 *   1. Clears any old auto-seeded threads from the DB
 *   2. Fetches today's hot posts from 6 popular subreddits via Reddit's API
 *   3. Inserts threads + comments into Neon
 *   4. Prints a summary and exits
 */

import { Pool } from "pg";
import { RedditService } from "../src/services/reddit.service";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  console.error("Usage: DATABASE_URL=<neon-url> npx ts-node scripts/seed-neon.ts");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
const reddit = new RedditService();

const SUBREDDITS = ["technology", "worldnews", "science", "todayilearned", "news", "space"];
const POSTS_PER_SUB = 3;
const CANDIDATES = 8;

async function run() {
  console.log("Connecting to Neon…");
  await pool.query("SELECT 1"); // test connection
  console.log("Connected.\n");

  // Wipe old seeded threads
  const { rowCount: deleted } = await pool.query("DELETE FROM threads WHERE is_seeded = TRUE");
  console.log(`Cleared ${deleted ?? 0} old seeded thread(s).\n`);

  let totalAdded = 0;

  for (const sub of SUBREDDITS) {
    let added = 0;
    console.log(`Fetching r/${sub}…`);
    try {
      const urls = await reddit.fetchSubredditHot(sub, CANDIDATES);
      for (const url of urls) {
        if (added >= POSTS_PER_SUB) break;
        try {
          const thread = await reddit.fetchThread(url);
          const { threadId, title, comments } = thread;

          await pool.query(
            `INSERT INTO threads (id, title, is_seeded)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (id) DO UPDATE SET is_seeded = TRUE`,
            [threadId, title]
          );

          for (const c of comments) {
            await pool.query(
              `INSERT INTO comments (id, thread_id, author, content)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO NOTHING`,
              [c.id, threadId, c.author, c.content]
            );
          }

          console.log(`  ✓ [r/${sub}] ${title.slice(0, 70)}`);
          added++;
          totalAdded++;
        } catch (err) {
          console.warn(`  ✗ skipped ${url}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      console.warn(`  Could not fetch r/${sub}: ${(err as Error).message}`);
    }
  }

  console.log(`\nDone. Seeded ${totalAdded} thread(s) into Neon.`);
  await pool.end();
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
