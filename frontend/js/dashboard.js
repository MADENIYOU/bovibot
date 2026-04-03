
// ── Formatage ─────────────────────────────────────────────────
function formatFCFA(n) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

function joursLabel(j) {
  const n = parseInt(j);
  if (n < 0)
    return `<span style="color:var(--color-critical);font-weight:700">En retard (${Math.abs(n)}j)</span>`;
  if (n === 0)
    return `<span style="color:var(--color-warning);font-weight:700">Aujourd'hui !</span>`;
  if (n <= 7)
    return `<span style="color:var(--color-warning);font-weight:700">Dans ${n} jour(s)</span>`;
  return `<span style="color:var(--color-success)">Dans ${n} jours</span>`;
}

// ── Chargement stats KPI ──────────────────────────────────────
async function chargerStats() {
  try {
    const res = await fetch(`${API}/api/dashboard`);
    if (!res.ok) throw new Error('Erreur réseau');
    const d = await res.json();

    document.getElementById('s-actifs').textContent    = d.total_actifs    ?? '—';
    document.getElementById('s-gestation').textContent = d.en_gestation    ?? '—';
    document.getElementById('s-alertes').textContent   = d.alertes_actives ?? '—';
    document.getElementById('s-critical').textContent  = d.alertes_critiques ?? '—';
    document.getElementById('s-ventes').textContent    = d.ventes_mois     ?? '—';
    document.getElementById('s-ca').textContent        = formatFCFA(d.ca_mois ?? 0);

  } catch (e) {
    console.error('Erreur stats dashboard:', e);
    ['s-actifs','s-gestation','s-alertes','s-critical','s-ventes','s-ca']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'Err.';
      });
  }
}

// ── Chargement alertes récentes ───────────────────────────────
async function chargerAlertes() {
  const container = document.getElementById('alertes-list');
  if (!container) return;
  try {
    const res = await fetch(`${API}/api/alertes`);
    if (!res.ok) throw new Error();
    const alertes = await res.json();

    if (!alertes.length) {
      container.innerHTML = `
        <p style="color:var(--color-success);font-size:.85rem;padding:.5rem 0">
          ✅ Aucune alerte active
        </p>`;
      return;
    }

    container.innerHTML = alertes.slice(0, 8).map(a => `
      <div class="alerte-item alerte-${a.niveau}" id="alerte-${a.id}">
        <div style="flex:1;min-width:0">
          <div style="font-size:.85rem">
            <strong>${a.numero_tag ? '[' + a.numero_tag + ']' : '🌐'}</strong>
            ${escapeHtml(a.message)}
          </div>
          <div style="font-size:.72rem;color:#94a3b8;margin-top:.15rem">
            ${formatDate(a.date_creation)}
          </div>
        </div>
        <button
          title="Marquer comme traitée"
          onclick="traiterAlerte(${a.id})"
          style="color:var(--color-success);font-size:1.1rem"
        >✓</button>
      </div>
    `).join('');

  } catch (e) {
    container.innerHTML = '<p class="loading-text">Impossible de charger les alertes.</p>';
  }
}

// ── Traiter une alerte (marquée traitée) ──────────────────────
async function traiterAlerte(alertId) {
  try {
    const res = await fetch(`${API}/api/alertes/${alertId}/traiter`, { method: 'POST' });
    if (!res.ok) throw new Error();
    const el = document.getElementById(`alerte-${alertId}`);
    if (el) {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(10px)';
      setTimeout(() => el.remove(), 300);
    }
    // Recalcule les compteurs
    chargerStats();
  } catch (e) {
    alert('Erreur lors du traitement de l\'alerte.');
  }
}

// ── Chargement gestations en cours ───────────────────────────
async function chargerGestations() {
  const container = document.getElementById('gestations-list');
  if (!container) return;
  try {
    const res = await fetch(`${API}/api/reproduction/en-cours`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (!data.length) {
      container.innerHTML = `
        <p style="font-size:.85rem;color:var(--color-text-soft);padding:.5rem 0">
          Aucune gestation en cours.
        </p>`;
      return;
    }

    container.innerHTML = data.map(g => `
      <div class="alerte-item alerte-info"
           style="flex-direction:column;align-items:flex-start;gap:.3rem">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <strong>${escapeHtml(g.mere_tag)}
            ${g.mere_nom ? '(' + escapeHtml(g.mere_nom) + ')' : ''}
          </strong>
          ${joursLabel(g.jours_restants)}
        </div>
        <div style="font-size:.78rem;color:#64748b">
          🐂 Père : ${escapeHtml(g.pere_tag)}
          &nbsp;|&nbsp;
          📅 Vêlage prévu : <strong>${formatDate(g.date_velage_prevue)}</strong>
          &nbsp;|&nbsp;
          Saillie : ${formatDate(g.date_saillie)}
        </div>
      </div>
    `).join('');

  } catch (e) {
    container.innerHTML = '<p class="loading-text">Impossible de charger les gestations.</p>';
  }
}

// ── Sécurité : échapper le HTML ───────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Initialisation ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  chargerStats();
  chargerAlertes();
  chargerGestations();
  // Rafraîchissement automatique toutes les 60 secondes
  setInterval(() => {
    chargerStats();
    chargerAlertes();
    chargerGestations();
  }, 60_000);
});
