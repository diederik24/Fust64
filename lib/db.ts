/**
 * Legacy entrypoint. SQLite (better-sqlite3) is verwijderd.
 * Gebruik lib/db-provider.ts (Neon default / Supabase back-up).
 */
export type {
  Partij,
  Mutatie,
  Overzicht,
  FustOverzicht,
  PartijType,
} from './db-types';

export {
  getPartijen,
  getPartijByNummer,
  createPartij,
  createMutatie,
  getMutaties,
  getOverzicht,
  deleteAllMutaties,
  deleteMutatie,
  getFustOverzicht,
  getMutatiesByPartijId,
  getMutatiesByPartijNummer,
} from './db-provider';
