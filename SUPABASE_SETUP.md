# Supabase Setup Instructies

## Stap 1: Supabase Project Aanmaken

1. Ga naar [https://supabase.com](https://supabase.com)
2. Maak een account aan of log in
3. Klik op "New Project"
4. Vul de project details in:
   - **Name**: fust-beheer (of een andere naam)
   - **Database Password**: Kies een sterk wachtwoord (bewaar dit!)
   - **Region**: Kies de dichtstbijzijnde regio
5. Klik op "Create new project"
6. Wacht tot het project is aangemaakt (kan een paar minuten duren)

## Stap 2: Database Schema Aanmaken

1. Ga naar je Supabase project dashboard
2. Klik op "SQL Editor" in het linker menu
3. Klik op "New query"
4. Kopieer en plak het volgende SQL script:

```sql
-- Tabel voor partijen (klanten en leveranciers)
CREATE TABLE IF NOT EXISTS partijen (
  id BIGSERIAL PRIMARY KEY,
  nummer TEXT UNIQUE NOT NULL,
  naam TEXT,
  type TEXT NOT NULL CHECK(type IN ('klant', 'leverancier')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor fust mutaties
CREATE TABLE IF NOT EXISTS fust_mutaties (
  id BIGSERIAL PRIMARY KEY,
  partij_id BIGINT NOT NULL REFERENCES partijen(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  geladen INTEGER DEFAULT 0,
  gelost INTEGER DEFAULT 0,
  geladen_cactag6 INTEGER DEFAULT 0,
  geladen_bleche INTEGER DEFAULT 0,
  gelost_cactag6 INTEGER DEFAULT 0,
  gelost_bleche INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor snellere queries
CREATE INDEX IF NOT EXISTS idx_fust_mutaties_partij_id ON fust_mutaties(partij_id);
CREATE INDEX IF NOT EXISTS idx_fust_mutaties_datum ON fust_mutaties(datum);
CREATE INDEX IF NOT EXISTS idx_partijen_nummer ON partijen(nummer);

-- Row Level Security (RLS) uitschakelen voor nu (of configureer naar wens)
ALTER TABLE partijen ENABLE ROW LEVEL SECURITY;
ALTER TABLE fust_mutaties ENABLE ROW LEVEL SECURITY;

-- Policy om alle data te kunnen lezen en schrijven (pas aan naar wens)
CREATE POLICY "Enable all access for partijen" ON partijen
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for fust_mutaties" ON fust_mutaties
  FOR ALL USING (true) WITH CHECK (true);
```

5. Klik op "Run" om het script uit te voeren

## Stap 3: API Keys Ophalen

1. Ga naar "Settings" (tandwiel icoon) in het linker menu
2. Klik op "API"
3. Kopieer de volgende waarden:
   - **Project URL** (onder "Project URL")
   - **anon public** key (onder "Project API keys")

## Stap 4: Environment Variables Instellen

1. Maak een `.env.local` bestand in de root van je project (naast package.json)
2. Voeg de volgende regels toe:

```
NEXT_PUBLIC_SUPABASE_URL=je_project_url_hier
NEXT_PUBLIC_SUPABASE_ANON_KEY=je_anon_key_hier
```

3. Vervang `je_project_url_hier` en `je_anon_key_hier` met de waarden uit stap 3

**Voorbeeld:**
```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Stap 5: Code Aanpassen

De code is al aangepast om Supabase te gebruiken. Je hoeft alleen nog:
1. De `.env.local` file aan te maken met je Supabase credentials
2. De applicatie opnieuw te starten

## Database Schema Overzicht

### Tabel: partijen
- `id` - Auto increment primary key
- `nummer` - Uniek partij nummer
- `naam` - Optionele naam
- `type` - 'klant' of 'leverancier'
- `created_at` - Aanmaak datum

### Tabel: fust_mutaties
- `id` - Auto increment primary key
- `partij_id` - Foreign key naar partijen
- `datum` - Datum van de mutatie
- `geladen` - Totaal aantal geladen
- `gelost` - Totaal aantal gelost
- `geladen_cactag6` - Aantal geladen CC-TAG6
- `geladen_bleche` - Aantal geladen Bleche
- `gelost_cactag6` - Aantal gelost CC-TAG6
- `gelost_bleche` - Aantal gelost Bleche
- `created_at` - Aanmaak datum

## Tips

- Gebruik de Supabase dashboard om je data te bekijken
- Je kunt direct SQL queries uitvoeren in de SQL Editor
- Row Level Security (RLS) is ingeschakeld maar heeft een policy die alles toestaat
- Pas de RLS policies aan als je meer beveiliging wilt

