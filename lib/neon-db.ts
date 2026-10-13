import { Pool, QueryResultRow } from '@neondatabase/serverless';

declare global {
  // eslint-disable-next-line no-var
  var __fustNeonPool: Pool | undefined;
}

/**
 * Normaliseer en valideer DATABASE_URL.
 * Voorkomt o.a. Vercel-placeholder `[SENSITIVE]` die door `pg` als host `base` wordt gelezen.
 */
function getConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw || !raw.trim()) {
    throw new Error('DATABASE_URL ontbreekt (Neon)');
  }

  const connectionString = raw.trim().replace(/^['"]|['"]$/g, '');

  if (
    connectionString === '[SENSITIVE]' ||
    connectionString.includes('[SENSITIVE]') ||
    !/^postgres(ql)?:\/\//i.test(connectionString)
  ) {
    throw new Error(
      'DATABASE_URL is ongeldig. Zet in Vercel de echte Neon pooled connection string (niet [SENSITIVE]).'
    );
  }

  let hostname: string;
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    throw new Error('DATABASE_URL kon niet als URL worden geparsed');
  }

  if (!hostname || hostname === 'base' || !hostname.includes('neon.tech')) {
    throw new Error(
      `DATABASE_URL heeft ongeldige host "${hostname || '(leeg)'}". Verwacht een *.neon.tech pooled host.`
    );
  }

  return connectionString;
}

function getPool(): Pool {
  if (!global.__fustNeonPool) {
    global.__fustNeonPool = new Pool({
      connectionString: getConnectionString(),
      max: 10,
    });
  }

  return global.__fustNeonPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
