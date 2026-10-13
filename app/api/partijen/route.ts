import { NextRequest, NextResponse } from 'next/server';
import { getPartijen, createPartij, updatePartij } from '@/lib/db-provider';
import { isPartijType } from '@/lib/db-types';

export async function GET() {
  try {
    const partijen = await getPartijen();
    return NextResponse.json(partijen);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Fout bij ophalen partijen' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nummer, naam, type } = body;

    if (!nummer || !type) {
      return NextResponse.json({ error: 'Nummer en type zijn verplicht' }, { status: 400 });
    }
    if (!isPartijType(type)) {
      return NextResponse.json({ error: `Ongeldig type: ${type}` }, { status: 400 });
    }

    const id = await createPartij(nummer, naam || '', type);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fout bij aanmaken partij',
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nummer, naam, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is verplicht' }, { status: 400 });
    }
    if (type !== undefined && !isPartijType(type)) {
      return NextResponse.json({ error: `Ongeldig type: ${type}` }, { status: 400 });
    }

    const updated = await updatePartij(Number(id), { nummer, naam, type });
    if (!updated) {
      return NextResponse.json({ error: 'Partij niet gevonden' }, { status: 404 });
    }
    return NextResponse.json({ success: true, partij: updated });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fout bij bijwerken partij',
      },
      { status: 400 }
    );
  }
}
