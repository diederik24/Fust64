const API_BASE = '';

// Laad partijen bij het laden van de pagina
document.addEventListener('DOMContentLoaded', () => {
    // Zet vandaag als standaard datum
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datum').value = today;
    
    loadPartijen();
    loadOverzicht();
    setupNavigation();
    setupFilters();
    setupForms();
});

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            
            // Update active states
            navButtons.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${targetPage}-page`).classList.add('active');
            
            // Laad data voor de pagina
            if (targetPage === 'overzicht') {
                loadOverzicht();
            } else if (targetPage === 'partijen') {
                loadPartijenLijst();
            }
        });
    });
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadOverzicht(btn.dataset.filter);
        });
    });
}

function setupForms() {
    // Mutatie form
    document.getElementById('mutatie-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const partijId = document.getElementById('partij-select').value;
        const datum = document.getElementById('datum').value;
        const geladen = parseInt(document.getElementById('geladen').value) || 0;
        const gelost = parseInt(document.getElementById('gelost').value) || 0;
        
        if (!partijId) {
            showMessage('Selecteer een partij', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/mutaties`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    partij_id: parseInt(partijId),
                    datum: datum,
                    geladen: geladen,
                    gelost: gelost
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Mutatie succesvol ingevoerd!', 'success');
                document.getElementById('mutatie-form').reset();
                document.getElementById('datum').value = new Date().toISOString().split('T')[0];
                document.getElementById('geladen').value = 0;
                document.getElementById('gelost').value = 0;
            } else {
                showMessage(data.error || 'Fout bij invoeren mutatie', 'error');
            }
        } catch (error) {
            showMessage('Fout bij communiceren met server', 'error');
            console.error(error);
        }
    });
    
    // Partij form
    document.getElementById('partij-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nummer = document.getElementById('partij-nummer').value;
        const naam = document.getElementById('partij-naam').value;
        const type = document.getElementById('partij-type').value;
        
        try {
            const response = await fetch(`${API_BASE}/api/partijen`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nummer: nummer,
                    naam: naam,
                    type: type
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Partij succesvol toegevoegd!', 'success');
                document.getElementById('partij-form').reset();
                loadPartijen();
                loadPartijenLijst();
            } else {
                showMessage(data.error || 'Fout bij toevoegen partij', 'error');
            }
        } catch (error) {
            showMessage('Fout bij communiceren met server', 'error');
            console.error(error);
        }
    });
}

