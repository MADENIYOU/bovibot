// ============================================================
//  BoviBot — nav.js
//  Navigation partagée : header, liens actifs, ping API, sidebar
// ============================================================

const API = 'http://localhost:8002';

// Ping /health toutes les 30s → indicateur vert/rouge
function pingAPI() {
  fetch(`${API}/health`)
    .then(r => {
      const dot = document.getElementById('api-status-dot');
      const txt = document.getElementById('api-status-text');
      if (!dot || !txt) return;
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
      if (!dot || !txt) return;
      dot.style.background = '#dc2626';
      txt.textContent = 'API HORS LIGNE';
      txt.style.color = '#dc2626';
    });
}

// Surligner le lien actif selon la page courante
function setActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  
  // Chercher tous les liens dans les sidebars et headers
  const sidebar = document.querySelector('.sidebar');
  const nav = document.querySelector('.header-nav, nav');
  
  const links = [
    ...(sidebar ? sidebar.querySelectorAll('a') : []),
    ...(nav ? nav.querySelectorAll('a') : []),
    ...document.querySelectorAll('.nav-link, .sidebar-link')
  ];

  links.forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === page) {
      link.classList.add('nav-active', 'sidebar-active', 'bg-primary', 'text-white');
      // Si c'est Tailwind, on ajoute aussi les classes de fond
      if (link.classList.contains('text-on-surface-variant')) {
        link.classList.remove('text-on-surface-variant');
        link.classList.add('bg-primary', 'text-white');
      }
    } else {
      link.classList.remove('nav-active', 'sidebar-active', 'bg-primary', 'text-white');
    }
  });
}

// Gestion de la Sidebar Mobile
function initSidebar() {
  const btn = document.getElementById('hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!btn || !sidebar || !overlay) return;

  btn.onclick = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  };

  overlay.onclick = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Fermer si clic sur un lien mobile
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// Démarrage
document.addEventListener('DOMContentLoaded', () => {
  setActiveLink();
  pingAPI();
  initSidebar();
  setInterval(pingAPI, 30000);
});