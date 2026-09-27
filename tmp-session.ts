import "dotenv/config";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const token = "tmp-diag-token-abcdefghijklmnopqrstuvwxyz";
  const id = createHash("sha256").update(token).digest("hex");
  await sql`delete from auth_sessions where id = ${id}`;
  await sql`insert into auth_sessions (id, user_id, expires_at) values (${id}, (select id from users where username = 'admin'), now() + interval '2 hours')`;
  console.log("session ready");
}

main();