async function loadPartijen() {
    try {
        const response = await fetch(`${API_BASE}/api/partijen`);
        const partijen = await response.json();
        
        const select = document.getElementById('partij-select');
        select.innerHTML = '<option value="">Selecteer partij...</option>';
        
        partijen.forEach(partij => {
            const option = document.createElement('option');
            option.value = partij.id;
            option.textContent = `${partij.nummer} - ${partij.naam || ''} (${partij.type})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Fout bij laden partijen:', error);
    }
}

async function loadPartijenLijst() {
    try {
        const response = await fetch(`${API_BASE}/api/partijen`);
        const partijen = await response.json();
        
        const lijst = document.getElementById('partijen-lijst');
        lijst.innerHTML = '';
        
        if (partijen.length === 0) {
            lijst.innerHTML = '<p>Geen partijen gevonden. Voeg er een toe!</p>';
            return;
        }
        
        partijen.forEach(partij => {
            const item = document.createElement('div');
            item.className = 'partij-item';
            item.innerHTML = `
                <div class="partij-info">
                    <strong>${partij.nummer}</strong> - ${partij.naam || 'Geen naam'}
                    <span class="kaart-type ${partij.type}">${partij.type}</span>
                </div>
            `;
            lijst.appendChild(item);
        });
    } catch (error) {
        console.error('Fout bij laden partijen lijst:', error);
    }
}

async function loadOverzicht(filter = 'all') {
    try {
        const response = await fetch(`${API_BASE}/api/overzicht`);
        const overzicht = await response.json();
        
        // Filter de resultaten
        let gefilterd = overzicht;
        if (filter !== 'all') {
            gefilterd = overzicht.filter(item => item.type === filter);
        }
        
        const content = document.getElementById('overzicht-content');
        content.innerHTML = '';
        
        if (gefilterd.length === 0) {
            content.innerHTML = '<p>Geen data beschikbaar.</p>';
            return;
        }
        
        // Groepeer per type
        const klanten = gefilterd.filter(item => item.type === 'klant');
        const leveranciers = gefilterd.filter(item => item.type === 'leverancier');
        
        if (klanten.length > 0 && (filter === 'all' || filter === 'klant')) {
            const klantenSection = document.createElement('div');
            klantenSection.innerHTML = '<h3 style="margin: 20px 0 10px 0; color: #28a745;">Klanten</h3>';
            const klantenGrid = document.createElement('div');
            klantenGrid.className = 'overzicht-grid';
            klanten.forEach(item => {
                klantenGrid.appendChild(createOverzichtKaart(item));
            });
            klantenSection.appendChild(klantenGrid);
            content.appendChild(klantenSection);
        }
        
        if (leveranciers.length > 0 && (filter === 'all' || filter === 'leverancier')) {
            const leveranciersSection = document.createElement('div');
            leveranciersSection.innerHTML = '<h3 style="margin: 20px 0 10px 0; color: #dc3545;">Leveranciers</h3>';
            const leveranciersGrid = document.createElement('div');
            leveranciersGrid.className = 'overzicht-grid';
            leveranciers.forEach(item => {
                leveranciersGrid.appendChild(createOverzichtKaart(item));
            });
            leveranciersSection.appendChild(leveranciersGrid);
            content.appendChild(leveranciersSection);
        }
    } catch (error) {
        console.error('Fout bij laden overzicht:', error);
        document.getElementById('overzicht-content').innerHTML = 
            '<p style="color: red;">Fout bij laden overzicht. Probeer het opnieuw.</p>';
    }
}

function createOverzichtKaart(item) {
    const kaart = document.createElement('div');
    kaart.className = `overzicht-kaart ${item.type}`;
    
    const balans = item.balans;
    let balansTekst = '';
    let balansClass = 'nul';
    
    if (item.type === 'klant') {
        // Voor klanten: positieve balans = wij moeten terugkrijgen
        // negatieve balans = wij moeten teruggeven
        if (balans > 0) {
            balansTekst = `Wij moeten ${balans} terugkrijgen`;
            balansClass = 'positief';
        } else if (balans < 0) {
            balansTekst = `Wij moeten ${Math.abs(balans)} teruggeven`;
            balansClass = 'negatief';
        } else {
            balansTekst = 'In balans';
            balansClass = 'nul';
        }
    } else {
        // Voor leveranciers: positieve balans = wij moeten teruggeven
        // negatieve balans = wij moeten terugkrijgen
        if (balans > 0) {
            balansTekst = `Wij moeten ${balans} teruggeven`;
            balansClass = 'negatief';
        } else if (balans < 0) {
            balansTekst = `Wij moeten ${Math.abs(balans)} terugkrijgen`;
            balansClass = 'positief';
        } else {
            balansTekst = 'In balans';
            balansClass = 'nul';
        }
    }
    
    kaart.innerHTML = `
        <div class="kaart-header">
            <div class="kaart-titel">${item.nummer}</div>
            <span class="kaart-type ${item.type}">${item.type}</span>
        </div>
        ${item.naam ? `<div class="kaart-info"><strong>Naam:</strong> ${item.naam}</div>` : ''}
        <div class="kaart-info"><strong>Totaal Geladen:</strong> ${item.totaal_geladen}</div>
        <div class="kaart-info"><strong>Totaal Gelost:</strong> ${item.totaal_gelost}</div>
        <div class="kaart-balans ${balansClass}">${balansTekst}</div>
    `;
    
    return kaart;
}

function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message ${type}`;
    
    setTimeout(() => {
        message.className = 'message';
    }, 3000);
}

