/**
 * Centrale partijtypes. Houd synchroon met Postgres enum `partij_type`.
 * Nieuw type toevoegen:
 * 1) ALTER TYPE partij_type ADD VALUE 'nieuw_type';
 * 2) voeg hier toe aan PARTIJ_TYPES
 */
export const PARTIJ_TYPES = ['klant', 'leverancier'] as const;

export type PartijType = (typeof PARTIJ_TYPES)[number];

export function isPartijType(value: unknown): value is PartijType {
  return typeof value === 'string' && (PARTIJ_TYPES as readonly string[]).includes(value);
}

export interface Partij {
  id: number;
  nummer: string;
  naam: string | null;
  type: PartijType;
  created_at: string;
}

export interface Mutatie {
  id: number;
  partij_id: number;
  datum: string;
  geladen: number;
  gelost: number;
  geladen_cactag6?: number;
  geladen_bleche?: number;
  gelost_cactag6?: number;
  gelost_bleche?: number;
  created_at: string;
  partij_nummer?: string;
  partij_naam?: string;
  partij_type?: string;
}

export interface Overzicht {
  id: number;
  nummer: string;
  naam: string | null;
  type: PartijType;
  totaal_geladen: number;
  totaal_gelost: number;
  balans: number;
}

export interface FustOverzicht {
  id: number;
  nummer: string;
  naam: string | null;
  type: PartijType;
  cactag6_geladen: number;
  cactag6_gelost: number;
  cactag6_balans: number;
  bleche_geladen: number;
  bleche_gelost: number;
  bleche_balans: number;
}

export interface DashboardStats {
  totaalPartijen: number;
  totaalKlanten: number;
  totaalLeveranciers: number;
  totaalGeladen: number;
  totaalGelost: number;
  tegoedArnoStraver: number;
}
