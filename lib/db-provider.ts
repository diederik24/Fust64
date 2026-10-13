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

const provider =
  (process.env.DB_PROVIDER as 'neon' | 'supabase' | undefined) ||
  (process.env.DATABASE_URL ? 'neon' : 'supabase');

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
