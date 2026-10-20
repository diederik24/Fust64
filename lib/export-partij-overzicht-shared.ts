export interface PartijExportMutatie {
  datum: string;
  geladen_cactag6?: number;
  geladen_bleche?: number;
  gelost_cactag6?: number;
  gelost_bleche?: number;
}

export interface PartijExportInfo {
  nummer?: string;
  naam?: string | null;
  type?: string;
}

function mutatieYear(datum: string): number | null {
  const d = new Date(datum);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export function getAvailableYears(mutaties: PartijExportMutatie[]): number[] {
  const years = new Set<number>();
  for (const m of mutaties) {
    const y = mutatieYear(m.datum);
    if (y !== null) years.add(y);
  }
  return Array.from(years).sort((a, b) => a - b);
}

export function filterMutatiesByYears(
  mutaties: PartijExportMutatie[],
  years: number[]
): PartijExportMutatie[] {
  const yearSet = new Set(years);
  return mutaties.filter((m) => {
    const y = mutatieYear(m.datum);
    return y !== null && yearSet.has(y);
  });
}

export function buildPartijExportFilename(
  partij: PartijExportInfo,
  years: number[],
  ext: 'pdf' | 'xlsx'
): string {
  const nummer = partij.nummer || 'onbekend';
  const yearsPart = years.length > 0 ? years.join('-') : 'geen-jaren';
  const dateStamp = new Date().toISOString().split('T')[0];
  return `overzicht-${nummer}-${yearsPart}-${dateStamp}.${ext}`;
}

export function partijLabel(partij: PartijExportInfo): string {
  const typeLabel = (partij.type || 'klant').toUpperCase();
  const naam = partij.naam ? ` - ${partij.naam}` : '';
  return `${typeLabel}: ${partij.nummer || ''}${naam}`;
}

export function yearsLabel(years: number[]): string {
  if (years.length === 0) return 'geen jaren';
  return years.join(', ');
}

export function toNlDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
