import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, createSession, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-mailadres en wachtwoord zijn verplicht' },
        { status: 400 }
      );
    }

    const isValid = await validateCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Ongeldige inloggegevens' },
        { status: 401 }
      );
    }

    const sessionId = await createSession(email);
    await setSessionCookie(sessionId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Fout bij inloggen' },
      { status: 500 }
    );
  }
}

