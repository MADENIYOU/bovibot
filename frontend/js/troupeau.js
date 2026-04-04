let tousAnimaux = [];   // cache brut de l'API

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

function sexeLabel(s) {
  return s === 'M'
    ? '<span style="color:#2563eb">♂ Mâle</span>'
    : '<span style="color:#db2777">♀ Femelle</span>';
}

function gmqBadge(gmq) {
  const v = parseFloat(gmq);
  if (isNaN(v) || v === 0) return '<span class="badge badge-info">—</span>';
  if (v < 0.3)  return `<span class="badge badge-critical">⚠ ${v.toFixed(3)}</span>`;
  if (v < 0.5)  return `<span class="badge badge-warning">${v.toFixed(3)}</span>`;
  return `<span class="badge badge-success">▲ ${v.toFixed(3)}</span>`;
}

// ── Chargement initial ────────────────────────────────────────
async function chargerTroupeau() {
  const tbody = document.getElementById('troupeau-body');
  try {
    const res = await fetch(`${API}/api/animaux`);
    if (!res.ok) throw new Error();
    tousAnimaux = await res.json();

    // Remplir le filtre Race dynamiquement
    const races = [...new Set(tousAnimaux.map(a => a.race).filter(Boolean))].sort();
    const selectRace = document.getElementById('filter-race');
    if (selectRace) {
      races.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        selectRace.appendChild(opt);
      });
    }

    afficherTroupeau(tousAnimaux);

  } catch (e) {
    if (tbody)
      tbody.innerHTML = '<tr><td colspan="8" class="loading-text">❌ Impossible de charger le troupeau.</td></tr>';
  }
}

// ── Afficher les animaux dans le tableau ──────────────────────
function afficherTroupeau(animaux) {
  const tbody = document.getElementById('troupeau-body');
  const count = document.getElementById('count-animaux');

  if (count) count.textContent = animaux.length;

  if (!animaux.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Aucun animal ne correspond aux filtres.</td></tr>';
    return;
  }

  tbody.innerHTML = animaux.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.numero_tag)}</strong></td>
      <td>${escapeHtml(a.nom) || '<em style="color:#94a3b8">—</em>'}</td>
      <td>${escapeHtml(a.race) || '—'}</td>
      <td>${sexeLabel(a.sexe)}</td>
      <td style="text-align:center">${a.age_mois ?? '—'}</td>
      <td style="text-align:right">${a.poids_actuel ? Number(a.poids_actuel).toFixed(1) + ' kg' : '—'}</td>
      <td style="text-align:center">${gmqBadge(a.gmq_kg_jour)}</td>
      <td>
        <button class="btn-ghost" onclick="ouvrirModal(${a.id}, '${escapeHtml(a.numero_tag)}', '${escapeHtml(a.nom || '')}')">
          <span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle">open_in_new</span>
          Détail
        </button>
      </td>
    </tr>
  `).join('');
}

// ── Filtrage ──────────────────────────────────────────────────
function filtrerTroupeau() {
  const sexe     = document.getElementById('filter-sexe')?.value   || 'tous';
  const race     = document.getElementById('filter-race')?.value   || 'tous';
  const recherche = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();

  const filtres = tousAnimaux.filter(a => {
    if (sexe !== 'tous' && a.sexe !== sexe) return false;
    if (race !== 'tous' && a.race !== race) return false;
    if (recherche) {
      const tag = (a.numero_tag || '').toLowerCase();
      const nom = (a.nom || '').toLowerCase();
      if (!tag.includes(recherche) && !nom.includes(recherche)) return false;
    }
    return true;
  });

  afficherTroupeau(filtres);
}

// ── Modale détail animal ──────────────────────────────────────
async function ouvrirModal(animalId, tag, nom) {
  const overlay = document.getElementById('modal-overlay');
  const title   = document.getElementById('modal-title');
  const body    = document.getElementById('modal-body');

  if (!overlay) return;

  title.textContent = `${tag}${nom ? ' — ' + nom : ''}`;
  body.innerHTML    = '<div class="spinner"></div>';
  overlay.classList.add('active');

  try {
    // Chargement parallèle : pesées + historique statut
    const [resPesees, resHistorique] = await Promise.all([
      fetch(`${API}/api/animaux/${animalId}/pesees`),
      fetch(`${API}/api/animaux/${animalId}/historique-statut`)
    ]);

    const pesees     = resPesees.ok     ? await resPesees.json()     : [];
    const historique = resHistorique.ok ? await resHistorique.json() : [];

    // ── Section pesées ──
    let pHtml = '<h4 style="margin-bottom:.5rem;color:var(--color-primary-dark)">⚖️ Historique des pesées</h4>';
    if (!pesees.length) {
      pHtml += '<p class="loading-text">Aucune pesée enregistrée.</p>';
    } else {
      pHtml += `
        <table class="data-table" style="margin-bottom:1rem">
          <thead><tr>
            <th>Date</th><th>Poids (kg)</th><th>Agent</th><th>Notes</th>
          </tr></thead>
          <tbody>
            ${pesees.map(p => `<tr>
              <td>${formatDate(p.date_pesee)}</td>
              <td style="font-weight:700">${Number(p.poids_kg).toFixed(1)} kg</td>
              <td>${escapeHtml(p.agent)}</td>
              <td style="font-size:.8rem;color:#64748b">${escapeHtml(p.notes)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }

    // ── Section historique statut ──
    let hHtml = '<h4 style="margin-bottom:.5rem;color:var(--color-primary-dark)">📋 Historique des statuts</h4>';
    if (!historique.length) {
      hHtml += '<p class="loading-text">Aucun changement de statut enregistré.</p>';
    } else {
      hHtml += `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Ancien statut</th><th>Nouveau statut</th></tr></thead>
          <tbody>
            ${historique.map(h => `<tr>
              <td>${formatDate(h.date_changement)}</td>
              <td><span class="badge badge-warning">${escapeHtml(h.ancien_statut)}</span></td>
              <td><span class="badge badge-success">${escapeHtml(h.nouveau_statut)}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }

    body.innerHTML = pHtml + '<hr style="margin:1rem 0;border-color:#e2e8f0">' + hHtml;

  } catch (e) {
    body.innerHTML = '<p class="loading-text">❌ Erreur lors du chargement des données.</p>';
  }
}

function fermerModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ── Clavier Echap pour fermer la modale ───────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') fermerModal();
});

// ── Initialisation ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', chargerTroupeau);
