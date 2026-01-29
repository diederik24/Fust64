import { NextRequest, NextResponse } from 'next/server';
import { getMutatiesByPartijId } from '@/lib/db-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { partij_id: string } }
) {
  try {
    const partijId = parseInt(params.partij_id);
    
    if (isNaN(partijId)) {
      return NextResponse.json({ error: 'Ongeldig partij ID' }, { status: 400 });
    }

    const mutaties = await getMutatiesByPartijId(partijId);
    return NextResponse.json(mutaties);
  } catch (error: any) {
    console.error('Error in GET /api/mutaties/partij/[partij_id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Fout bij ophalen mutaties',
      details: error.details || error.hint || error.code
    }, { status: 500 });
  }
}
