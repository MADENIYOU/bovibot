
// ── Formatage ─────────────────────────────────────────────────
function formatFCFA(n) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

// ── Variables Globales ─────────────────────────────
let growthChart = null;
let statsPieChart = null;
let healthBarChart = null;
let lastQueryResult = null; // Stocke les données de la dernière requête IA
let allAlerts = []; // Stocke toutes les alertes pour la modale

function formatTimeAgo(d) {
  if (!d) return '—';
  const diff = Math.floor((new Date() - new Date(d)) / 60000);
  if (diff < 1) return "À l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  if (diff < 1440) return `Il y a ${Math.floor(diff/60)} h`;
  return formatDate(d);
}

// ── Chargement stats KPI ──────────────────────────────────────
async function chargerStats() {
  try {
    const res = await fetch(`/api/dashboard`);
    if (!res.ok) throw new Error('Erreur réseau');
    const d = await res.json();

    document.getElementById('s-actifs').textContent    = d.total_actifs    ?? '0';
    document.getElementById('s-gestation').textContent = d.en_gestation    ?? '0';
    document.getElementById('s-critical').textContent  = d.alertes_critiques ?? '0';
    document.getElementById('s-ca').textContent        = Number(d.ca_mois ?? 0).toLocaleString('fr-FR');

    const total = 50; 
    document.getElementById('p-actifs').style.width = Math.min((d.total_actifs / total) * 100, 100) + '%';
    document.getElementById('p-gestation').style.width = Math.min((d.en_gestation / 10) * 100, 100) + '%';
    document.getElementById('p-critical').style.width = Math.min((d.alertes_critiques / 5) * 100, 100) + '%';
    document.getElementById('p-ca').style.width = Math.min((d.ca_mois / 1000000) * 100, 100) + '%';

    const statusEl = document.getElementById('api-status-display');
    if (statusEl) statusEl.innerHTML = '<span class="status-dot-mini" style="background:#16a34a"></span> Système opérationnel';

    updatePieChart(d);
    
    // Charger les données réelles pour les graphiques
    chargerStatsCroissance();
    chargerStatsSante();
    chargerGestations();

  } catch (e) {
    console.error('Erreur stats dashboard:', e);
  }
}

// ── Suivi Gestation ──────────────────────────────────────────
async function chargerGestations() {
  const container = document.getElementById('gestation-cards-container');
  if (!container) return;
  try {
    const res = await fetch('/api/reproduction/en-cours');
    const data = await res.json();

    if (!data.length) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8">Aucune gestation en cours.</div>';
      return;
    }

    container.innerHTML = data.slice(0, 3).map(r => {
      const j = r.jours_restants;
      const statusColor = j < 15 ? 'text-red-600' : (j < 30 ? 'text-orange-600' : 'text-green-600');
      const statusLabel = j < 15 ? 'Imminent' : (j < 30 ? 'Préparation' : 'Normal');
      
      return `
        <div class="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-outline/50 hover:bg-white hover:shadow-md transition-all">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary font-black text-sm border border-primary/10">
              ${r.mere_tag.slice(-2)}
            </div>
            <div>
              <h4 class="font-bold text-primary-dark text-sm">Vache ${r.mere_tag}</h4>
              <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Race: ${r.mere_nom || 'Locale'}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black ${statusColor}">J-${j}</div>
            <p class="text-[9px] uppercase font-black ${statusColor} tracking-tighter">${statusLabel}</p>
          </div>
        </div>
      `;
    }).join('') + `
      <div class="flex items-center justify-between p-4 bg-slate-100/50 rounded-2xl border border-dashed border-outline cursor-pointer hover:bg-slate-100 transition-all" onclick="window.location.href='gestation.html'">
        <div class="flex items-center gap-4 text-slate-400">
          <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-outline">
            <span class="material-symbols-outlined">more_horiz</span>
          </div>
          <h4 class="font-bold text-xs uppercase tracking-widest">Voir toutes les gestations</h4>
        </div>
        <span class="material-symbols-outlined text-primary">chevron_right</span>
      </div>
    `;

  } catch (e) { console.error("Erreur gestations:", e); }
}

// ── Données Réelles pour les Graphiques ───────────────────────

