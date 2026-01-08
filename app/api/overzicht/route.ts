import { NextResponse } from 'next/server';
import { getOverzicht } from '@/lib/db-supabase';

export async function GET() {
  console.log('GET /api/overzicht: Request received');
  try {
    console.log('GET /api/overzicht: Calling getOverzicht()...');
    const overzicht = await getOverzicht();
    console.log('GET /api/overzicht: Success, returning', overzicht.length, 'items');
    return NextResponse.json(overzicht);
  } catch (error: any) {
    console.error('GET /api/overzicht: Error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return NextResponse.json({ error: error.message || 'Fout bij ophalen overzicht' }, { status: 500 });
  }
}

