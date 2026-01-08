import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'fust-auth-session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    
    const response = NextResponse.json({ success: true });
    // Zorg ervoor dat de cookie ook via de response wordt verwijderd
    response.cookies.delete(SESSION_COOKIE_NAME);
    
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Fout bij uitloggen' },
      { status: 500 }
    );
  }
}

