import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  // Server-side
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
  // Server-side
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('Key:', supabaseAnonKey ? 'Present (first 20 chars: ' + supabaseAnonKey.substring(0, 20) + '...)' : 'Missing');
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

