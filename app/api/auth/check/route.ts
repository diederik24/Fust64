import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSession();
    
    if (user) {
      return NextResponse.json({ authenticated: true, user });
    }
    
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

