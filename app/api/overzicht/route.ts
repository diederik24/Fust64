import { NextResponse } from 'next/server';
import { getOverzicht } from '@/lib/db-supabase';

export async function GET() {
  try {
    const overzicht = await getOverzicht();
    return NextResponse.json(overzicht);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Fout bij ophalen overzicht' }, { status: 500 });
  }
}

