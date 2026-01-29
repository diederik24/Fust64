# Fix Balance Calculation in Fust Overzicht

## Probleem
Het overzicht toont "-26" en "-49" voor klant 125, maar het zou "-2" en "4" moeten tonen (zoals bij "Totaal saldo" op de detailpagina). Het overzicht moet exact dezelfde berekening gebruiken als de detailpagina - geen nieuwe berekening, gewoon dezelfde waarde kopiëren.

## Oorzaak
De detailpagina sorteert mutaties eerst op datum en created_at (oudste eerst) en berekent dan cumulatief: `saldo = saldo + gelost - geladen`. Het overzicht gebruikt momenteel alleen een simpele som zonder sortering, wat kan leiden tot andere resultaten als de volgorde belangrijk is.

## Oplossing

### Stap 1: Sorteer Mutaties Per Partij
In `[lib/db-supabase.ts](lib/db-supabase.ts)` in de `getFustOverzicht` functie:
- Haal alle mutaties op met datum en created_at
- Sorteer mutaties per partij op datum (oudste eerst), dan op created_at (oudste eerst) - exact zoals op de detailpagina

### Stap 2: Gebruik Exact dezelfde Cumulatieve Berekening
Voor elke partij:
- Loop door alle mutaties in gesorteerde volgorde
- Bereken cumulatief: `saldoCactag6 = saldoCactag6 + gelostCactag6 - geladenCactag6`
- Gebruik het laatste cumulatieve saldo (zoals "Totaal saldo" op de detailpagina)

### Stap 3: Verwijder Oude Berekening
Verwijder de huidige som-berekening (`totals.cactag6_gelost - totals.cactag6_geladen`) en vervang deze door de cumulatieve berekening.

## Bestanden om te Wijzigen
- `[lib/db-supabase.ts](lib/db-supabase.ts)` - Pas `getFustOverzicht` functie aan (regel 320-398):
  - Voeg datum en created_at toe aan de select query
  - Sorteer mutaties per partij op datum en created_at
  - Gebruik cumulatieve berekening in plaats van simpele som

## Verwachte Resultaat
Na deze fix zou het overzicht exact dezelfde saldi moeten tonen als "Totaal saldo" op de detailpagina voor alle klanten en leveranciers.
