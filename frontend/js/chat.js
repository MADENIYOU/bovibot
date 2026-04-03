
// ── État de la conversation ───────────────────────────────────
let chatHistory    = [];      // [{role, content}] — 6 derniers tours
let pendingAction  = null;    // action en attente de confirmation
let isBusy         = false;   // verrou anti double-envoi

// ── Helpers DOM ───────────────────────────────────────────────
const chatBox     = () => document.getElementById('chat-box');
const resultsSection = () => document.getElementById('results-section');
const resultsTable   = () => document.getElementById('results-table');
const userInput   = () => document.getElementById('user-input');

function escapeHtml(str) {
  if (str === null || str === undefined) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); }
  catch { return d; }
}

function scrollChat() {
  const box = chatBox();
  if (box) box.scrollTop = box.scrollHeight;
}

// ── Ajouter un message dans le chat ──────────────────────────
function addMessage(role, html, extraClass = '') {
  const box = chatBox();
  const div = document.createElement('div');
  div.className = `msg ${role} ${extraClass}`.trim();

  const icon = role === 'user' ? 'person' : 'smart_toy';
  div.innerHTML = `
    <div class="msg-avatar">
      <span class="material-symbols-outlined">${icon}</span>
    </div>
    <div class="bubble">${html}</div>
  `;
  box.appendChild(div);
  scrollChat();
  return div;
}

// ── Spinner de chargement ─────────────────────────────────────
function addSpinner() {
  const box = chatBox();
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'bot-spinner';
  div.innerHTML = `
    <div class="msg-avatar">
      <span class="material-symbols-outlined">smart_toy</span>
    </div>
    <div class="bubble">
      <div class="spinner" style="width:24px;height:24px;margin:0"></div>
    </div>
  `;
  box.appendChild(div);
  scrollChat();
}

function removeSpinner() {
  const s = document.getElementById('bot-spinner');
  if (s) s.remove();
}

// ── Afficher un tableau de résultats ─────────────────────────
function afficherTableau(data) {
  const section = resultsSection();
  const table   = resultsTable();
  if (!section || !table) return;

  if (!data || !data.length) {
    section.style.display = 'block';
    table.innerHTML = '<p class="loading-text">Aucun résultat retourné.</p>';
    return;
  }

  const cols = Object.keys(data[0]);
  const thead = `<thead><tr>${cols.map(c =>
    `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;

  const tbody = `<tbody>${data.map(row =>
    `<tr>${cols.map(col => {
      let val = row[col];
      if (val === null || val === undefined) return '<td>—</td>';
      // Dates
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))
        return `<td>${formatDate(val)}</td>`;
      // GMQ : formater en kg/j
      if (col.toLowerCase().includes('gmq'))
        return `<td>${Number(val).toFixed(3)} kg/j</td>`;
      // Prix FCFA
      if (col.toLowerCase().includes('fcfa') || col.toLowerCase().includes('prix') || col.toLowerCase().includes('cout'))
        return `<td>${Number(val).toLocaleString('fr-FR')} FCFA</td>`;
      return `<td>${escapeHtml(val)}</td>`;
    }).join('')}</tr>`
  ).join('')}</tbody>`;

  table.innerHTML = `<table class="data-table">${thead}${tbody}</table>`;
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Message de confirmation d'action ─────────────────────────
function afficherConfirmation(msgBot) {
  const action  = msgBot.pending_action;
  const confirm = msgBot.confirmation || 'Confirmer cette action ?';
  const explain = msgBot.answer || '';

  pendingAction = action;

  // Résumé des paramètres
  const paramsHtml = Object.entries(action.params || {}).map(([k, v]) =>
    `<div><span style="color:#64748b;font-size:.8rem">${escapeHtml(k)}</span> : <strong>${escapeHtml(String(v))}</strong></div>`
  ).join('');

  addMessage('bot', `
    <div>${escapeHtml(explain)}</div>
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:.75rem;margin:.75rem 0">
      <div style="font-weight:700;margin-bottom:.4rem;color:#92400e">
        ⚙️ Action à confirmer
      </div>
      <div style="font-size:.85rem;margin-bottom:.5rem">${escapeHtml(confirm)}</div>
      <div style="font-size:.82rem;background:white;border-radius:6px;padding:.5rem;margin-bottom:.75rem">
        ${paramsHtml}
      </div>
      <div class="confirm-btns">
        <button class="btn-success" onclick="confirmerAction()">
          ✓ Oui, confirmer
        </button>
        <button class="btn-danger" onclick="annulerAction()">
          ✕ Annuler
        </button>
      </div>
    </div>
  `, 'confirm');
}

