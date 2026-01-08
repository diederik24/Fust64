import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'fust-auth-session';
const SESSION_SECRET = 'fust-beheer-secret-key'; // In productie: gebruik een environment variable

export interface User {
  email: string;
}

const VALID_EMAIL = 'administratie@arnostraver.nl';
const VALID_PASSWORD = 'Middenweg23!';

export async function validateCredentials(email: string, password: string): Promise<boolean> {
  return email === VALID_EMAIL && password === VALID_PASSWORD;
}

export async function createSession(email: string): Promise<string> {
  // In productie: gebruik een JWT token of een veilige sessie ID
  const sessionId = Buffer.from(`${email}:${Date.now()}:${SESSION_SECRET}`).toString('base64');
  return sessionId;
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie) {
    return null;
  }

  try {
    // Decode de sessie (in productie: verifieer de sessie)
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const [email] = decoded.split(':');
    
    if (email === VALID_EMAIL) {
      return { email };
    }
  } catch (error) {
    return null;
  }

  return null;
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dagen
    path: '/',
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Client-side helper functions
export function getClientSession(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
  
  if (!sessionCookie) return null;
  
  return sessionCookie.split('=')[1];
}

