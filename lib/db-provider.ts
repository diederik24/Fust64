/**
 * Database provider switch.
 * - DB_PROVIDER=neon (default als DATABASE_URL gezet is)
 * - DB_PROVIDER=supabase → oude Supabase-laag als back-up
 *
 * Alleen server-side gebruiken (API routes / server actions).
 * Client-components: types uit lib/db-types.ts + fetch naar /api/*.
 */
import 'server-only';
import * as neon from './db-neon';
import * as supabase from './db-supabase';

export type {
  Partij,
  Mutatie,
  Overzicht,
  FustOverzicht,
} from './db-types';

function resolveProvider(): 'neon' | 'supabase' {
  const raw = (process.env.DB_PROVIDER || '').trim().replace(/^['"]|['"]$/g, '');
  if (raw === 'supabase') return 'supabase';
  if (raw === 'neon') return 'neon';
  // Negeer placeholders zoals [SENSITIVE] uit vercel env pull
  return process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('[SENSITIVE]')
    ? 'neon'
    : 'supabase';
}

const provider = resolveProvider();

export const dbProvider = provider;

const impl = provider === 'supabase' ? supabase : neon;

console.log(`db-provider: actief = ${provider}`);

export const getPartijen = impl.getPartijen;
export const getPartijByNummer = impl.getPartijByNummer;
export const createPartij = impl.createPartij;
export const updatePartij =
  provider === 'neon'
    ? neon.updatePartij
    : async () => {
        throw new Error('updatePartij is alleen beschikbaar met Neon (DB_PROVIDER=neon)');
      };
export const createMutatie = impl.createMutatie;
export const getMutaties = impl.getMutaties;
export const getOverzicht = impl.getOverzicht;
export const deleteAllMutaties = impl.deleteAllMutaties;
export const deleteMutatie = impl.deleteMutatie;
export const getFustOverzicht = impl.getFustOverzicht;
export const getMutatiesByPartijId = impl.getMutatiesByPartijId;
export const getMutatiesByPartijNummer = impl.getMutatiesByPartijNummer;
