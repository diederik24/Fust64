from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

DATABASE = 'fust_beheer.db'

def init_db():
    """Initialiseer de database met de benodigde tabellen"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Tabel voor klanten en leveranciers
    c.execute('''
        CREATE TABLE IF NOT EXISTS partijen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nummer TEXT UNIQUE NOT NULL,
            naam TEXT,
            type TEXT NOT NULL CHECK(type IN ('klant', 'leverancier')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabel voor fust mutaties
    c.execute('''
        CREATE TABLE IF NOT EXISTS fust_mutaties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partij_id INTEGER NOT NULL,
            datum DATE NOT NULL,
            geladen INTEGER DEFAULT 0,
            gelost INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (partij_id) REFERENCES partijen(id)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Maak een database connectie"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """Hoofdpagina"""
    return render_template('index.html')

@app.route('/api/partijen', methods=['GET'])
def get_partijen():
    """Haal alle partijen op (klanten en leveranciers)"""
    conn = get_db_connection()
    partijen = conn.execute('SELECT * FROM partijen ORDER BY type, naam').fetchall()
    conn.close()
    return jsonify([dict(row) for row in partijen])

@app.route('/api/partijen', methods=['POST'])
def create_partij():
    """Maak een nieuwe partij aan (klant of leverancier)"""
    data = request.json
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute('''
            INSERT INTO partijen (nummer, naam, type)
            VALUES (?, ?, ?)
        ''', (data['nummer'], data['naam'], data['type']))
        conn.commit()
        partij_id = c.lastrowid
        conn.close()
        return jsonify({'success': True, 'id': partij_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'error': 'Partij nummer bestaat al'}), 400

@app.route('/api/mutaties', methods=['POST'])
def create_mutatie():
    """Voeg een nieuwe fust mutatie toe"""
    data = request.json
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute('''
            INSERT INTO fust_mutaties (partij_id, datum, geladen, gelost)
            VALUES (?, ?, ?, ?)
        ''', (data['partij_id'], data['datum'], data['geladen'], data['gelost']))
        conn.commit()
        mutatie_id = c.lastrowid
        conn.close()
        return jsonify({'success': True, 'id': mutatie_id}), 201
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/mutaties', methods=['GET'])
def get_mutaties():
    """Haal alle mutaties op"""
    conn = get_db_connection()
    mutaties = conn.execute('''
        SELECT m.*, p.nummer as partij_nummer, p.naam as partij_naam, p.type as partij_type
        FROM fust_mutaties m
        JOIN partijen p ON m.partij_id = p.id
        ORDER BY m.datum DESC, m.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(row) for row in mutaties])

@app.route('/api/overzicht', methods=['GET'])
def get_overzicht():
    """Haal het fust overzicht op per partij"""
    conn = get_db_connection()
    
    # Bereken de balans per partij
    overzicht = conn.execute('''
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
    ''').fetchall()
    
    conn.close()
    return jsonify([dict(row) for row in overzicht])

if __name__ == '__main__':
    init_db()
    # Voorkom dat Flask automatisch .env bestanden laadt die encoding problemen kunnen veroorzaken
    os.environ.pop('FLASK_LOAD_DOTENV', None)
    app.run(debug=True, port=5000, load_dotenv=False)

