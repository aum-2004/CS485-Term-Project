import fs from "fs";
import path from "path";
import { pool } from "../config/database";

async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  console.log("[migrate] Running schema...");
  await pool.query(sql);
  console.log("[migrate] Done.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("[migrate] Error:", err.message);
  process.exit(1);
});
