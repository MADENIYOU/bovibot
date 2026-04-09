// ============================================================
//  BoviBot — genealogie.js (Engine de Visualisation Avancé)
// ============================================================

const API_BASE = '/api';
let simulationMode = false;
let selectedForSim = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadAnimalSelector();
    initTooltipMovement();
});

let allAnimalsData = [];

async function loadAnimalSelector() {
    const res = await fetch(`${API_BASE}/animaux`);
    allAnimalsData = await res.json();
    const selector = document.getElementById('animal-selector');
    const simMale = document.getElementById('sim-select-male');
    const simFemale = document.getElementById('sim-select-female');

    allAnimalsData.forEach(a => {
        const text = `${a.numero_tag} - ${a.nom || 'Sans nom'}`;
        
        // Sélecteur principal
        const opt = new Option(text, a.id);
        selector.add(opt);

        // Sélecteurs simulation
        if (a.sexe === 'M') simMale.add(new Option(a.numero_tag, a.id));
        if (a.sexe === 'F') simFemale.add(new Option(a.numero_tag, a.id));
    });
    selector.onchange = (e) => e.target.value && generateTree(e.target.value);
}

// ── Synchronisation Simulation ──────────────────────────────
window.syncSimFromDropdown = () => {
    const maleId = document.getElementById('sim-select-male').value;
    const femaleId = document.getElementById('sim-select-female').value;
    
    selectedForSim = [];
    if (maleId) selectedForSim.push(allAnimalsData.find(a => a.id == maleId));
    if (femaleId) selectedForSim.push(allAnimalsData.find(a => a.id == femaleId));

    // Update highlights in graph
    document.querySelectorAll('.node').forEach(n => n.classList.remove('ring-4', 'ring-primary'));
    selectedForSim.forEach(a => {
        const node = document.getElementById(`node-${a.id}`);
        if (node) node.classList.add('ring-4', 'ring-primary');
    });

    if (selectedForSim.length === 2) runSimulation();
};

function handleSimSelection(animal) {
    const isMale = animal.sexe === 'M';
    const select = document.getElementById(isMale ? 'sim-select-male' : 'sim-select-female');
    select.value = animal.id;
    syncSimFromDropdown();
}
async function generateTree(animalId) {
    const res = await fetch(`${API_BASE}/animaux/${animalId}/genealogie`);
    const data = await res.json();
    const content = document.getElementById('tree-content');
    content.innerHTML = '';

    const levels = [
        { label: 'G-Parents', items: data.grand_parents },
        { label: 'Parents', items: [
            data.animal.mere_id ? {id: data.animal.mere_id, numero_tag: data.animal.mere_tag, nom: data.animal.mere_nom, sexe: 'F', gmq: 0} : null,
            data.animal.pere_id ? {id: data.animal.pere_id, numero_tag: data.animal.pere_tag, nom: data.animal.pere_nom, sexe: 'M', gmq: 0} : null
        ].filter(x => x)},
        { label: 'Sujet', items: [data.animal] },
        { label: 'Enfants', items: data.offspring }
    ];

    levels.forEach((lvl, i) => {
        if(lvl.items.length > 0) {
            const div = document.createElement('div');
            div.className = 'tree-level';
            div.id = `level-${i}`;
            lvl.items.forEach(a => div.appendChild(renderNode(a, lvl.label === 'Sujet')));
            content.appendChild(div);
        }
    });

    // On attend le rendu pour tracer les lignes
    setTimeout(drawConnectors, 100);
}

function renderNode(animal, isSubject) {
    const node = document.createElement('div');
    node.className = `node ${animal.sexe === 'M' ? 'node-male' : 'node-female'} ${isSubject ? 'active' : ''}`;
    node.id = `node-${animal.id}`;
    
    const gmq = parseFloat(animal.gmq || 0);
    const color = gmq > 0.6 ? '#22c55e' : (gmq > 0.3 ? '#f59e0b' : '#ef4444');
    
    node.innerHTML = `
        <div class="perf-dot" style="background:${color}"></div>
        <div class="node-tag">${animal.numero_tag}</div>
        <div class="node-name">${animal.nom || '—'}</div>
    `;

    node.onmouseenter = (e) => showTooltip(e, animal);
    node.onmouseleave = hideTooltip;
    node.onclick = () => simulationMode ? handleSimSelection(animal) : generateTree(animal.id);

    return node;
}

