import { NextRequest, NextResponse } from 'next/server';
import { createMutatie, getMutaties, getPartijByNummer, createPartij } from '@/lib/db-supabase';

export async function GET() {
  try {
    const mutaties = await getMutaties();
    return NextResponse.json(mutaties);
  } catch (error: any) {
    console.error('Error in GET /api/mutaties:', error);
    return NextResponse.json({ 
      error: error.message || 'Fout bij ophalen mutaties',
      details: error.details || error.hint || error.code
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partij_nummer, datum, geladen, gelost, partij_type } = body;
    
    if (!partij_nummer || !datum) {
      return NextResponse.json({ error: 'Partij nummer en datum zijn verplicht' }, { status: 400 });
    }
    
    // Zoek of maak partij
    let partij = await getPartijByNummer(partij_nummer);
    if (!partij) {
      // Maak nieuwe partij aan als deze niet bestaat
      const type = partij_type || 'klant';
      const partijId = await createPartij(partij_nummer, '', type);
      partij = await getPartijByNummer(partij_nummer);
      if (!partij) {
        return NextResponse.json({ error: 'Fout bij aanmaken partij' }, { status: 400 });
      }
    }
    
    const id = await createMutatie(
      partij.id,
      datum,
      parseInt(geladen) || 0,
      parseInt(gelost) || 0,
      parseInt(body.geladen_cactag6) || 0,
      parseInt(body.geladen_bleche) || 0,
      parseInt(body.gelost_cactag6) || 0,
      parseInt(body.gelost_bleche) || 0
    );
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Fout bij aanmaken mutatie' 
    }, { status: 400 });
  }
}

