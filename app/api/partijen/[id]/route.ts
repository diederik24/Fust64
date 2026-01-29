import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Ongeldig partij ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('partijen')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Partij niet gevonden' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/partijen/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Fout bij ophalen partij',
      details: error.details || error.hint || error.code
    }, { status: 500 });
  }
}
