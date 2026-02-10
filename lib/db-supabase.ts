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

export interface FustOverzicht {
  id: number;
  nummer: string;
  naam: string | null;
  type: 'klant' | 'leverancier';
  // CC-TAG6 balansen
  cactag6_geladen: number;
  cactag6_gelost: number;
  cactag6_balans: number;
  // Bleche balansen
  bleche_geladen: number;
  bleche_gelost: number;
  bleche_balans: number;
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
  console.log('createMutatie: Creating mutatie:', {
    partijId,
    datum,
    geladen,
    gelost,
    geladenCactag6,
    geladenBleche,
    gelostCactag6,
    gelostBleche
  });
  
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

  if (error) {
    console.error('createMutatie: Error inserting mutatie:', error);
    throw error;
  }
  
  console.log('createMutatie: Mutatie created successfully with ID:', data.id);
  return data.id;
}

export async function getMutaties(): Promise<Mutatie[]> {
  const { data: mutaties, error: mutatiesError } = await supabase
    .from('fust_mutaties')
    .select('*')
    .order('created_at', { ascending: false }) // Eerst op created_at (nieuwste eerst)
    .order('datum', { ascending: false }); // Dan op datum als tie-breaker

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

export async function getFustOverzicht(): Promise<FustOverzicht[]> {
  console.log('getFustOverzicht: Starting...');
  
  // Haal alle partijen op met paginering om ervoor te zorgen dat we alle records krijgen
  // Supabase heeft standaard een limiet, dus we moeten alle pagina's ophalen
  let allPartijen: any[] = [];
  let page = 0;
  const pageSize = 1000; // Supabase max per request
  let hasMore = true;
  
  while (hasMore) {
    const { data: partijenPage, error: partijenError, count } = await supabase
      .from('partijen')
      .select('*', { count: 'exact' })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (partijenError) {
      console.error('getFustOverzicht: Error fetching partijen (page ' + page + '):', partijenError);
      throw partijenError;
    }
    
    if (partijenPage && partijenPage.length > 0) {
      allPartijen = [...allPartijen, ...partijenPage];
      page++;
      // Als we minder dan pageSize records hebben gekregen, zijn we klaar
      hasMore = partijenPage.length === pageSize;
    } else {
      hasMore = false;
    }
    
    // Safety check: stop als we meer dan 10.000 records hebben (ongewoon veel)
    if (allPartijen.length > 10000) {
      console.warn('getFustOverzicht: Stopping pagination at 10,000 records');
      hasMore = false;
    }
  }
  
  console.log('getFustOverzicht: Alle partijen opgehaald via paginering:', {
    totaalRecords: allPartijen.length,
    aantalPaginas: page
  });
  
  // Sorteer handmatig in JavaScript
  const partijen = allPartijen.sort((a: any, b: any) => {
    // Eerst op type (klant komt eerst, dan leverancier)
    const typeOrder = { 'klant': 0, 'leverancier': 1 };
    const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 2;
    const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 2;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    // Dan op nummer
    return String(a.nummer || '').localeCompare(String(b.nummer || ''));
  });
  
  // partijenError wordt al gecheckt tijdens paginering, dus hier hoeven we niet meer te checken

  console.log('getFustOverzicht: Partijen opgehaald:', {
    totaal: partijen?.length || 0,
    klanten: partijen?.filter((p: any) => p.type === 'klant').length || 0,
    leveranciers: partijen?.filter((p: any) => p.type === 'leverancier').length || 0,
    asbPartij: partijen?.find((p: any) => p.nummer === 'ASB'),
    asbPartijType: partijen?.find((p: any) => p.nummer === 'ASB')?.type,
    sampleTypes: partijen?.slice(0, 10).map((p: any) => ({ nummer: p.nummer, type: p.type })),
    alleTypesInData: [...new Set(partijen?.map((p: any) => p.type) || [])],
    rawPartijenSample: partijen?.slice(0, 3)
  });

  // Haal alle mutaties op met CC-TAG6 en Bleche details (inclusief datum en created_at voor sortering)
  const { data: mutaties, error: mutatiesError } = await supabase
    .from('fust_mutaties')
    .select('partij_id, datum, created_at, geladen_cactag6, geladen_bleche, gelost_cactag6, gelost_bleche');

  if (mutatiesError) {
    console.error('getFustOverzicht: Error fetching mutaties:', mutatiesError);
    throw mutatiesError;
  }

  // Groepeer mutaties per partij (behoud alle mutaties voor sortering)
  const mutatiesPerPartij = new Map<number, any[]>();

  mutaties?.forEach((mutatie: any) => {
    const partijId = mutatie.partij_id;
    if (!mutatiesPerPartij.has(partijId)) {
      mutatiesPerPartij.set(partijId, []);
    }
    mutatiesPerPartij.get(partijId)!.push(mutatie);
  });

  // Combineer partijen met mutaties en bereken saldi
  const result = (partijen || []).map((partij: any) => {
    const partijMutaties = mutatiesPerPartij.get(partij.id) || [];
    
    // Sorteer mutaties op datum en created_at (oudste eerst) - zoals op detailpagina
    const gesorteerdeMutaties = [...partijMutaties].sort((a, b) => {
      const dateDiff = new Date(a.datum).getTime() - new Date(b.datum).getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdDiff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return createdDiff;
    });
    
    // Bereken cumulatief saldo (zoals op detailpagina)
    let saldoCactag6 = 0;
    let saldoBleche = 0;
    let totaalGeladenCactag6 = 0;
    let totaalGelostCactag6 = 0;
    let totaalGeladenBleche = 0;
    let totaalGelostBleche = 0;
    
    gesorteerdeMutaties.forEach((mutatie: any) => {
      const gelostCactag6 = mutatie.gelost_cactag6 || 0;
      const geladenCactag6 = mutatie.geladen_cactag6 || 0;
      const gelostBleche = mutatie.gelost_bleche || 0;
      const geladenBleche = mutatie.geladen_bleche || 0;
      
      // Cumulatieve berekening (zoals op detailpagina)
      saldoCactag6 = saldoCactag6 + gelostCactag6 - geladenCactag6;
      saldoBleche = saldoBleche + gelostBleche - geladenBleche;
      
      // Tel ook op voor totals
      totaalGeladenCactag6 += geladenCactag6;
      totaalGelostCactag6 += gelostCactag6;
      totaalGeladenBleche += geladenBleche;
      totaalGelostBleche += gelostBleche;
    });
    
    return {
      id: partij.id,
      nummer: partij.nummer,
      naam: partij.naam,
      type: partij.type,
      cactag6_geladen: totaalGeladenCactag6,
      cactag6_gelost: totaalGelostCactag6,
      cactag6_balans: saldoCactag6, // Laatste cumulatieve saldo
      bleche_geladen: totaalGeladenBleche,
      bleche_gelost: totaalGelostBleche,
      bleche_balans: saldoBleche, // Laatste cumulatieve saldo
    };
  });

  const leveranciers = result.filter((item: any) => item.type === 'leverancier');
  const asbItem = result.find((item: any) => item.nummer === 'ASB');
  
  console.log('getFustOverzicht: Result:', {
    totaal: result.length,
    klanten: result.filter((item: any) => item.type === 'klant').length,
    leveranciers: leveranciers.length,
    leveranciersData: leveranciers.slice(0, 5),
    asb: asbItem,
    asbType: asbItem?.type,
    asbTypeCheck: asbItem?.type === 'leverancier',
    alleTypes: [...new Set(result.map((item: any) => item.type))],
    sampleResult: result.slice(0, 3).map((item: any) => ({ nummer: item.nummer, type: item.type }))
  });

  return result;
}

export async function getMutatiesByPartijId(partijId: number): Promise<Mutatie[]> {
  console.log('getMutatiesByPartijId: Fetching mutaties for partij_id:', partijId);
  
  // Haal ALLE mutaties op voor deze partij_id - geen filters op type, bron, verwerkt-status of datum
  const { data: mutaties, error: mutatiesError } = await supabase
    .from('fust_mutaties')
    .select('*')
    .eq('partij_id', partijId)
    // Geen extra filters - haal ALLE mutaties op ongeacht hoe ze zijn ingevoerd
    .order('datum', { ascending: true }) // Oudste eerst voor cumulatieve saldo berekening
    .order('created_at', { ascending: true }); // Tie-breaker op created_at

  console.log('getMutatiesByPartijId: Mutaties query result:', {
    hasData: !!mutaties,
    count: mutaties?.length || 0,
    mutaties: mutaties,
    hasError: !!mutatiesError,
    error: mutatiesError
  });

  if (mutatiesError) {
    console.error('Error fetching mutaties by partij_id:', mutatiesError);
    throw mutatiesError;
  }

  if (!mutaties || mutaties.length === 0) {
    console.warn('getMutatiesByPartijId: No mutaties found for partij_id:', partijId);
    // Probeer nog steeds partij info op te halen
    const { data: partij, error: partijError } = await supabase
      .from('partijen')
      .select('id, nummer, naam, type')
      .eq('id', partijId)
      .single();
    
    if (!partijError && partij) {
      console.log('getMutatiesByPartijId: Partij found but no mutaties:', partij);
    }
    return [];
  }

  // Haal partij informatie op
  const { data: partij, error: partijError } = await supabase
    .from('partijen')
    .select('id, nummer, naam, type')
    .eq('id', partijId)
    .single();

  console.log('getMutatiesByPartijId: Partij query result:', {
    hasData: !!partij,
    partij: partij,
    hasError: !!partijError,
    error: partijError
  });

  if (partijError) {
    console.error('Error fetching partij:', partijError);
    throw partijError;
  }

  // Combineer mutaties met partij informatie
  const result = mutaties.map((mutatie: any) => ({
    ...mutatie,
    partij_nummer: partij?.nummer,
    partij_naam: partij?.naam,
    partij_type: partij?.type,
  }));
  
  console.log('getMutatiesByPartijId: Final result:', {
    count: result.length,
    firstMutatie: result[0]
  });
  
  return result;
}

// Helper functie om mutaties op te halen op basis van partij nummer (voor debugging)
export async function getMutatiesByPartijNummer(partijNummer: string): Promise<Mutatie[]> {
  console.log('getMutatiesByPartijNummer: Fetching mutaties for partij nummer:', partijNummer);
  
  // Eerst de partij opzoeken op nummer
  const partij = await getPartijByNummer(partijNummer);
  
  if (!partij) {
    console.warn('getMutatiesByPartijNummer: Partij not found for nummer:', partijNummer);
    return [];
  }
  
  console.log('getMutatiesByPartijNummer: Found partij:', partij);
  
  // Haal mutaties op voor deze partij
  return getMutatiesByPartijId(partij.id);
}
