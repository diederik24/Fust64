-- Migratie: partijen.type → Postgres enum partij_type
-- Uitgevoerd op Neon project Fust 64 (holy-dawn-87503263)
--
-- Later een type toevoegen (zonder dataverlies):
--   ALTER TYPE partij_type ADD VALUE 'nieuw_type';
--   + voeg dezelfde waarde toe in lib/db-types.ts (PARTIJ_TYPES)

ALTER TABLE partijen DROP CONSTRAINT IF EXISTS partijen_type_check;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partij_type') THEN
    CREATE TYPE partij_type AS ENUM ('klant', 'leverancier');
  END IF;
END $$;

ALTER TABLE partijen
  ALTER COLUMN type TYPE partij_type
  USING type::partij_type;
