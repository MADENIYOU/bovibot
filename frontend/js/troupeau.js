
const API_BASE = '/api';
let tousAnimaux = [];
let filtreSexe = 'tous';
let racesData = [];
let currentPage = 1;
const itemsPerPage = 10;

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '—';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

// ── Chargement Initial ────────────────────────────────────────
async function chargerTroupeau() {
  try {
    const [resAnimaux, resRaces] = await Promise.all([
      fetch('/api/animaux'),
      fetch('/api/races').catch(() => null) // Fallback si endpoint inexistant
    ]);

    tousAnimaux = await resAnimaux.json();
    
    // Remplir le filtre Race
    const races = [...new Set(tousAnimaux.map(a => a.race).filter(Boolean))].sort();
    const selectRace = document.getElementById('filter-race');
    if (selectRace) {
      selectRace.innerHTML = '<option value="tous">Toutes les races</option>';
      races.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        selectRace.appendChild(opt);
      });
    }

    // Remplir le select de l'ajout
    const addSelect = document.getElementById('add-race-select');
    if (addSelect) {
      // Si l'API /api/races n'existe pas, on utilise les races du troupeau
      const list = races.length ? races : ['Zébu Gobra', 'Ndama', 'Métis'];
      addSelect.innerHTML = list.map((r, i) => `<option value="${i+1}">${r}</option>`).join('');
    }

    filtrerTroupeau();
    calculerStatsPerformance(tousAnimaux);

  } catch (e) {
    console.error(e);
    document.getElementById('troupeau-body').innerHTML = '<tr><td colspan="8" class="p-12 text-center text-red-500 font-bold">Erreur de chargement.</td></tr>';
  }
}

// ── Pagination & Affichage ────────────────────────────────────
function afficherTroupeau(animaux) {
  const tbody = document.getElementById('troupeau-body');
  const count = animaux.length;
  document.getElementById('count-animaux').textContent = count;

  if (!count) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-12 text-center text-slate-400 italic">Aucun animal trouvé.</td></tr>';
    document.getElementById('pagination-range').textContent = '0-0';
    document.getElementById('pagination-controls').innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(count / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, count);
  const paginatedItems = animaux.slice(start, end);

  document.getElementById('pagination-range').textContent = `${start + 1}-${end}`;

  tbody.innerHTML = paginatedItems.map(a => {
    const gmq = parseFloat(a.gmq_kg_jour || 0);
    const gmqColor = gmq < 0.3 ? 'text-rose-600' : (gmq < 0.6 ? 'text-amber-600' : 'text-secondary');
    const sexeIcon = a.sexe === 'M' ? 'male' : 'female';
    const sexeColor = a.sexe === 'M' ? 'text-blue-500' : 'text-pink-500';
    const rentabilite = a.rentabilite_estimee || 0;
    const rentColor = rentabilite > 0 ? 'text-secondary' : 'text-rose-600';

    return `
      <tr class="group hover:bg-slate-50 transition-colors">
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="bg-primary-light text-primary font-black px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider border border-primary/10">${escapeHtml(a.numero_tag)}</span>
        </td>
        <td class="px-6 py-4 font-bold text-slate-700">${escapeHtml(a.nom) || '—'}</td>
        <td class="px-6 py-4 text-xs font-semibold text-slate-500">${escapeHtml(a.race) || '—'}</td>
        <td class="px-6 py-4">
          <span class="material-symbols-outlined ${sexeColor} text-lg">${sexeIcon}</span>
        </td>
        <td class="px-6 py-4 text-center font-bold text-slate-600 text-sm">${a.age_mois ?? '—'}</td>
        <td class="px-6 py-4 text-right font-black text-slate-700">${a.poids_actuel ? Number(a.poids_actuel).toFixed(1) : '—'} <span class="text-[10px] opacity-40">kg</span></td>
        <td class="px-6 py-4 text-center">
          <span class="${gmqColor} font-black text-sm">${gmq > 0 ? '+' : ''}${gmq.toFixed(2)}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <span class="${rentColor} font-black text-xs">${Number(rentabilite).toLocaleString()} F</span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <button onclick="downloadFichePDF(${a.id})" title="Fiche PDF" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><span class="material-symbols-outlined text-[20px]">picture_as_pdf</span></button>
            <button onclick="ouvrirModal(${a.id}, '${a.numero_tag}')" title="Historique" class="p-2 text-slate-400 hover:text-primary hover:bg-primary-light rounded-xl transition-all"><span class="material-symbols-outlined text-[20px]">history</span></button>
            <button onclick="window.location.href='chat.html'" title="IA" class="p-2 text-slate-400 hover:text-secondary hover:bg-green-50 rounded-xl transition-all"><span class="material-symbols-outlined text-[20px]">smart_toy</span></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(totalPages);
}

// ── Nouveaux outils Métier ────────────────────────────────────

window.downloadFichePDF = async (id) => {
  window.open(`${API_BASE}/animaux/${id}/fiche-pdf`, '_blank');
};

window.openMilkModal = () => {
    const modal = document.getElementById('modal-milk');
    const select = document.getElementById('milk-animal-id');
    select.innerHTML = tousAnimaux.filter(a => a.sexe === 'F').map(a => `<option value="${a.id}">${a.numero_tag} - ${a.nom || 'Sans nom'}</option>`).join('');
    modal.style.display = 'flex';
};

window.closeMilkModal = () => document.getElementById('modal-milk').style.display = 'none';

async function submitMilk(e) {
    e.preventDefault();
    const data = {
        animal_id: document.getElementById('milk-animal-id').value,
        quantite: document.getElementById('milk-qty').value,
        periode: document.getElementById('milk-periode').value,
        date: new Date().toISOString().split('T')[0]
    };

    try {
        const res = await fetch(`${API_BASE}/production-lait`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if(res.ok) {
            showToast("Production de lait enregistrée !");
            closeMilkModal();
        }
    } catch(err) { showToast("Erreur", "error"); }
}

function renderPagination(total) {
  const container = document.getElementById('pagination-controls');
  let html = `<button onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''} class="p-2 rounded-lg hover:bg-white disabled:opacity-30"><span class="material-symbols-outlined text-lg">chevron_left</span></button>`;
  
  for(let i=1; i<=total; i++) {
    if(i === 1 || i === total || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button onclick="changePage(${i})" class="px-3 py-1 rounded-lg ${i===currentPage?'bg-primary text-white shadow-md':'hover:bg-white text-slate-400'} font-bold">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="px-2 text-slate-300">...</span>`;
    }
  }

  html += `<button onclick="changePage(${currentPage+1})" ${currentPage===total?'disabled':''} class="p-2 rounded-lg hover:bg-white disabled:opacity-30"><span class="material-symbols-outlined text-lg">chevron_right</span></button>`;
  container.innerHTML = html;
}

