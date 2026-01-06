// This file is kept for backwards compatibility
// New code should use lib/db-supabase.ts for Supabase
// or lib/db.ts for SQLite (better-sqlite3)

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATABASE_PATH = path.join(process.cwd(), 'fust_beheer.db');

export interface Partij {
  id: number;
  nummer: string;
  naam: string | null;
  type: 'klant' | 'leverancier';
  created_at: string;
}

export interface Mutatie {
  id: number;
  partij_id: number;
  datum: string;
  geladen: number;
  gelost: number;
  created_at: string;
  partij_nummer?: string;
  partij_naam?: string;
  partij_type?: string;
}

export interface Overzicht {
  id: number;
  nummer: string;
  naam: string | null;
  type: 'klant' | 'leverancier';
  totaal_geladen: number;
  totaal_gelost: number;
  balans: number;
}

function getDb(): Database.Database {
  return new Database(DATABASE_PATH);
}

function initDb(): void {
  const db = getDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS partijen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nummer TEXT UNIQUE NOT NULL,
      naam TEXT,
      type TEXT NOT NULL CHECK(type IN ('klant', 'leverancier')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS fust_mutaties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partij_id INTEGER NOT NULL,
      datum DATE NOT NULL,
      geladen INTEGER DEFAULT 0,
      gelost INTEGER DEFAULT 0,
      geladen_cactag6 INTEGER DEFAULT 0,
      geladen_bleche INTEGER DEFAULT 0,
      gelost_cactag6 INTEGER DEFAULT 0,
      gelost_bleche INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partij_id) REFERENCES partijen(id)
    );
  `);
  
  db.close();
}

// Initialize database
if (!fs.existsSync(DATABASE_PATH)) {
  initDb();
} else {
  // Check if tables exist
  const db = getDb();
  try {
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='partijen'").get();
  } catch {
    initDb();
  }
  db.close();
}

export function getPartijen(): Partij[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM partijen ORDER BY type, naam').all() as Partij[];
  } finally {
    db.close();
  }
}

export function getPartijByNummer(nummer: string): Partij | null {
  const db = getDb();
  try {
    const partij = db.prepare('SELECT * FROM partijen WHERE nummer = ?').get(nummer) as Partij | undefined;
    return partij || null;
  } finally {
    db.close();
  }
}

export function createPartij(nummer: string, naam: string, type: 'klant' | 'leverancier'): number {
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO partijen (nummer, naam, type) VALUES (?, ?, ?)').run(nummer, naam, type);
    return result.lastInsertRowid as number;
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Partij nummer bestaat al');
    }
    throw error;
  } finally {
    db.close();
  }
}

export function createMutatie(
  partijId: number, 
  datum: string, 
  geladen: number, 
  gelost: number,
  geladenCactag6: number = 0,
  geladenBleche: number = 0,
  gelostCactag6: number = 0,
  gelostBleche: number = 0
): number {
  const db = getDb();
  try {
    // Check if columns exist, if not add them
    try {
      db.prepare('SELECT geladen_cactag6 FROM fust_mutaties LIMIT 1').get();
    } catch {
      // Columns don't exist, add them
      db.exec(`
        ALTER TABLE fust_mutaties ADD COLUMN geladen_cactag6 INTEGER DEFAULT 0;
        ALTER TABLE fust_mutaties ADD COLUMN geladen_bleche INTEGER DEFAULT 0;
        ALTER TABLE fust_mutaties ADD COLUMN gelost_cactag6 INTEGER DEFAULT 0;
        ALTER TABLE fust_mutaties ADD COLUMN gelost_bleche INTEGER DEFAULT 0;
      `);
    }
    
    const result = db.prepare(`
      INSERT INTO fust_mutaties 
      (partij_id, datum, geladen, gelost, geladen_cactag6, geladen_bleche, gelost_cactag6, gelost_bleche) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(partijId, datum, geladen, gelost, geladenCactag6, geladenBleche, gelostCactag6, gelostBleche);
    return result.lastInsertRowid as number;
  } finally {
    db.close();
  }
}

export function getMutaties(): Mutatie[] {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT m.*, p.nummer as partij_nummer, p.naam as partij_naam, p.type as partij_type
      FROM fust_mutaties m
      JOIN partijen p ON m.partij_id = p.id
      ORDER BY m.datum DESC, m.created_at DESC
    `).all() as Mutatie[];
  } finally {
    db.close();
  }
}

export function getOverzicht(): Overzicht[] {
  const db = getDb();
  try {
    return db.prepare(`
      SELECT 
        p.id,
        p.nummer,
        p.naam,
        p.type,
        COALESCE(SUM(m.geladen), 0) as totaal_geladen,
        COALESCE(SUM(m.gelost), 0) as totaal_gelost,
        (COALESCE(SUM(m.geladen), 0) - COALESCE(SUM(m.gelost), 0)) as balans
      FROM partijen p
      LEFT JOIN fust_mutaties m ON p.id = m.partij_id
      GROUP BY p.id, p.nummer, p.naam, p.type
      ORDER BY p.type, p.naam
    `).all() as Overzicht[];
  } finally {
    db.close();
  }
}
