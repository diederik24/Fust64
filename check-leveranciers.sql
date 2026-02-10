-- Check of er leveranciers zijn in de partijen tabel
SELECT 
    id,
    nummer,
    naam,
    type,
    created_at
FROM partijen
WHERE type = 'leverancier'
ORDER BY nummer;

-- Check hoeveel leveranciers er zijn
SELECT 
    COUNT(*) as totaal_leveranciers,
    COUNT(CASE WHEN naam IS NOT NULL THEN 1 END) as leveranciers_met_naam,
    COUNT(CASE WHEN naam IS NULL THEN 1 END) as leveranciers_zonder_naam
FROM partijen
WHERE type = 'leverancier';

-- Check welke leveranciers mutaties hebben
SELECT 
    p.id,
    p.nummer,
    p.naam,
    COUNT(m.id) as aantal_mutaties,
    SUM(m.geladen_cactag6 + m.geladen_bleche) as totaal_geladen,
    SUM(m.gelost_cactag6 + m.gelost_bleche) as totaal_gelost
FROM partijen p
LEFT JOIN fust_mutaties m ON p.id = m.partij_id
WHERE p.type = 'leverancier'
GROUP BY p.id, p.nummer, p.naam
ORDER BY aantal_mutaties DESC, p.nummer;

-- Check alle mutaties voor leveranciers
SELECT 
    m.id,
    m.datum,
    p.nummer as kweker_code,
    p.naam as kweker_naam,
    m.geladen_cactag6,
    m.geladen_bleche,
    m.gelost_cactag6,
    m.gelost_bleche,
    m.created_at
FROM fust_mutaties m
INNER JOIN partijen p ON m.partij_id = p.id
WHERE p.type = 'leverancier'
ORDER BY m.datum DESC, m.created_at DESC
LIMIT 50;

-- Check leveranciers zonder mutaties
SELECT 
    p.id,
    p.nummer,
    p.naam,
    p.created_at
FROM partijen p
LEFT JOIN fust_mutaties m ON p.id = m.partij_id
WHERE p.type = 'leverancier'
AND m.id IS NULL
ORDER BY p.nummer;

-- Check specifieke leverancier (bijvoorbeeld ASB)
SELECT 
    p.id,
    p.nummer,
    p.naam,
    p.type,
    COUNT(m.id) as aantal_mutaties
FROM partijen p
LEFT JOIN fust_mutaties m ON p.id = m.partij_id
WHERE p.nummer = 'ASB'
GROUP BY p.id, p.nummer, p.naam, p.type;
