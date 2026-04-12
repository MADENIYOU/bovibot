
// ── État de la conversation ───────────────────────────────────
let chatHistory    = [];
let pendingAction  = null;
let isBusy         = false;
let currentData    = null; // Stockage global pour export et modale

// ── Gestion Sidebar Mobile (Data Playground) ──────────────────
window.togglePlayground = function() {
  const playground = document.getElementById('data-playground');
  const overlay = document.getElementById('sidebar-overlay');
  if (!playground || !overlay) return;

  const isOpen = playground.classList.contains('translate-x-0');
  
  if (isOpen) {
    playground.classList.remove('translate-x-0');
    playground.classList.add('translate-x-full');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  } else {
    playground.classList.remove('translate-x-full');
    playground.classList.add('translate-x-0');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// ── Helpers DOM ───────────────────────────────────────────────
const chatBox      = () => document.getElementById('chat-box');
const messagesInner = () => document.getElementById('messages-inner');
const userInput    = () => document.getElementById('user-input');
const sqlDisplay   = () => document.getElementById('sql-display');
const tableBody    = () => document.getElementById('results-table-body');
const tableHead    = () => document.getElementById('table-head');
const resultCount  = () => document.getElementById('result-count');
const aiInsight    = () => document.getElementById('ai-insight');

function escapeHtml(str) {
  if (str === null || str === undefined) return '—';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scrollChat() {
  const box = chatBox();
  if (box) box.scrollTop = box.scrollHeight;
}

// ── Ajouter un message dans le chat ──────────────────────────
function addMessage(role, text, extraClass = '') {
  const box = messagesInner();
  const div = document.createElement('div');
  div.className = `flex gap-4 ${role === 'user' ? 'ml-auto flex-row-reverse max-w-[85%]' : 'max-w-[85%]'} ${extraClass}`.trim();
  
  const avatarBg = role === 'user' ? 'bg-slate-100 border border-outline' : 'bg-primary text-white shadow-md';
  const bubbleBg = role === 'user' ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'bg-white border border-outline shadow-sm';
  const textColor = role === 'user' ? 'text-primary-dark' : 'text-slate-700';
  const icon = role === 'user' ? 'person' : 'smart_toy';
  const radius = role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none';

  div.innerHTML = `
    <div class="w-10 h-10 rounded-xl ${avatarBg} flex items-center justify-center shrink-0">
      <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${role === 'bot' ? 1 : 0};">${icon}</span>
    </div>
    <div class="p-5 ${bubbleBg} ${textColor} rounded-2xl ${radius} leading-relaxed">
      ${text}
    </div>
  `;
  
  box.appendChild(div);
  scrollChat();
  return div;
}

// ── Indicateur de réflexion ──────────────────────────────────
function addSpinner() {
  const box = messagesInner();
  const div = document.createElement('div');
  div.id = 'bot-spinner';
  div.className = 'flex gap-4 max-w-[85%]';
  div.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 text-white shadow-md">
      <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">smart_toy</span>
    </div>
    <div class="p-5 bg-white border border-outline rounded-2xl rounded-tl-none shadow-sm flex items-center">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  `;
  box.appendChild(div);
  scrollChat();
}

function removeSpinner() {
  const s = document.getElementById('bot-spinner');
  if (s) s.remove();
}

// ── Mise à jour du Data Playground (Panneau de droite) ─────────
function updatePlayground(data, sql, answer) {
  if (sql) sqlDisplay().textContent = sql;

  if (data && data.length > 0) {
    currentData = data;
    const cols = Object.keys(data[0]);
    resultCount().textContent = `${data.length} résultats`;
    
    tableHead().innerHTML = cols.map(c => `<th class="p-3 font-bold">${escapeHtml(c)}</th>`).join('');
    
    tableBody().innerHTML = data.slice(0, 5).map(row => `
      <tr class="hover:bg-primary/5 transition-colors">
        ${cols.map(c => `<td class="p-3">${escapeHtml(row[c])}</td>`).join('')}
      </tr>
    `).join('');

    if (data.length > 5) {
      tableBody().innerHTML += `
        <tr class="cursor-pointer bg-primary-light/30 hover:bg-primary-light/50 transition-all" onclick="openAIModal()">
          <td colspan="${cols.length}" class="p-3 text-center text-primary font-black text-[10px] uppercase tracking-widest">
            + ${data.length - 5} RÉSULTATS • CLIQUEZ POUR TOUT VOIR
          </td>
        </tr>`;
    }

    // Auto-ouvrir la modale sur mobile (visual overhaul)
    if (window.innerWidth < 1024) {
      setTimeout(openAIModal, 300); // Petit délai pour laisser l'animation de réponse se faire
    }
  } else {
    tableBody().innerHTML = '<tr><td class="p-8 text-center text-slate-400">Aucune donnée retournée</td></tr>';
    resultCount().textContent = '0 résultat';
  }

  aiInsight().textContent = answer || "Analyse terminée.";
  
  const eff = document.getElementById('stat-efficiency');
  const opt = document.getElementById('stat-opti');
  if(eff) eff.textContent = (96 + Math.random() * 3).toFixed(1) + '%';
  if(opt) opt.textContent = '+' + (12 + Math.random() * 8).toFixed(1) + '%';
}

// ── Modales ───────────────────────────────────────────────────
window.openAIModal = function() {
  console.log("Tentative d'ouverture modale...", currentData);
  if (!currentData || currentData.length === 0) {
    alert("Aucune donnée à afficher.");
    return;
  }
  const container = document.getElementById('modal-table-container');
  const cols = Object.keys(currentData[0]);

  container.innerHTML = `
    <div class="overflow-x-auto w-full">
      <table class="w-full text-sm text-left border-collapse min-w-[600px]">
        <thead class="bg-slate-50 sticky top-0 border-b border-outline z-20">
          <tr>${cols.map(c => `<th class="p-4 font-black text-primary-dark uppercase text-[11px] bg-slate-50">${escapeHtml(c)}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-outline">
          ${currentData.map(row => `
            <tr class="hover:bg-slate-50 transition-colors">
              ${cols.map(c => `<td class="p-4 text-slate-600">${escapeHtml(row[c])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  const modal = document.getElementById('ai-modal');
  if (modal) {
    modal.setAttribute('style', 'display: flex !important');
  } else {
    console.error("Élément 'ai-modal' non trouvé.");
  }
}

window.closeAIModal = function(event) {
  if (!event || event.target.id === 'ai-modal' || event.target.closest('button')) {
    document.getElementById('ai-modal').style.display = 'none';
  }
}

// ── Flux de confirmation des actions PL/SQL ───────────────────

function afficherConfirmation(data) {
  pendingAction = data.pending_action;

  const params = data.pending_action.params || {};
  const paramsHtml = Object.entries(params)
    .map(([k, v]) => `<span class="text-slate-400">${escapeHtml(k)}</span> : <strong class="text-slate-700">${escapeHtml(String(v))}</strong>`)
    .join('<br>');

  const box = messagesInner();
  const div = document.createElement('div');
  div.id = 'confirmation-bubble';
  div.className = 'flex gap-4 max-w-[85%]';
  div.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
      <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1; font-size:20px;">smart_toy</span>
    </div>
    <div class="p-5 bg-amber-50 border-2 border-amber-400 text-slate-700 rounded-2xl rounded-tl-none shadow-sm leading-relaxed">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-symbols-outlined text-amber-500" style="font-size:20px; font-variation-settings:'FILL' 1;">warning</span>
        <strong class="text-amber-700 text-sm uppercase tracking-wide">Confirmation requise</strong>
      </div>
      <p class="text-slate-700 mb-3">${escapeHtml(data.confirmation || data.answer)}</p>
      <div class="text-xs bg-white border border-amber-200 rounded-lg p-3 mb-4 font-mono leading-relaxed">
        <span class="text-slate-400">procédure</span> : <strong class="text-amber-700">${escapeHtml(data.pending_action.action)}</strong><br>
        ${paramsHtml}
      </div>
      <div class="flex gap-3">
        <button onclick="confirmerAction()"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg cursor-pointer border-0 transition-colors">
          ✓ Confirmer
        </button>
        <button onclick="annulerAction()"
          class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-lg cursor-pointer border border-slate-300 transition-colors">
          ✗ Annuler
        </button>
      </div>
    </div>
  `;
  box.appendChild(div);
  scrollChat();
}

window.confirmerAction = async function() {
  if (!pendingAction || isBusy) return;

  const bubble = document.getElementById('confirmation-bubble');
  if (bubble) bubble.remove();

  isBusy = true;
  const input = userInput();
  if (input) input.disabled = true;

  addSpinner();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: '',
        history: [],
        confirm_action: true,
        pending_action: pendingAction
      })
    });

    const data = await res.json();
    removeSpinner();

    if (!res.ok) {
      addMessage('bot', `❌ <strong>Erreur : ${escapeHtml(data.detail || 'Action échouée')}</strong>`);
    } else {
      const box = messagesInner();
      const div = document.createElement('div');
      div.className = 'flex gap-4 max-w-[85%]';
      div.innerHTML = `
        <div class="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shrink-0 shadow-md">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1; font-size:20px;">check_circle</span>
        </div>
        <div class="p-5 bg-green-50 border-2 border-green-500 text-slate-700 rounded-2xl rounded-tl-none shadow-sm leading-relaxed">
          <span class="text-green-700 font-bold">✓ Action effectuée</span>
          <p class="mt-1 text-slate-600">${escapeHtml(data.answer || 'Action effectuée avec succès !')}</p>
        </div>
      `;
      box.appendChild(div);
      scrollChat();
      chatHistory.push({ role: 'assistant', content: data.answer || 'Action effectuée avec succès !' });
    }
  } catch (e) {
    removeSpinner();
    addMessage('bot', '❌ Erreur de connexion lors de la confirmation.');
  }

  pendingAction = null;
  isBusy = false;
  if (input) { input.disabled = false; input.focus(); }
};

window.annulerAction = function() {
  const bubble = document.getElementById('confirmation-bubble');
  if (bubble) bubble.remove();
  pendingAction = null;
  addMessage('bot', '↩ Action annulée.');
};

// ── Envoi Message ─────────────────────────────────────────────
async function sendMessage() {
  if (isBusy) return;
  const input = userInput();
  const question = (input?.value || '').trim();
  if (!question) return;

  isBusy = true;
  let keepLocked = false;
  input.value = '';
  input.disabled = true;

  addMessage('user', escapeHtml(question));
  chatHistory.push({ role: 'user', content: question });
  if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);

  addSpinner();

  try {
    const res = await fetch(`/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: chatHistory.slice(-6) })
    });

    const data = await res.json();
    removeSpinner();

    if (!res.ok) {
      addMessage('bot', `❌ <strong>${escapeHtml(data.detail || 'Erreur')}</strong>`);
    } else {
      const type = data.type;
      if (type === 'query') {
        let chatHtml = `<p>${escapeHtml(data.answer)}</p>`;
        if (data.sql) {
          chatHtml += `
            <div class="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-inner relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-3xl rounded-full opacity-50"></div>
              <code class="font-mono text-[12px] leading-relaxed text-emerald-400 whitespace-pre-wrap relative z-10">${escapeHtml(data.sql)}</code>
              <span class="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest z-10 border border-emerald-500/30">SQL</span>
            </div>`;
        }
        addMessage('bot', chatHtml);
        updatePlayground(data.data, data.sql, data.answer);
      } else if (type === 'action_pending') {
        afficherConfirmation(data);
        keepLocked = true;
      } else {
        addMessage('bot', escapeHtml(data.answer || 'Je n\'ai pas compris.'));
      }
      chatHistory.push({ role: 'assistant', content: data.answer || '' });
    }
  } catch (e) {
    removeSpinner();
    addMessage('bot', 'Erreur de connexion au serveur.');
  }

  if (!keepLocked) {
    isBusy = false;
    input.disabled = false;
    input.focus();
  }
}

function ask(q) {
  userInput().value = q;
  sendMessage();
}

function copySQL() {
  const sql = sqlDisplay().textContent;
  if (!sql || sql.startsWith('--')) return;
  navigator.clipboard.writeText(sql);
  const btn = document.querySelector('button[onclick="copySQL()"]');
  const original = btn.innerHTML;
  btn.innerHTML = '✓ COPIÉ';
  setTimeout(() => btn.innerHTML = original, 2000);
}

function exportCSV() {
  if (!currentData || currentData.length === 0) return;
  const cols = Object.keys(currentData[0]);
  const csv = [
    cols.join(','),
    ...currentData.map(row => cols.map(c => `"${String(row[c]).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bovibot_export_${new Date().getTime()}.csv`;
  a.click();
}

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
