import { NextRequest, NextResponse } from 'next/server';
import { getPartijen, createPartij } from '@/lib/db-supabase';

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
    
    const id = await createPartij(nummer, naam || '', type);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Fout bij aanmaken partij' 
    }, { status: 400 });
  }
}

