import { NextRequest, NextResponse } from 'next/server';
import { createMutatie, getMutaties, getPartijByNummer, createPartij, deleteAllMutaties } from '@/lib/db-provider';

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

    const nummer = String(partij_nummer).trim().toUpperCase();
    const type = (partij_type || 'klant') as 'klant' | 'leverancier';

    if (type === 'klant' && !/^\d+$/.test(nummer)) {
      return NextResponse.json(
        { error: 'Klantnummer mag alleen cijfers bevatten' },
        { status: 400 }
      );
    }

    let partij = await getPartijByNummer(nummer);

    if (type === 'leverancier') {
      // Kweker moet al bestaan en type leverancier hebben
      if (!partij) {
        return NextResponse.json(
          { error: `Onbekende kweker: ${nummer}` },
          { status: 400 }
        );
      }
      if (partij.type !== 'leverancier') {
        return NextResponse.json(
          { error: `Nummer ${nummer} bestaat als klant, niet als kweker` },
          { status: 400 }
        );
      }
    } else if (!partij) {
      // Klant mag nieuw worden aangemaakt
      await createPartij(nummer, '', 'klant');
      partij = await getPartijByNummer(nummer);
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

export async function DELETE() {
  try {
    const deletedCount = await deleteAllMutaties();
    return NextResponse.json({ 
      success: true, 
      message: `Alle mutaties zijn verwijderd`,
      deletedCount 
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/mutaties:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Fout bij verwijderen mutaties' 
    }, { status: 500 });
  }
}

