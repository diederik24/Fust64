import { NextRequest, NextResponse } from 'next/server';
import {
  getPartijByNummer,
  getMutatiesByPartijNummer,
  getMutaties,
} from '@/lib/db-provider';

export async function GET(
  request: NextRequest,
  { params }: { params: { nummer: string } }
) {
  try {
    const nummer = params.nummer;

    console.log('DEBUG: Checking partij nummer:', nummer);

    const partij = await getPartijByNummer(nummer);

    if (!partij) {
      return NextResponse.json(
        {
          error: 'Partij niet gevonden',
          nummer: nummer,
        },
        { status: 404 }
      );
    }

    console.log('DEBUG: Found partij:', partij);

    const mutaties = await getMutatiesByPartijNummer(nummer);
    const allMutaties = await getMutaties();

    return NextResponse.json({
      partij: partij,
      mutatiesForPartij: mutaties || [],
      mutatiesCount: mutaties?.length || 0,
      allMutatiesSample: allMutaties?.slice(0, 10) || [],
      totalMutatiesInSystem: allMutaties?.length || 0,
      debugInfo: {
        partijId: partij.id,
        partijNummer: partij.nummer,
        queryUsed: `partij_id = ${partij.id}`,
      },
    });
  } catch (error: any) {
    console.error('DEBUG Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Fout bij debug check',
        details: error.details || error.hint || error.code,
      },
      { status: 500 }
    );
  }
}