// ── Dessin des Connecteurs SVG ────────────────────────────────
function drawConnectors() {
    const svg = document.getElementById('svg-connectors');
    const container = document.getElementById('tree-container').getBoundingClientRect();
    svg.innerHTML = '';
    svg.setAttribute('width', container.width);
    svg.setAttribute('height', container.height);

    const nodes = document.querySelectorAll('.node');
    const nodesMap = {};
    nodes.forEach(n => nodesMap[n.id.replace('node-','')] = n.getBoundingClientRect());

    // On dessine des lignes entre les niveaux successifs
    const levels = document.querySelectorAll('.tree-level');
    for (let i = 0; i < levels.length - 1; i++) {
        const currentNodes = levels[i].querySelectorAll('.node');
        const nextNodes = levels[i+1].querySelectorAll('.node');

        currentNodes.forEach(parent => {
            nextNodes.forEach(child => {
                // Ici on pourrait affiner pour ne relier que les vrais parents/enfants
                // Mais pour le visuel du graphe complet, on relie les flux
                drawCurve(svg, parent, child, container);
            });
        });
    }
}

function drawCurve(svg, el1, el2, container) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();

    const x1 = r1.left + r1.width/2 - container.left;
    const y1 = r1.bottom - container.top;
    const x2 = r2.left + r2.width/2 - container.left;
    const y2 = r2.top - container.top;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const cp = (y2 - y1) / 2;
    const d = `M ${x1} ${y1} C ${x1} ${y1+cp} ${x2} ${y2-cp} ${x2} ${y2}`;
    
    path.setAttribute("d", d);
    path.setAttribute("stroke", "#e2e8f0");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    svg.appendChild(path);
}

// ── Tooltip Logic ─────────────────────────────────────────────
function initTooltipMovement() {
    const tip = document.getElementById('tree-tooltip');
    window.addEventListener('mousemove', (e) => {
        if (tip.style.display === 'block') {
            tip.style.left = (e.clientX + 20) + 'px';
            tip.style.top = (e.clientY + 20) + 'px';
        }
    });
}

function showTooltip(e, a) {
    if (simulationMode) return;
    const tip = document.getElementById('tree-tooltip');
    tip.innerHTML = `
        <p style="font-weight:800; margin:0 0 0.5rem 0; color:var(--primary)">${a.numero_tag}</p>
        <div style="font-size:0.7rem; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
            <span style="opacity:0.5">Croissance:</span> <span style="font-weight:700">${parseFloat(a.gmq || 0).toFixed(2)} kg/j</span>
            <span style="opacity:0.5">Rentabilité:</span> <span style="font-weight:700">${parseInt(a.rentabilite || 0).toLocaleString()} F</span>
        </div>
    `;
    tip.style.display = 'block';
}

function hideTooltip() { document.getElementById('tree-tooltip').style.display = 'none'; }

// ── Simulateur Dock Logic ─────────────────────────────────────
window.toggleSimMode = () => {
    simulationMode = !simulationMode;
    const dock = document.getElementById('sim-dock');
    const btn = document.getElementById('btn-toggle-sim');
    
    if (simulationMode) {
        dock.classList.add('active');
        btn.style.background = '#0f172a';
        btn.textContent = "Arrêter Simulation";
        resetSimulation();
    } else {
        dock.classList.remove('active');
        btn.style.background = 'var(--primary)';
        btn.textContent = "Simulateur de Croisement";
    }
};

function handleSimSelection(animal) {
    if (selectedForSim.length >= 2) resetSimulation();
    selectedForSim.push(animal);
    
    const idx = selectedForSim.length;
    document.getElementById(`subject-${idx}`).textContent = animal.numero_tag;
    document.getElementById(`node-${animal.id}`).classList.add('ring-4', 'ring-primary');

    if (selectedForSim.length === 2) runSimulation();
}

function runSimulation() {
    const [a1, a2] = selectedForSim;
    const verdict = document.getElementById('verdict');
    
    if (a1.sexe === a2.sexe) {
        verdict.className = 'verdict-badge v-error';
        verdict.textContent = 'Même sexe : Incompatible';
        return;
    }

    // Détection consanguinité (Parents communs ou l'un est le parent de l'autre)
    const isParentChild = (a1.mere_id === a2.id || a1.pere_id === a2.id || a2.mere_id === a1.id || a2.pere_id === a1.id);
    const shareParents = (a1.mere_id && a1.mere_id === a2.mere_id) || (a1.pere_id && a1.pere_id === a2.pere_id);

    if (isParentChild) {
        verdict.className = 'verdict-badge v-error';
        verdict.textContent = 'Parenté Directe : Risque Maximum';
    } else if (shareParents) {
        verdict.className = 'verdict-badge v-warn';
        verdict.textContent = 'Frères/Sœurs : Risque Élevé';
    } else {
        verdict.className = 'verdict-badge v-success';
        verdict.textContent = 'Croisement Optimal';
    }
}

window.resetSimulation = () => {
    selectedForSim = [];
    document.querySelectorAll('.node').forEach(n => n.classList.remove('ring-4', 'ring-primary'));
    document.getElementById('subject-1').textContent = '...';
    document.getElementById('subject-2').textContent = '...';
    document.getElementById('verdict').className = 'verdict-badge';
    document.getElementById('verdict').textContent = 'En attente...';
};
