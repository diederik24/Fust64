import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  // Fallback to default if env var not set
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fdvjbibaphpyiobqbuvf.supabase.co';
}

function getSupabaseAnonKey() {
  // Fallback to default if env var not set
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkdmpiaWJhcGhweWlvYnFidXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Nzk5OTYsImV4cCI6MjA4MzI1NTk5Nn0.EM-6CI9r-IIRU06ihxPbDAYzLjP7_-vyiuhOOl5htk4';
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

