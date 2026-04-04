
let tousActes = [];
let filtreActuel = 'tous';
let currentPage = 1;
const itemsPerPage = 8;

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '—';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('custom-toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 4000);
}

// ── Chargement Initial ────────────────────────────────────────
async function chargerSante() {
  try {
    const [resActes, resAlertes, resStats] = await Promise.all([
      fetch('/api/sante'),
      fetch('/api/alertes'),
      fetch('/api/dashboard')
    ]);

    tousActes = await resActes.json();
    const alertes = await resAlertes.json();
    const stats = await resStats.json();

    afficherActes(tousActes);
    afficherAlertes(alertes);
    afficherStats(stats);

  } catch (e) {
    console.error(e);
    const body = document.getElementById('acts-body');
    if (body) body.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-red-500 font-bold">Erreur de chargement.</td></tr>';
  }
}

// ── Affichage du Registre avec Pagination ─────────────────────
function afficherActes(actes) {
  const tbody = document.getElementById('acts-body');
  const countEl = document.getElementById('count-acts');
  if (!tbody) return;

  const filtered = filtreActuel === 'tous' 
    ? actes 
    : actes.filter(a => a.type === filtreActuel);

  const total = filtered.length;
  if (countEl) countEl.textContent = total;

  if (!total) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-slate-400 italic">Aucun acte enregistré.</td></tr>';
    document.getElementById('pagination-range').textContent = '0-0';
    document.getElementById('pagination-controls').innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(total / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, total);
  const paginatedItems = filtered.slice(start, end);

  document.getElementById('pagination-range').textContent = `${start + 1}-${end}`;

  tbody.innerHTML = paginatedItems.map(a => {
    const isOverdue = a.prochain_rdv && new Date(a.prochain_rdv) < new Date();
    const badgeColor = a.type === 'Vaccination' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary';
    
    return `
      <tr class="bg-slate-50/50 transition-all hover:translate-x-1 group">
        <td class="px-4 py-5 rounded-l-2xl border-y border-l border-outline/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white border border-outline flex items-center justify-center text-primary-dark font-black text-xs shadow-sm">
              ${a.numero_tag.slice(-2)}
            </div>
            <span class="font-black text-primary-dark">${escapeHtml(a.numero_tag)}</span>
          </div>
        </td>
        <td class="px-4 py-5 border-y border-outline/50">
          <span class="${badgeColor} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">${escapeHtml(a.type)}</span>
        </td>
        <td class="px-4 py-5 border-y border-outline/50 font-bold text-slate-500">${formatDate(a.date_acte)}</td>
        <td class="px-4 py-5 border-y border-outline/50 font-medium text-slate-600">${escapeHtml(a.veterinaire)}</td>
        <td class="px-4 py-5 border-y border-outline/50">
          <span class="${isOverdue ? 'text-red-500 font-black' : 'text-slate-400 font-bold'}">${formatDate(a.prochain_rdv)}</span>
        </td>
        <td class="px-4 py-5 rounded-r-2xl border-y border-r border-outline/50 text-right">
          <button class="material-symbols-outlined text-slate-300 hover:text-primary transition-all">more_vert</button>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(totalPages);
}

function renderPagination(total) {
  const container = document.getElementById('pagination-controls');
  if (total <= 1) { container.innerHTML = ''; return; }
  
  let html = `<button onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''} class="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-all"><span class="material-symbols-outlined text-lg">chevron_left</span></button>`;
  
  for(let i=1; i<=total; i++) {
    if(i === 1 || i === total || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button onclick="changePage(${i})" class="px-3 py-1 rounded-lg ${i===currentPage?'bg-primary text-white shadow-md':'hover:bg-white text-slate-400'} font-bold transition-all">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="px-2 text-slate-300">...</span>`;
    }
  }

  html += `<button onclick="changePage(${currentPage+1})" ${currentPage===total?'disabled':''} class="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-all"><span class="material-symbols-outlined text-lg">chevron_right</span></button>`;
  container.innerHTML = html;
}

window.changePage = function(p) {
  currentPage = p;
  afficherActes(tousActes);
}

// ── Affichage des Alertes ─────────────────────────────────────
function afficherAlertes(alertes) {
  const container = document.getElementById('health-alerts-list');
  if (!container) return;

  const healthAlerts = alertes.filter(a => a.type === 'sante' || a.type === 'vaccination');

  if (!healthAlerts.length) {
    container.innerHTML = '<div class="p-8 text-center text-red-300 italic text-sm">Aucune alerte urgente.</div>';
    return;
  }

  container.innerHTML = healthAlerts.map(a => `
    <div class="bg-white rounded-2xl p-5 border border-red-100 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer">
      <div class="flex justify-between items-start mb-3">
        <span class="font-black text-primary-dark text-sm uppercase tracking-tighter">${escapeHtml(a.numero_tag)}</span>
        <span class="text-[10px] font-black ${a.niveau === 'critical' ? 'text-red-600' : 'text-amber-600'} uppercase tracking-widest">${a.type}</span>
      </div>
      <p class="text-xs text-slate-500 font-medium leading-relaxed mb-4">${escapeHtml(a.message)}</p>
      <button onclick="traiterAlerte(${a.id})" class="w-full bg-red-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200">
        MARQUER COMME TRAITÉ
      </button>
    </div>
  `).join('');
}

async function traiterAlerte(id) {
  try {
    const res = await fetch(`/api/alertes/${id}/traiter`, { method: 'POST' });
    if (res.ok) {
      showToast("Alerte traitée avec succès");
      chargerSante();
    }
  } catch (e) { showToast("Erreur lors du traitement", "error"); }
}

// ── Affichage des Stats ───────────────────────────────────────
function afficherStats(stats) {
  document.getElementById('stat-vaccins').textContent = stats.vaccines_annee || 0;
  document.getElementById('stat-soins').textContent = stats.rdv_a_venir || 0;
  // Calcul budget santé (Somme des coûts des 30 derniers jours)
  const budget = tousActes
    .filter(a => new Date(a.date_acte) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((acc, a) => acc + parseFloat(a.cout || 0), 0);
  document.getElementById('stat-depenses').textContent = Number(budget).toLocaleString('fr-FR') + ' F';
}

// ── Filtrage ──────────────────────────────────────────────────
window.filterActs = function(type) {
  filtreActuel = type;
  currentPage = 1; // On revient à la page 1 lors d'un filtrage
  // UI Update
  ['all', 'vaccin', 'trait'].forEach(id => {
    const btn = document.getElementById(`btn-filter-${id}`);
    if (btn) {
      btn.classList.remove('bg-white', 'shadow-sm', 'text-primary');
      btn.classList.add('text-slate-400');
    }
  });
  const map = { 'tous': 'all', 'Vaccination': 'vaccin', 'Traitement': 'trait' };
  const activeBtn = document.getElementById(`btn-filter-${map[type]}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-white', 'shadow-sm', 'text-primary');
    activeBtn.classList.remove('text-slate-400');
  }
  
  afficherActes(tousActes);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', chargerSante);