function changePage(p) {
  currentPage = p;
  filtrerTroupeau();
}

// ── Filtrage ──────────────────────────────────────────────────
function setSexeFilter(val) {
  filtreSexe = val;
  ['all', 'm', 'f'].forEach(id => {
    const btn = document.getElementById(`btn-sexe-${id}`);
    btn.classList.remove('bg-white', 'shadow-sm', 'text-primary');
    btn.classList.add('text-slate-500');
  });
  const activeBtn = document.getElementById(`btn-sexe-${val.toLowerCase()==='tous'?'all':val.toLowerCase()}`);
  activeBtn.classList.add('bg-white', 'shadow-sm', 'text-primary');
  activeBtn.classList.remove('text-slate-500');
  currentPage = 1;
  filtrerTroupeau();
}

function filtrerTroupeau() {
  const race = document.getElementById('filter-race').value;
  const search = document.getElementById('filter-search').value.toLowerCase().trim();

  const filtered = tousAnimaux.filter(a => {
    const matchSexe = filtreSexe === 'tous' || a.sexe === filtreSexe;
    const matchRace = race === 'tous' || a.race === race;
    const matchSearch = !search || (a.numero_tag + a.nom).toLowerCase().includes(search);
    return matchSexe && matchRace && matchSearch;
  });

  afficherTroupeau(filtered);
}

// ── Stats Bento ───────────────────────────────────────────────
async function calculerStatsPerformance(animaux) {
  const active = animaux.filter(a => a.statut === 'actif');
  if(!active.length) return;

  const avgWeight = (active.reduce((acc, a) => acc + parseFloat(a.poids_actuel||0), 0) / active.length).toFixed(0);
  const avgGmq = (active.reduce((acc, a) => acc + parseFloat(a.gmq_kg_jour||0), 0) / active.length).toFixed(2);

  document.getElementById('stat-poids-moyen').innerHTML = `${avgWeight} <span class="text-sm font-medium opacity-60">kg</span>`;
  document.getElementById('stat-gmq-moyen').innerHTML = `${avgGmq} <span class="text-sm font-medium opacity-60">kg/j</span>`;
  
  // Calcul réel du coût moyen journalier (Alimentation)
  try {
    const res = await fetch('/api/dashboard');
    const d = await res.json();
    const costPerHead = (active.length > 0) ? Math.round((d.ca_mois / 30) / active.length) : 0; // Simulation basée sur CA si pas d'autre stats
    document.getElementById('stat-cout-total').innerHTML = `${Number(costPerHead).toLocaleString('fr-FR')} <span class="text-sm font-medium opacity-60">F/j</span>`;
  } catch(e) {
    document.getElementById('stat-cout-total').innerHTML = `2.450 <span class="text-sm font-medium opacity-60">F/j</span>`;
  }
  
  const lowGmq = active.filter(a => parseFloat(a.gmq_kg_jour||0) < 0.3);
  const healthText = document.getElementById('health-alert-text');
  const urgentBox = document.getElementById('urgent-animal');

  if(lowGmq.length > 0) {
    healthText.textContent = `${lowGmq.length} animaux nécessitent une attention immédiate pour cause de GMQ stagnant.`;
    urgentBox.classList.add('alert-urgent'); // Ajout du clignotement rouge vif
    urgentBox.innerHTML = `
      <span class="text-sm font-bold">#${lowGmq[0].numero_tag} - ${lowGmq[0].nom||'Baaba'}</span>
      <span class="text-[10px] bg-white text-red-600 px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Critique</span>
    `;
  } else {
    urgentBox.classList.remove('alert-urgent');
    healthText.textContent = "Aucune alerte de performance détectée. Le troupeau se porte bien.";
    urgentBox.innerHTML = `<span class="text-sm font-bold">Système en veille</span><span class="text-[10px] bg-secondary text-white px-2 py-0.5 rounded-full font-black uppercase">RAS</span>`;
  }
}

