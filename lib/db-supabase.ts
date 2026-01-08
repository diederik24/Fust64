import { supabase } from './supabase';

// Test connection on import
console.log('db-supabase: Supabase client imported');

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

  if (mutatiesError) {
    console.error('Error fetching mutaties:', mutatiesError);
    throw mutatiesError;
  }

  if (!mutaties || mutaties.length === 0) {
    console.log('No mutaties found');
    return [];
  }

  // Haal alle unieke partij IDs op
  const partijIds = [...new Set(mutaties.map((m: any) => m.partij_id))];
  
  if (partijIds.length === 0) {
    return mutaties.map((mutatie: any) => ({
      ...mutatie,
      partij_nummer: undefined,
      partij_naam: undefined,
      partij_type: undefined,
    }));
  }
  
  // Haal alle partijen op
  const { data: partijen, error: partijenError } = await supabase
    .from('partijen')
    .select('id, nummer, naam, type')
    .in('id', partijIds);

  if (partijenError) {
    console.error('Error fetching partijen:', partijenError);
    throw partijenError;
  }

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
  console.log('getOverzicht: Starting...');
  
  // Haal alle partijen op
  const { data: partijen, error: partijenError } = await supabase
    .from('partijen')
    .select('*')
    .order('type', { ascending: true })
    .order('naam', { ascending: true });

  console.log('getOverzicht: Partijen query result:', {
    hasData: !!partijen,
    count: partijen?.length || 0,
    partijen: partijen,
    hasError: !!partijenError,
    error: partijenError
  });

  if (partijenError) {
    console.error('getOverzicht: Error fetching partijen:', partijenError);
    throw partijenError;
  }

  // Haal alle mutaties op
  const { data: mutaties, error: mutatiesError } = await supabase
    .from('fust_mutaties')
    .select('partij_id, geladen, gelost');

  console.log('getOverzicht: Mutaties query result:', {
    hasData: !!mutaties,
    count: mutaties?.length || 0,
    mutaties: mutaties,
    hasError: !!mutatiesError,
    error: mutatiesError
  });

  if (mutatiesError) {
    console.error('getOverzicht: Error fetching mutaties:', mutatiesError);
    throw mutatiesError;
  }

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

  console.log('getOverzicht: Mutaties per partij:', Array.from(mutatiesPerPartij.entries()));

  // Combineer partijen met mutaties
  const result = (partijen || []).map((partij: any) => {
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

  console.log('getOverzicht: Final result:', {
    count: result.length,
    result: result
  });

  return result;
}

export async function deleteAllMutaties(): Promise<number> {
  // Eerst het aantal mutaties ophalen
  const { data: mutaties, error: fetchError } = await supabase
    .from('fust_mutaties')
    .select('id');

  if (fetchError) {
    console.error('Error fetching mutaties for deletion:', fetchError);
    throw fetchError;
  }

  const count = mutaties?.length || 0;

  if (count === 0) {
    return 0;
  }

  // Verwijder alle mutaties
  const { error: deleteError } = await supabase
    .from('fust_mutaties')
    .delete()
    .neq('id', 0); // Delete all (using a condition that's always true)

  if (deleteError) {
    console.error('Error deleting mutaties:', deleteError);
    throw deleteError;
  }

  return count;
}

export async function deleteMutatie(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('fust_mutaties')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting mutatie:', error);
    throw error;
  }

  return true;
}

