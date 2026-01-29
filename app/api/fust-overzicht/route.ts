import { NextResponse } from 'next/server';
import { getFustOverzicht } from '@/lib/db-supabase';

export async function GET() {
  console.log('GET /api/fust-overzicht: Request received');
  try {
    console.log('GET /api/fust-overzicht: Calling getFustOverzicht()...');
    const overzicht = await getFustOverzicht();
    console.log('GET /api/fust-overzicht: Success, returning', overzicht.length, 'items');
    return NextResponse.json(overzicht);
  } catch (error: any) {
    console.error('GET /api/fust-overzicht: Error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return NextResponse.json({ error: error.message || 'Fout bij ophalen fust overzicht' }, { status: 500 });
  }
}
