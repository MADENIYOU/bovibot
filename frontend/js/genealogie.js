// ============================================================
//  BoviBot — genealogie.js (Version Ultra Verticale)
// ============================================================

const API_BASE = 'http://localhost:8002/api';

document.addEventListener('DOMContentLoaded', () => {
  loadAnimals();
  document.getElementById('animal-selector').addEventListener('change', (e) => {
    if (e.target.value) loadFullVerticalTree(e.target.value);
    else resetTree();
  });
});

async function loadAnimals() {
  try {
    const r = await fetch(`${API_BASE}/animaux`);
    const data = await r.json();
    const selector = document.getElementById('animal-selector');
    data.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.numero_tag} - ${a.nom || 'Sans nom'}`;
      selector.appendChild(opt);
    });
  } catch (err) { console.error("Erreur:", err); }
}

async function loadFullVerticalTree(animalId) {
  const display = document.getElementById('tree-display');
  display.innerHTML = '<div class="loader"></div>';
  
  try {
    const r = await fetch(`${API_BASE}/animaux/${animalId}/genealogie`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    renderVerticalTree(data);
  } catch (err) {
    display.innerHTML = `<p style="color:red; margin-top:5rem">Erreur : ${err.message}</p>`;
  }
}

function renderVerticalTree(data) {
  const display = document.getElementById('tree-display');
  display.innerHTML = '';

  const treeContainer = document.createElement('div');
  treeContainer.style.width = '100%';
  treeContainer.style.display = 'flex';
  treeContainer.style.flexDirection = 'column';
  treeContainer.style.alignItems = 'center';

  // --- NIVEAU 1 : GRANDS-PARENTS ---
  const lv1 = createLevel('Grands-Parents');
  const gp_ids = [
    data.animal.grand_mere_mat_id, data.animal.grand_pere_mat_id,
    data.animal.grand_mere_pat_id, data.animal.grand_pere_pat_id
  ];
  gp_ids.forEach((id, index) => {
    const gp = data.grand_parents.find(g => g.id === id);
    const label = index < 2 ? (index === 0 ? 'G.Mère Mat.' : 'G.Père Mat.') : (index === 2 ? 'G.Mère Pat.' : 'G.Père Pat.');
    lv1.appendChild(createNode(id, gp?.numero_tag, gp?.nom, label, gp?.sexe));
  });
  treeContainer.appendChild(lv1);
  treeContainer.appendChild(createVerticalConnector());

  // --- NIVEAU 2 : PARENTS ---
  const lv2 = createLevel('Parents');
  lv2.appendChild(createNode(data.animal.mere_id, data.animal.mere_tag, data.animal.mere_nom, 'Mère', 'F'));
  lv2.appendChild(createNode(data.animal.pere_id, data.animal.pere_tag, data.animal.pere_nom, 'Père', 'M'));
  treeContainer.appendChild(lv2);
  treeContainer.appendChild(createVerticalConnector());

  // --- NIVEAU 3 : SUJET ---
  const lv3 = createLevel('Sujet');
  const selfNode = createNode(data.animal.id, data.animal.numero_tag, data.animal.nom, 'Sélectionné', data.animal.sexe);
  selfNode.classList.add('active');
  lv3.appendChild(selfNode);
  treeContainer.appendChild(lv3);
  treeContainer.appendChild(createVerticalConnector());

  // --- NIVEAU 4 : DESCENDANTS ---
  const lv4 = createLevel('Descendants');
  if (data.offspring.length > 0) {
    data.offspring.forEach(child => {
      lv4.appendChild(createNode(child.id, child.numero_tag, child.nom, 'Enfant', child.sexe));
    });
  } else {
    const empty = document.createElement('div');
    empty.style.color = '#94a3b8';
    empty.style.fontSize = '0.8rem';
    empty.textContent = 'Aucun descendant';
    lv4.appendChild(empty);
  }
  treeContainer.appendChild(lv4);

  display.appendChild(treeContainer);
}

function createLevel(label) {
  const div = document.createElement('div');
  div.className = 'tree-level';
  const span = document.createElement('span');
  span.className = 'level-label';
  span.textContent = label;
  div.appendChild(span);
  return div;
}

function createNode(id, tag, nom, label, sexe) {
  const node = document.createElement('div');
  node.className = `node ${sexe === 'F' ? 'node-female' : (sexe === 'M' ? 'node-male' : '')}`;
  
  if (!id) {
    node.style.opacity = '0.2';
    node.style.borderStyle = 'dashed';
    node.innerHTML = `<div class="node-tag" style="font-size:0.8rem">${label} Inconnu</div>`;
    return node;
  }

  node.onclick = () => {
    document.getElementById('animal-selector').value = id;
    loadFullVerticalTree(id);
  };

  const icon = sexe === 'F' ? 'female' : 'male';
  node.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem">
      <div style="font-size:0.6rem; font-weight:800; color:var(--color-primary); opacity:0.6 uppercase">${label}</div>
      <span class="material-symbols-outlined" style="font-size:1rem; opacity:0.5">${icon}</span>
    </div>
    <div class="node-tag">${tag}</div>
    <div class="node-name">${nom || 'Sans nom'}</div>
  `;
  return node;
}

function createVerticalConnector() {
  const line = document.createElement('div');
  line.style.width = '2px';
  line.style.height = '2rem';
  line.style.background = 'linear-gradient(to bottom, #cbd5e1, #e2e8f0)';
  return line;
}

function resetTree() {
  document.getElementById('tree-display').innerHTML = `
    <div style="text-align: center; color: #94a3b8; margin-top: 10rem;">
      <span class="material-symbols-outlined" style="font-size: 5rem; opacity: 0.2; display: block; margin-bottom: 1rem;">family_history</span>
      <p style="font-weight: 700; font-size: 1.2rem;">Sélectionnez un sujet pour générer sa lignée complète</p>
    </div>
  `;
}
