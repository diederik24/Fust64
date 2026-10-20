'use server';

import {
  getOverzicht as getOverzichtDb,
  getMutaties as getMutatiesDb,
  getDashboardStats as getDashboardStatsDb,
  getRecenteMutaties as getRecenteMutatiesDb,
} from '@/lib/db-provider';

export async function getOverzicht() {
  return await getOverzichtDb();
}

export async function getMutaties() {
  return await getMutatiesDb();
}

export async function getDashboardStats() {
  return await getDashboardStatsDb();
}

export async function getRecenteMutaties(limit = 5) {
  return await getRecenteMutatiesDb(limit);
}
