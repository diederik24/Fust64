# Fust Beheer Systeem

Een modern fust beheer systeem gebouwd met Next.js, TypeScript, Tailwind CSS en shadcn/ui.

## Functionaliteiten

- **Dashboard**: Overzicht met statistieken en recente mutaties
- **Mutaties Invoeren**: Voeg fust mutaties toe met klant/leverancier nummer, datum, aantal geladen en gelost
- **Fust Overzicht**: Bekijk de balans per klant en leverancier met duidelijke indicatie
- **Partijen Beheer**: Beheer klanten en leveranciers
- **Onderscheid Klanten/Leveranciers**: Het systeem maakt onderscheid tussen klanten en leveranciers

## Technologie Stack

- **Next.js 14** - React framework met App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful component library
- **better-sqlite3** - SQLite database

## Installatie

1. Installeer de dependencies:
```bash
npm install
```

2. Start de development server:
```bash
npm run dev
```

3. Open je browser en ga naar: http://localhost:3000

## Gebruik

### Partijen Toevoegen
1. Ga naar "Partijen Beheer"
2. Voer partij nummer, naam en type (klant of leverancier) in
3. Klik op "Partij Toevoegen"

### Mutatie Invoeren
1. Ga naar "Mutatie Invoeren"
2. Selecteer een partij
3. Voer datum, aantal geladen en aantal gelost in
4. Klik op "Mutatie Invoeren"

### Fust Overzicht
1. Ga naar "Fust Overzicht"
2. Bekijk de balans per klant en leverancier
3. Filter op klanten of leveranciers indien gewenst

## Balans Interpretatie

- **Klanten**: 
  - Positieve balans = wij moeten fust terugkrijgen
  - Negatieve balans = wij moeten fust teruggeven
  
- **Leveranciers**:
  - Positieve balans = wij moeten fust teruggeven
  - Negatieve balans = wij moeten fust terugkrijgen

## Database

De database wordt automatisch aangemaakt bij de eerste run. Het bestand `fust_beheer.db` wordt in de root directory aangemaakt.
