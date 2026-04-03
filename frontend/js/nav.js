// ============================================================
//  BoviBot — nav.js
//  Navigation partagée : header, liens actifs, ping API
// ============================================================

const API = 'http://localhost:8002';

// Ping /health toutes les 30s → indicateur vert/rouge
function pingAPI() {
  fetch(`${API}/health`)
    .then(r => {
      const dot = document.getElementById('api-status-dot');
      const txt = document.getElementById('api-status-text');
      if (r.ok) {
        dot.style.background = '#16a34a';
        txt.textContent = 'API EN LIGNE';
        txt.style.color = '#16a34a';
      } else {
        dot.style.background = '#dc2626';
        txt.textContent = 'API HORS LIGNE';
        txt.style.color = '#dc2626';
      }
    })
    .catch(() => {
      const dot = document.getElementById('api-status-dot');
      const txt = document.getElementById('api-status-text');
      dot.style.background = '#dc2626';
      txt.textContent = 'API HORS LIGNE';
      txt.style.color = '#dc2626';
    });
}

// Surligner le lien actif selon la page courante
function setActiveLink() {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === page) {
      link.classList.add('nav-active');
      link.classList.remove('nav-inactive');
    } else {
      link.classList.remove('nav-active');
      link.classList.add('nav-inactive');
    }
  });
}

// Démarrage
document.addEventListener('DOMContentLoaded', () => {
  setActiveLink();
  pingAPI();
  setInterval(pingAPI, 30000);
});