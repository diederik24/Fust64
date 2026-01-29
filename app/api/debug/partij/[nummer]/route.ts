import { NextRequest, NextResponse } from 'next/server';
import { getPartijByNummer, getMutatiesByPartijNummer } from '@/lib/db-supabase';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { nummer: string } }
) {
  try {
    const nummer = params.nummer;
    
    console.log('DEBUG: Checking partij nummer:', nummer);
    
    // Haal partij op
    const partij = await getPartijByNummer(nummer);
    
    if (!partij) {
      return NextResponse.json({ 
        error: 'Partij niet gevonden',
        nummer: nummer
      }, { status: 404 });
    }
    
    console.log('DEBUG: Found partij:', partij);
    
    // Haal alle mutaties op voor deze partij_id
    const { data: mutaties, error: mutatiesError } = await supabase
      .from('fust_mutaties')
      .select('*')
      .eq('partij_id', partij.id);
    
    console.log('DEBUG: Mutaties query result:', {
      hasData: !!mutaties,
      count: mutaties?.length || 0,
      mutaties: mutaties,
      hasError: !!mutatiesError,
      error: mutatiesError
    });
    
    // Haal ook alle mutaties op om te zien welke partij_ids er zijn
    const { data: allMutaties, error: allMutatiesError } = await supabase
      .from('fust_mutaties')
      .select('id, partij_id, datum, geladen_cactag6, geladen_bleche, gelost_cactag6, gelost_bleche');
    
    // Zoek mutaties die mogelijk bij deze partij horen (op basis van andere criteria)
    const possibleMatches = allMutaties?.filter((m: any) => {
      // Check of er mutaties zijn die mogelijk bij deze partij horen
      return true; // We willen alle mutaties zien voor debugging
    }) || [];
    
    return NextResponse.json({
      partij: partij,
      mutatiesForPartij: mutaties || [],
      mutatiesCount: mutaties?.length || 0,
      allMutatiesSample: allMutaties?.slice(0, 10) || [], // Eerste 10 voor debugging
      totalMutatiesInSystem: allMutaties?.length || 0,
      debugInfo: {
        partijId: partij.id,
        partijNummer: partij.nummer,
        queryUsed: `partij_id = ${partij.id}`
      }
    });
  } catch (error: any) {
    console.error('DEBUG Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Fout bij debug check',
      details: error.details || error.hint || error.code
    }, { status: 500 });
  }
}