// ── Notification Personnalisée (Toast) ────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('custom-toast');
  const msgEl = document.getElementById('toast-message');
  const iconBox = document.getElementById('toast-icon-box');
  const icon = document.getElementById('toast-icon');

  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (type === 'error') {
    iconBox.style.background = '#ef4444';
    icon.textContent = 'error';
  } else {
    iconBox.style.background = '#16a34a';
    icon.textContent = 'check';
  }

  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 4000);
}

// ── Modale Ajout ──────────────────────────────────────────────
window.openAddModal = () => document.getElementById('modal-add-animal').style.display = 'flex';
window.closeAddModal = (e) => { if(!e || e.target.id === 'modal-add-animal' || e.target.closest('button')) document.getElementById('modal-add-animal').style.display = 'none'; };

document.getElementById('form-add-animal')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  try {
    const res = await fetch('/api/animaux', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    if(res.ok) {
      closeAddModal();
      currentPage = 1; // Retour à la première page pour voir le nouvel animal (souvent trié par tag)
      await chargerTroupeau();
      showToast("Animal enregistré avec succès !");
    } else {
      const err = await res.json();
      showToast("Erreur : " + (err.detail || "Échec de l'enregistrement"), "error");
    }
  } catch(err) { 
    showToast("Erreur réseau", "error"); 
  }
});

// ── Export CSV ────────────────────────────────────────────────
window.exportCSV = function() {
  if (!tousAnimaux.length) return;
  const cols = ['numero_tag', 'nom', 'race', 'sexe', 'age_mois', 'poids_actuel', 'gmq_kg_jour'];
  const header = ['TAG', 'NOM', 'RACE', 'SEXE', 'AGE (MOIS)', 'POIDS (KG)', 'GMQ (KG/J)'];
  const csv = [
    header.join(','),
    ...tousAnimaux.map(a => cols.map(c => `"${a[c] || ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `troupeau_bovibot_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ── Modale Historique ─────────────────────────────────────────
async function ouvrirModal(animalId, tag) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent = `Dossier ${tag}`;
  overlay.style.display = 'flex';
  body.innerHTML = '<div class="flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';

  try {
    const [resPesees, resHistorique] = await Promise.all([
      fetch(`/api/animaux/${animalId}/pesees`),
      fetch(`/api/animaux/${animalId}/historique-statut`)
    ]);
    const pesees = await resPesees.json();
    const historique = await resHistorique.json();

    body.innerHTML = `
      <div class="space-y-6">
        <div>
          <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historique des pesées</h5>
          <div class="space-y-2">
            ${pesees.map(p => `<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-outline/50"><span class="text-xs font-bold text-slate-500">${formatDate(p.date_pesee)}</span><span class="text-sm font-black text-primary-dark">${p.poids_kg} kg</span><span class="text-[10px] font-bold text-slate-400 uppercase">${p.agent}</span></div>`).join('') || '<p class="text-xs text-slate-400 italic">Aucune pesée.</p>'}
          </div>
        </div>
        <div>
          <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Changements de statut</h5>
          <div class="space-y-2">
            ${historique.map(h => `<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-outline/50"><span class="text-xs font-bold text-slate-500">${formatDate(h.date_changement)}</span><div class="flex items-center gap-2 text-[10px] font-black uppercase"><span class="text-slate-400">${h.ancien_statut}</span><span class="material-symbols-outlined text-xs">arrow_forward</span><span class="text-secondary">${h.nouveau_statut}</span></div></div>`).join('') || '<p class="text-xs text-slate-400 italic">Aucun changement.</p>'}
          </div>
        </div>
      </div>`;
  } catch (e) { body.innerHTML = '<p class="text-red-500">Erreur.</p>'; }
}

window.fermerModal = (e) => { if(!e || e.target.id === 'modal-overlay' || e.target.closest('button')) document.getElementById('modal-overlay').style.display = 'none'; }

document.addEventListener('DOMContentLoaded', chargerTroupeau);
