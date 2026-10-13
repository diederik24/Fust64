'use server';

import { getOverzicht as getOverzichtDb, getMutaties as getMutatiesDb } from '@/lib/db-provider';

export async function getOverzicht() {
  return await getOverzichtDb();
}

export async function getMutaties() {
  return await getMutatiesDb();
}

