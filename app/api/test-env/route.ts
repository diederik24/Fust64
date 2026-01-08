import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'Missing',
    keyPreview: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'Missing',
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseKey?.length || 0,
  });
}

