/**
 * Zet/update de admin-gebruiker in Neon (gehashed wachtwoord).
 *
 * Gebruik:
 *   npx tsx scripts/seed-admin-user.ts
 *   npx tsx scripts/seed-admin-user.ts email@example.com 'NieuwWachtwoord'
 */
import { resolve } from 'path';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from '@neondatabase/serverless';

config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const email = (process.argv[2] || 'administratie@arnostraver.nl').trim().toLowerCase();
  const password = process.argv[3] || 'Middenweg23!';

  const connectionString = process.env.DATABASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (!connectionString) throw new Error('DATABASE_URL ontbreekt');

  const passwordHash = await bcrypt.hash(password, 12);
  const pool = new Pool({ connectionString });

  try {
    await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, passwordHash]
    );
    console.log(`Gebruiker gezet/bijgewerkt: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
