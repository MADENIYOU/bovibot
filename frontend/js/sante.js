
let tousActes = [];   // cache brut API /api/sante

// ── Formatage ─────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '—';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

function formatFCFA(n) {
  if (!n || n == 0) return '<span style="color:#94a3b8">0 FCFA</span>';
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function typeBadge(type) {
  const map = {
    vaccination: { cls: 'badge-success', label: '💉 Vaccination' },
    traitement:  { cls: 'badge-warning', label: '💊 Traitement' },
    examen:      { cls: 'badge-info',    label: '🔬 Examen' },
    chirurgie:   { cls: 'badge-critical',label: '🔪 Chirurgie' },
  };
  const t = map[type] || { cls: 'badge-info', label: escapeHtml(type) };
  return `<span class="badge ${t.cls}">${t.label}</span>`;
}

function rdvLabel(date) {
  if (!date) return '—';
  const today  = new Date(); today.setHours(0,0,0,0);
  const rdvDate = new Date(date); rdvDate.setHours(0,0,0,0);
  const diff = Math.floor((rdvDate - today) / 86400000);

  if (diff < 0)
    return `<span style="color:var(--color-critical);font-weight:700">🔴 ${formatDate(date)} (en retard)</span>`;
  if (diff === 0)
    return `<span style="color:var(--color-warning);font-weight:700">🟡 Aujourd'hui</span>`;
  if (diff <= 7)
    return `<span style="color:var(--color-warning);font-weight:700">🟡 ${formatDate(date)} (dans ${diff}j)</span>`;
  return `<span style="color:var(--color-success)">🟢 ${formatDate(date)}</span>`;
}

// ── Chargement alertes santé ──────────────────────────────────
async function chargerAlertesSante() {
  const container = document.getElementById('alertes-sante-list');
  if (!container) return;

  try {
    const res = await fetch(`${API}/api/alertes`);
    if (!res.ok) throw new Error();
    const alertes = await res.json();

    // Filtrer seulement les alertes de type santé/vaccination
    const santeAlertes = alertes.filter(a =>
      ['vaccination', 'sante', 'poids'].includes(a.type)
    );

    if (!santeAlertes.length) {
      container.innerHTML = `
        <p style="color:var(--color-success);font-size:.85rem;padding:.5rem 0">
          ✅ Aucune alerte sanitaire active
        </p>`;
      return;
    }

    container.innerHTML = santeAlertes.map(a => `
      <div class="alerte-item alerte-${a.niveau}" id="alerte-sante-${a.id}">
        <div style="flex:1">
          <div style="font-size:.85rem">
            <strong>${a.numero_tag ? '[' + escapeHtml(a.numero_tag) + ']' : '🌐'}</strong>
            ${escapeHtml(a.message)}
          </div>
          <div style="font-size:.72rem;color:#94a3b8;margin-top:.12rem">
            ${formatDate(a.date_creation)} — Niveau :
            <span style="font-weight:700">${escapeHtml(a.niveau).toUpperCase()}</span>
          </div>
        </div>
        <button
          title="Marquer comme traitée"
          onclick="traiterAlerteSante(${a.id})"
          style="color:var(--color-success);font-size:1.1rem;flex-shrink:0"
        >✓</button>
      </div>
    `).join('');

  } catch (e) {
    container.innerHTML = '<p class="loading-text">Impossible de charger les alertes.</p>';
  }
}

async function traiterAlerteSante(alertId) {
  try {
    await fetch(`${API}/api/alertes/${alertId}/traiter`, { method: 'POST' });
    const el = document.getElementById(`alerte-sante-${alertId}`);
    if (el) {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }
  } catch (e) {
    alert('Erreur lors du traitement de l\'alerte.');
  }
}

// ── Chargement actes vétérinaires ────────────────────────────
async function chargerActes() {
  const tbody = document.getElementById('sante-body');
  const count = document.getElementById('count-actes');

  try {
    const res = await fetch(`${API}/api/sante`);
    if (!res.ok) throw new Error();
    tousActes = await res.json();
    afficherActes(tousActes);
  } catch (e) {
    if (tbody)
      tbody.innerHTML = '<tr><td colspan="8" class="loading-text">❌ Impossible de charger les actes.</td></tr>';
  }
}

// ── Afficher les actes dans le tableau ────────────────────────
function afficherActes(actes) {
  const tbody = document.getElementById('sante-body');
  const count = document.getElementById('count-actes');

  if (count) count.textContent = actes.length;

  if (!actes.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Aucun acte ne correspond au filtre.</td></tr>';
    return;
  }

  tbody.innerHTML = actes.map(a => `
    <tr>
      <td>
        <strong>${escapeHtml(a.numero_tag)}</strong>
        ${a.animal_nom ? '<br><span style="font-size:.78rem;color:#64748b">' + escapeHtml(a.animal_nom) + '</span>' : ''}
      </td>
      <td>${typeBadge(a.type)}</td>
      <td style="font-size:.82rem;max-width:200px;white-space:normal">
        ${escapeHtml(a.description)}
      </td>
      <td>${formatDate(a.date_acte)}</td>
      <td>${escapeHtml(a.veterinaire)}</td>
      <td>
        ${a.medicament
          ? `<span style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 6px;font-size:.78rem">${escapeHtml(a.medicament)}</span>`
          : '<span style="color:#94a3b8;font-size:.8rem">—</span>'}
      </td>
      <td style="text-align:right">${formatFCFA(a.cout)}</td>
      <td>${rdvLabel(a.prochain_rdv)}</td>
    </tr>
  `).join('');
}

// ── Filtrage par type d'acte ──────────────────────────────────
function filtrerActes() {
  const type = document.getElementById('filter-type')?.value || 'tous';
  if (type === 'tous') {
    afficherActes(tousActes);
  } else {
    afficherActes(tousActes.filter(a => a.type === type));
  }
}

// ── Initialisation ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  chargerAlertesSante();
  chargerActes();
  // Rafraîchissement toutes les 60s
  setInterval(() => {
    chargerAlertesSante();
    chargerActes();
  }, 60_000);
});