async function chargerStatsCroissance(days = 30) {
  try {
    const res = await fetch(`/api/stats/poids-mensuel?days=${days}`);
    const data = await res.json();
    console.log(`Données croissance (${days} jours):`, data);
    
    if (growthChart) {
      growthChart.data.labels = data.map(d => d.jour);
      growthChart.data.datasets[0].data = data.map(d => d.poids);
      growthChart.update();
    }
  } catch(e) { console.error("Erreur stats croissance:", e); }
}

async function chargerStatsSante() {
  try {
    const res = await fetch('/api/stats/sante-repartition');
    const data = await res.json();
    
    const counts = { 'vaccination': 0, 'traitement': 0, 'examen': 0 };
    data.forEach(item => { if(counts.hasOwnProperty(item.type)) counts[item.type] = item.n; });

    healthBarChart.data.datasets[0].data = [counts.vaccination, counts.traitement, counts.examen];
    healthBarChart.update();
  } catch(e) { console.error("Erreur stats santé:", e); }
}

function updatePieChart(d) {
  if (statsPieChart) {
    statsPieChart.data.datasets[0].data = [d.total_actifs || 0, d.en_gestation || 0, d.alertes_critiques || 0];
    statsPieChart.update();
  }
}

// ── Chargement alertes récentes ───────────────────────────────
async function chargerAlertes() {
  const container = document.getElementById('alerts-cards-container');
  if (!container) return;
  try {
    const res = await fetch(`/api/alertes`);
    if (!res.ok) throw new Error();
    allAlerts = await res.json();

    if (!allAlerts.length) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8">Aucune alerte active</div>';
      return;
    }

    container.innerHTML = allAlerts.slice(0, 3).map(a => {
      const levelClass = a.niveau === 'critical' ? 'bg-red-100 text-red-600' : (a.niveau === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600');
      const icon = a.niveau === 'critical' ? 'priority_high' : (a.niveau === 'warning' ? 'warning' : 'info');
      
      return `
        <div class="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-outline">
          <div class="w-10 h-10 rounded-full ${levelClass} flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined" style="font-size:1.2rem;">${icon}</span>
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <h4 class="font-bold text-primary-dark text-sm">${escapeHtml(a.type.toUpperCase())} #${a.numero_tag || 'Global'}</h4>
              <span class="text-[10px] text-slate-400 font-bold uppercase">${formatTimeAgo(a.date_creation)}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">${escapeHtml(a.message)}</p>
            <div class="mt-4 flex gap-2">
              <button onclick="traiterAlerte(${a.id})" class="px-4 py-1.5 border border-outline text-slate-500 hover:text-primary hover:border-primary text-[10px] font-black rounded-lg uppercase tracking-widest transition-all">Marquer comme traité</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) { console.error("Erreur alertes:", e); }
}

async function traiterAlerte(alertId) {
  try {
    const res = await fetch(`/api/alertes/${alertId}/traiter`, { method: 'POST' });
    if (!res.ok) throw new Error();
    chargerAlertes();
    chargerStats();
  } catch (e) {
    alert('Erreur.');
  }
}

// ── Graphiques Chart.js ───────────────────────────────────────

function initCharts() {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  };

  // 1. Croissance
  growthChart = new Chart(document.getElementById('growthChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: '#7c4f1e',
        backgroundColor: 'rgba(124, 79, 30, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: '#7c4f1e'
      }]
    },
    options: {
      ...commonOptions,
      scales: { y: { beginAtZero: false, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
    }
  });

  // 2. Répartition
  statsPieChart = new Chart(document.getElementById('statsPieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Actifs', 'Gestation', 'Critiques'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#7c4f1e', '#3b82f6', '#dc2626'],
        borderWidth: 0
      }]
    },
    options: {
      ...commonOptions,
      cutout: '70%',
      plugins: { legend: { display: true, position: 'right', labels: { boxWidth: 8, font: { size: 9, weight: 'bold' } } } }
    }
  });

  // 3. Santé
  const ctxHealth = document.getElementById('healthBarChart').getContext('2d');
  const gradient = ctxHealth.createLinearGradient(0, 0, 0, 140);
  gradient.addColorStop(0, '#7c4f1e');
  gradient.addColorStop(1, '#d4a76a');

  healthBarChart = new Chart(ctxHealth, {
    type: 'bar',
    data: {
      labels: ['Vaccin', 'Trait.', 'Examen'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: gradient,
        borderRadius: 4
      }]
    },
    options: {
      ...commonOptions,
      scales: { y: { beginAtZero: true, display: false }, x: { grid: { display: false } } }
    }
  });
}

// ── Assistant IA ──────────────────────────────────────────────

async function askAI() {
  const input = document.getElementById('chat-input');
  const box = document.getElementById('chat-box');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  renderMsg(q, true);

  // Afficher l'indicateur de réflexion
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'ai-msg ai-msg-bot';
  thinkingDiv.id = 'thinking-bubble';
  thinkingDiv.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  box.appendChild(thinkingDiv);
  box.scrollTop = box.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, history: [] })
    });
    const d = await res.json();
    
    // Retirer l'indicateur et afficher la réponse
    const bubble = document.getElementById('thinking-bubble');
    if(bubble) bubble.remove();

    lastQueryResult = d.data;
    renderMsg(d.answer, false, d.data, d.sql);
  } catch (e) {
    const bubble = document.getElementById('thinking-bubble');
    if(bubble) bubble.remove();
    renderMsg("Désolé, une erreur technique est survenue.", false);
  }
}

function renderMsg(text, isUser, data = null, sql = null) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = `ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-bot'}`;
  
  let html = `<div class="bubble-text">${escapeHtml(text)}</div>`;
  
  if (sql) {
    html += `
      <div style="margin-top:8px; position:relative;">
        <div style="background:#0f172a; color:#10b981; font-family:monospace; font-size:0.7rem; padding:10px; border-radius:8px; border-left:3px solid #059669; overflow-x:auto;">
          <code style="white-space:pre-wrap;">${escapeHtml(sql)}</code>
        </div>
        <span style="position:absolute; top:-6px; right:8px; background:#059669; color:white; font-size:0.5rem; padding:1px 4px; border-radius:4px; font-weight:bold;">SQL</span>
      </div>`;
  }

  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    html += `
      <div style="margin-top:10px; background:white; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer" onclick="openAIModal()">
        <table class="ai-result-table" style="width:100%; border-collapse:collapse; font-size:0.65rem;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
              ${keys.slice(0, 3).map(k => `<th style="padding:6px 8px; text-align:left; color:#64748b;">${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.slice(0, 3).map(row => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                ${keys.slice(0, 3).map(k => `<td style="padding:6px 8px; color:#1e293b; font-weight:500">${row[k]}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${data.length > 3 ? `<div style="padding:6px; text-align:center; font-size:0.65rem; background:#fdf6ec; color:var(--color-primary); font-weight:800; text-transform:uppercase; letter-spacing:0.05em">+ ${data.length - 3} résultats • Voir tout</div>` : ''}
      </div>`;
  }

  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ── Modales ───────────────────────────────────────────────────
function openAIModal() {
  if (!lastQueryResult || lastQueryResult.length === 0) return;
  renderModalTable(lastQueryResult, "Résultats de la requête");
}

function openAlertsModal() {
  if (!allAlerts || allAlerts.length === 0) return;
  renderModalTable(allAlerts, "Toutes les alertes actives");
}

function renderModalTable(data, title) {
  const container = document.getElementById('modal-table-container');
  const keys = Object.keys(data[0]);
  const titleEl = document.querySelector('#ai-modal h3');
  if (titleEl) titleEl.textContent = title;
  
  container.innerHTML = `
    <table class="data-table" style="font-size:0.8rem">
      <thead>
        <tr>${keys.map(k => `<th style="background:#fdfaf6; color:var(--color-primary-dark); font-weight:800">${k}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('ai-modal').style.display = 'flex';
}

function closeAIModal() {
  document.getElementById('ai-modal').style.display = 'none';
}

// ── Sécurité & Init ───────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  chargerStats();
  chargerAlertes();
  
  const btn = document.getElementById('btn-send');
  if(btn) btn.onclick = askAI;
  const input = document.getElementById('chat-input');
  if(input) input.onkeypress = (e) => { if(e.key === 'Enter') askAI(); };
  
  // Fermer modale si clic à côté
  window.onclick = (e) => {
    if (e.target.id === 'ai-modal') closeAIModal();
  };

  setInterval(() => { chargerStats(); chargerAlertes(); }, 30000);
});
