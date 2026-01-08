// Script om alle mutaties uit de database te verwijderen
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lees .env.local bestand
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteAllMutaties() {
  try {
    // Eerst het aantal mutaties ophalen
    const { data: mutaties, error: fetchError } = await supabase
      .from('fust_mutaties')
      .select('id');

    if (fetchError) {
      console.error('Error fetching mutaties:', fetchError);
      throw fetchError;
    }

    const count = mutaties?.length || 0;
    console.log(`Gevonden ${count} mutaties om te verwijderen...`);

    if (count === 0) {
      console.log('Geen mutaties gevonden om te verwijderen.');
      return;
    }

    // Verwijder alle mutaties
    const { error: deleteError } = await supabase
      .from('fust_mutaties')
      .delete()
      .neq('id', 0); // Delete all

    if (deleteError) {
      console.error('Error deleting mutaties:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Alle ${count} mutaties zijn succesvol verwijderd!`);
  } catch (error) {
    console.error('Fout bij verwijderen mutaties:', error);
    process.exit(1);
  }
}

deleteAllMutaties();

