-- Import script voor kwekers uit CSV
-- Aangemaakt op: 2026-02-10T13:20:13.187Z
-- Totaal aantal kwekers: 0

-- Eerst bestaande kwekers verwijderen (optioneel - comment uit als je bestaande data wilt behouden)
-- DELETE FROM partijen WHERE type = 'leverancier';

-- Insert kwekers
INSERT INTO partijen (nummer, naam, type) VALUES


-- Update bestaande kwekers (als nummer al bestaat, update naam)
-- UPDATE partijen SET naam = excluded.naam FROM (VALUES

) AS excluded(nummer, naam)
-- WHERE partijen.nummer = excluded.nummer AND partijen.type = 'leverancier';
