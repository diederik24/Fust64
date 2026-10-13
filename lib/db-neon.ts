import { query, queryOne } from './neon-db';
import type { Partij, Mutatie, Overzicht, FustOverzicht, PartijType } from './db-types';
import { isPartijType } from './db-types';

export type { Partij, Mutatie, Overzicht, FustOverzicht, PartijType };

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

function mapPartij(row: any): Partij {
  const type = String(row.type);
  if (!isPartijType(type)) {
    throw new Error(`Onbekend partijtype in database: ${type}`);
  }
  return {
    id: Number(row.id),
    nummer: String(row.nummer),
    naam: row.naam ?? null,
    type,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapMutatie(row: any): Mutatie {
  return {
    id: Number(row.id),
    partij_id: Number(row.partij_id),
    datum: toIsoDate(row.datum),
    geladen: Number(row.geladen ?? 0),
    gelost: Number(row.gelost ?? 0),
    geladen_cactag6: Number(row.geladen_cactag6 ?? 0),
    geladen_bleche: Number(row.geladen_bleche ?? 0),
    gelost_cactag6: Number(row.gelost_cactag6 ?? 0),
    gelost_bleche: Number(row.gelost_bleche ?? 0),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    partij_nummer: row.partij_nummer != null ? String(row.partij_nummer) : undefined,
    partij_naam: row.partij_naam ?? undefined,
    partij_type: row.partij_type ?? undefined,
  };
}

export async function getPartijen(): Promise<Partij[]> {
  const rows = await query(
    `SELECT * FROM partijen
     ORDER BY CASE WHEN type = 'klant' THEN 0 WHEN type = 'leverancier' THEN 1 ELSE 2 END,
              naam ASC NULLS LAST`
  );
  return rows.map(mapPartij);
}

export async function getPartijByNummer(nummer: string): Promise<Partij | null> {
  const row = await queryOne(
    `SELECT * FROM partijen WHERE UPPER(nummer) = UPPER($1) LIMIT 1`,
    [nummer.trim()]
  );
  return row ? mapPartij(row) : null;
}

export async function createPartij(
  nummer: string,
  naam: string,
  type: PartijType
): Promise<number> {
  if (!isPartijType(type)) {
    throw new Error(`Ongeldig partijtype: ${type}`);
  }
  try {
    const row = await queryOne(
      `INSERT INTO partijen (nummer, naam, type) VALUES ($1, $2, $3::partij_type) RETURNING id`,
      [nummer, naam, type]
    );
    if (!row) throw new Error('Fout bij aanmaken partij');
    return Number(row.id);
  } catch (err: any) {
    if (err?.code === '23505') throw new Error('Partij nummer bestaat al');
    throw err;
  }
}

export async function updatePartij(
  id: number,
  fields: { nummer?: string; naam?: string | null; type?: PartijType }
): Promise<Partij | null> {
  if (fields.type !== undefined && !isPartijType(fields.type)) {
    throw new Error(`Ongeldig partijtype: ${fields.type}`);
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (fields.nummer !== undefined) {
    sets.push(`nummer = $${i++}`);
    params.push(fields.nummer);
  }
  if (fields.naam !== undefined) {
    sets.push(`naam = $${i++}`);
    params.push(fields.naam);
  }
  if (fields.type !== undefined) {
    sets.push(`type = $${i++}::partij_type`);
    params.push(fields.type);
  }

  if (sets.length === 0) {
    return queryOne(`SELECT * FROM partijen WHERE id = $1`, [id]).then((row) =>
      row ? mapPartij(row) : null
    );
  }

  params.push(id);
  try {
    const row = await queryOne(
      `UPDATE partijen SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    return row ? mapPartij(row) : null;
  } catch (err: any) {
    if (err?.code === '23505') throw new Error('Partij nummer bestaat al');
    throw err;
  }
}

export async function createMutatie(
  partijId: number,
  datum: string,
  geladen: number,
  gelost: number,
  geladenCactag6: number = 0,
  geladenBleche: number = 0,
  gelostCactag6: number = 0,
  gelostBleche: number = 0
): Promise<number> {
  const row = await queryOne(
    `INSERT INTO fust_mutaties (
       partij_id, datum, geladen, gelost,
       geladen_cactag6, geladen_bleche, gelost_cactag6, gelost_bleche
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [partijId, datum, geladen, gelost, geladenCactag6, geladenBleche, gelostCactag6, gelostBleche]
  );
  return Number(row.id);
}

export async function getMutaties(): Promise<Mutatie[]> {
  const rows = await query(
    `SELECT m.*,
            p.nummer AS partij_nummer,
            p.naam AS partij_naam,
            p.type AS partij_type
     FROM fust_mutaties m
     LEFT JOIN partijen p ON p.id = m.partij_id
     ORDER BY m.created_at DESC, m.datum DESC`
  );
  return rows.map(mapMutatie);
}

export async function getOverzicht(): Promise<Overzicht[]> {
  const partijen = await getPartijen();
  const mutaties = await query(`SELECT partij_id, geladen, gelost FROM fust_mutaties`);

  const mutatiesPerPartij = new Map<number, { geladen: number; gelost: number }>();
  for (const mutatie of mutaties) {
    const partijId = Number(mutatie.partij_id);
    const current = mutatiesPerPartij.get(partijId) || { geladen: 0, gelost: 0 };
    mutatiesPerPartij.set(partijId, {
      geladen: current.geladen + Number(mutatie.geladen || 0),
      gelost: current.gelost + Number(mutatie.gelost || 0),
    });
  }

  return partijen.map((partij) => {
    const totals = mutatiesPerPartij.get(partij.id) || { geladen: 0, gelost: 0 };
    return {
      id: partij.id,
      nummer: partij.nummer,
      naam: partij.naam,
      type: partij.type,
      totaal_geladen: totals.geladen,
      totaal_gelost: totals.gelost,
      balans: totals.geladen - totals.gelost,
    };
  });
}

export async function deleteAllMutaties(): Promise<number> {
  const countRow = await queryOne(`SELECT COUNT(*)::int AS c FROM fust_mutaties`);
  const count = Number(countRow?.c || 0);
  if (count === 0) return 0;
  await query(`DELETE FROM fust_mutaties`);
  return count;
}

export async function deleteMutatie(id: number): Promise<boolean> {
  await query(`DELETE FROM fust_mutaties WHERE id = $1`, [id]);
  return true;
}

export async function getFustOverzicht(): Promise<FustOverzicht[]> {
  const partijen = await query(
    `SELECT * FROM partijen
     ORDER BY CASE WHEN type = 'klant' THEN 0 WHEN type = 'leverancier' THEN 1 ELSE 2 END,
              nummer ASC`
  );
  const mutaties = await query(
    `SELECT partij_id, datum, created_at, geladen_cactag6, geladen_bleche, gelost_cactag6, gelost_bleche
     FROM fust_mutaties`
  );

  const mutatiesPerPartij = new Map<number, any[]>();
  for (const mutatie of mutaties) {
    const partijId = Number(mutatie.partij_id);
    if (!mutatiesPerPartij.has(partijId)) mutatiesPerPartij.set(partijId, []);
    mutatiesPerPartij.get(partijId)!.push(mutatie);
  }

  return partijen.map((partij: any) => {
    const partijMutaties = mutatiesPerPartij.get(Number(partij.id)) || [];
    const gesorteerdeMutaties = [...partijMutaties].sort((a, b) => {
      const dateDiff = new Date(a.datum).getTime() - new Date(b.datum).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    let saldoCactag6 = 0;
    let saldoBleche = 0;
    let totaalGeladenCactag6 = 0;
    let totaalGelostCactag6 = 0;
    let totaalGeladenBleche = 0;
    let totaalGelostBleche = 0;

    for (const mutatie of gesorteerdeMutaties) {
      const gelostCactag6 = Number(mutatie.gelost_cactag6 || 0);
      const geladenCactag6 = Number(mutatie.geladen_cactag6 || 0);
      const gelostBleche = Number(mutatie.gelost_bleche || 0);
      const geladenBleche = Number(mutatie.geladen_bleche || 0);

      saldoCactag6 = saldoCactag6 + gelostCactag6 - geladenCactag6;
      saldoBleche = saldoBleche + gelostBleche - geladenBleche;
      totaalGeladenCactag6 += geladenCactag6;
      totaalGelostCactag6 += gelostCactag6;
      totaalGeladenBleche += geladenBleche;
      totaalGelostBleche += gelostBleche;
    }

    return {
      id: Number(partij.id),
      nummer: String(partij.nummer),
      naam: partij.naam ?? null,
      type: partij.type,
      cactag6_geladen: totaalGeladenCactag6,
      cactag6_gelost: totaalGelostCactag6,
      cactag6_balans: saldoCactag6,
      bleche_geladen: totaalGeladenBleche,
      bleche_gelost: totaalGelostBleche,
      bleche_balans: saldoBleche,
    };
  });
}

export async function getMutatiesByPartijId(partijId: number): Promise<Mutatie[]> {
  const partij = await queryOne(`SELECT id, nummer, naam, type FROM partijen WHERE id = $1`, [partijId]);
  const mutaties = await query(
    `SELECT * FROM fust_mutaties
     WHERE partij_id = $1
     ORDER BY datum ASC, created_at ASC`,
    [partijId]
  );

  if (!mutaties.length) return [];

  return mutaties.map((mutatie: any) =>
    mapMutatie({
      ...mutatie,
      partij_nummer: partij?.nummer,
      partij_naam: partij?.naam,
      partij_type: partij?.type,
    })
  );
}

export async function getMutatiesByPartijNummer(partijNummer: string): Promise<Mutatie[]> {
  const partij = await getPartijByNummer(partijNummer);
  if (!partij) return [];
  return getMutatiesByPartijId(partij.id);
}