// ── Confirmer l'action en attente ────────────────────────────
async function confirmerAction() {
  if (!pendingAction) return;
  const action = pendingAction;
  pendingAction = null;

  // Désactiver les boutons confirm
  document.querySelectorAll('.confirm-btns button').forEach(b => b.disabled = true);
  addSpinner();

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'confirmer',
        history: chatHistory,
        confirm_action: true,
        pending_action: action
      })
    });

    removeSpinner();
    const data = await res.json();

    if (!res.ok) {
      addMessage('bot', `❌ Erreur : ${escapeHtml(data.detail || 'Action échouée')}`);
      return;
    }

    addMessage('bot', `
      <div style="color:var(--color-success);font-weight:700;font-size:1rem;margin-bottom:.3rem">
        ✅ Action effectuée avec succès !
      </div>
      <div>${escapeHtml(data.answer || '')}</div>
    `);

    // Mise à jour historique
    chatHistory.push({ role: 'assistant', content: '✅ Action effectuée.' });
    if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);

  } catch (e) {
    removeSpinner();
    addMessage('bot', '❌ Erreur réseau lors de l\'exécution de l\'action.');
  }
  isBusy = false;
}

// ── Annuler l'action ──────────────────────────────────────────
function annulerAction() {
  pendingAction = null;
  isBusy = false;
  addMessage('bot', '↩️ Action annulée. Que puis-je faire d\'autre ?');
  document.querySelectorAll('.confirm-btns button').forEach(b => b.disabled = true);
}

// ── Envoi d'un message au LLM ─────────────────────────────────
async function sendMessage() {
  if (isBusy) return;
  const input = userInput();
  const question = (input?.value || '').trim();
  if (!question) return;

  isBusy = true;
  input.value = '';
  input.disabled = true;

  // Message utilisateur
  addMessage('user', escapeHtml(question));

  // Mettre à jour l'historique
  chatHistory.push({ role: 'user', content: question });
  if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);

  addSpinner();

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: chatHistory.slice(-6),
        confirm_action: false,
        pending_action: {}
      })
    });

    removeSpinner();
    const data = await res.json();

    if (!res.ok) {
      // Erreur HTTP (400 injection, 401 clé, 429 quota…)
      const detail = data.detail || 'Une erreur est survenue.';
      addMessage('bot', `❌ <strong>${escapeHtml(detail)}</strong>`);
      isBusy = false;
      input.disabled = false;
      input.focus();
      return;
    }

    const type = data.type;

    if (type === 'query') {
      // Réponse consultation
      let html = `<div>${escapeHtml(data.answer)}</div>`;
      if (data.count !== undefined)
        html += `<div style="font-size:.78rem;color:#64748b;margin-top:.3rem">${data.count} résultat(s)</div>`;
      if (data.sql)
        html += `<div class="sql-preview">${escapeHtml(data.sql)}</div>`;
      addMessage('bot', html);
      afficherTableau(data.data || []);
      chatHistory.push({ role: 'assistant', content: data.answer || '' });

    } else if (type === 'action_pending') {
      // Demande de confirmation
      afficherConfirmation(data);
      // isBusy reste true jusqu'à confirm/annuler
      input.disabled = false;
      input.focus();
      return;

    } else if (type === 'action_done') {
      addMessage('bot', `
        <div style="color:var(--color-success);font-weight:700">✅ Action effectuée !</div>
        <div>${escapeHtml(data.answer || '')}</div>
      `);
      chatHistory.push({ role: 'assistant', content: data.answer || '' });

    } else {
      // type === 'info'
      addMessage('bot', escapeHtml(data.answer || 'Je n\'ai pas compris la question.'));
      chatHistory.push({ role: 'assistant', content: data.answer || '' });
    }

    if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);

  } catch (e) {
    removeSpinner();
    addMessage('bot', '❌ Impossible de joindre le serveur BoviBot. Vérifiez que l\'API est démarrée.');
  }

  isBusy = false;
  input.disabled = false;
  input.focus();
}

// ── Raccourci clavier Entrée ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const input = userInput();
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.focus();
  }
});

// ── Fonction appelée par les boutons de suggestions (HTML) ────
function ask(question) {
  const input = userInput();
  if (input) {
    input.value = question;
    sendMessage();
  }
}
