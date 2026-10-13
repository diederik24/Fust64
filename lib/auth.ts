import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { queryOne } from '@/lib/neon-db';

const SESSION_COOKIE_NAME = 'fust-auth-session';
const SESSION_SECRET =
  process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'fust-beheer-secret-key';

export interface User {
  email: string;
}

export async function validateCredentials(email: string, password: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return false;

  const user = await queryOne<{ email: string; password_hash: string }>(
    `SELECT email, password_hash FROM users WHERE lower(email) = $1 LIMIT 1`,
    [normalized]
  );

  if (!user?.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

export async function createSession(email: string): Promise<string> {
  const sessionId = Buffer.from(
    `${email.trim().toLowerCase()}:${Date.now()}:${SESSION_SECRET}`
  ).toString('base64');
  return sessionId;
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const [email] = decoded.split(':');
    if (!email) return null;

    const user = await queryOne<{ email: string }>(
      `SELECT email FROM users WHERE lower(email) = $1 LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (user?.email) {
      return { email: user.email };
    }
  } catch {
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

  const allCookies = document.cookie.split(';');
  const sessionCookie = allCookies.find((c) =>
    c.trim().startsWith(`${SESSION_COOKIE_NAME}=`)
  );

  if (!sessionCookie) return null;

  return sessionCookie.split('=')[1];
}
