import { supabase } from './supabase';

export interface Partij {
  id: number;
  nummer: string;
  naam: string | null;
  type: 'klant' | 'leverancier';
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
  type: 'klant' | 'leverancier';
  totaal_geladen: number;
  totaal_gelost: number;
  balans: number;
}

export async function getPartijen(): Promise<Partij[]> {
  const { data, error } = await supabase
    .from('partijen')
    .select('*')
    .order('type', { ascending: true })
    .order('naam', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPartijByNummer(nummer: string): Promise<Partij | null> {
  const { data, error } = await supabase
    .from('partijen')
    .select('*')
    .eq('nummer', nummer)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function createPartij(nummer: string, naam: string, type: 'klant' | 'leverancier'): Promise<number> {
  const { data, error } = await supabase
    .from('partijen')
    .insert({ nummer, naam, type })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Partij nummer bestaat al');
    }
    throw error;
  }
  return data.id;
}

export async function createMutatie(
  partijId: number,
  datum: string,
  geladen: number,
  gelost: number,
  geladenCactag6: number = 0,
  geladenBleche: number = 0,
  gelostCactag6: number = 0,
  gelostBleche: number = 0
): Promise<number> {
  const { data, error } = await supabase
    .from('fust_mutaties')
    .insert({
      partij_id: partijId,
      datum,
      geladen,
      gelost,
      geladen_cactag6: geladenCactag6,
      geladen_bleche: geladenBleche,
      gelost_cactag6: gelostCactag6,
      gelost_bleche: gelostBleche,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getMutaties(): Promise<Mutatie[]> {
  const { data: mutaties, error: mutatiesError } = await supabase
    .from('fust_mutaties')
    .select('*')
    .order('datum', { ascending: false })
    .order('created_at', { ascending: false });

  if (mutatiesError) throw mutatiesError;

  if (!mutaties || mutaties.length === 0) return [];

  // Haal alle unieke partij IDs op
  const partijIds = [...new Set(mutaties.map((m: any) => m.partij_id))];
  
  // Haal alle partijen op
  const { data: partijen, error: partijenError } = await supabase
    .from('partijen')
    .select('id, nummer, naam, type')
    .in('id', partijIds);

  if (partijenError) throw partijenError;

  // Maak een map voor snelle lookup
  const partijenMap = new Map(partijen?.map((p: any) => [p.id, p]) || []);

  // Combineer mutaties met partij informatie
  return mutaties.map((mutatie: any) => {
    const partij = partijenMap.get(mutatie.partij_id);
    return {
      ...mutatie,
      partij_nummer: partij?.nummer,
      partij_naam: partij?.naam,
      partij_type: partij?.type,
    };
  });
}

export async function getOverzicht(): Promise<Overzicht[]> {
  // Haal alle partijen op
  const { data: partijen, error: partijenError } = await supabase
    .from('partijen')
    .select('*')
    .order('type', { ascending: true })
    .order('naam', { ascending: true });

  if (partijenError) throw partijenError;

  // Haal alle mutaties op
  const { data: mutaties, error: mutatiesError } = await supabase
    .from('fust_mutaties')
    .select('partij_id, geladen, gelost');

  if (mutatiesError) throw mutatiesError;

  // Groepeer mutaties per partij
  const mutatiesPerPartij = new Map<number, { geladen: number; gelost: number }>();
  
  mutaties?.forEach((mutatie: any) => {
    const partijId = mutatie.partij_id;
    const current = mutatiesPerPartij.get(partijId) || { geladen: 0, gelost: 0 };
    mutatiesPerPartij.set(partijId, {
      geladen: current.geladen + (mutatie.geladen || 0),
      gelost: current.gelost + (mutatie.gelost || 0),
    });
  });

  // Combineer partijen met mutaties
  return (partijen || []).map((partij: any) => {
    const totals = mutatiesPerPartij.get(partij.id) || { geladen: 0, gelost: 0 };
    const balans = totals.geladen - totals.gelost;

    return {
      id: partij.id,
      nummer: partij.nummer,
      naam: partij.naam,
      type: partij.type,
      totaal_geladen: totals.geladen,
      totaal_gelost: totals.gelost,
      balans,
    };
  });
}

