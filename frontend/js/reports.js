
async function initReports() {
  try {
    const [resFinance, resRaces, resDemo, resTop, resHealth, resProfit] = await Promise.all([
      fetch('/api/reports/finance'),
      fetch('/api/reports/races-performance'),
      fetch('/api/reports/demography'),
      fetch('/api/animaux'),
      fetch('/api/reports/health-costs'),
      fetch('/api/reports/profitability')
    ]);

    const financeData = await resFinance.json();
    const racesData = await resRaces.json();
    const demoData = await resDemo.json();
    const topData = await resTop.json();
    const healthData = await resHealth.json();
    const profitData = await resProfit.json();

    renderFinanceChart(financeData);
    renderRaceChart(racesData);
    renderDemoChart(demoData);
    renderTopPerformers(topData);
    renderHealthChart(healthData);
    renderProfitability(profitData);

  } catch (e) { console.error("Erreur rapports:", e); }
}

function renderFinanceChart(data) {
  new Chart(document.getElementById('financeChart'), {
    type: 'line',
    data: {
      labels: data.map(d => d.mois),
      datasets: [{
        label: 'Ventes (FCFA)',
        data: data.map(d => d.total),
        borderColor: '#7c4f1e',
        backgroundColor: 'rgba(124, 79, 30, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderRaceChart(data) {
  new Chart(document.getElementById('raceChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.race),
      datasets: [{
        label: 'GMQ Moyen (kg/j)',
        data: data.map(d => d.gmq_moyen),
        backgroundColor: '#16a34a',
        borderRadius: 8
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderHealthChart(data) {
  new Chart(document.getElementById('healthCostsChart'), {
    type: 'line',
    data: {
      labels: data.map(d => d.mois),
      datasets: [{
        label: 'Coûts Santé (FCFA)',
        data: data.map(d => d.total),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        fill: true,
        tension: 0.2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderProfitability(data) {
  if (data && data.length > 0) {
    const top = data[0];
    document.getElementById('top-race-name').textContent = top.race;
    document.getElementById('top-race-price').textContent = `Prix moyen: ${Number(top.prix_moyen).toLocaleString('fr-FR')} F`;
  }
}

function renderDemoChart(data) {
  new Chart(document.getElementById('demoChart'), {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.sexe === 'M' ? 'Mâles' : 'Femelles'),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: ['#3b82f6', '#ec4899'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
  });
}

function renderTopPerformers(data) {
  const body = document.getElementById('top-performers-body');
  const top10 = data
    .filter(a => a.gmq_kg_jour)
    .sort((a, b) => b.gmq_kg_jour - a.gmq_kg_jour)
    .slice(0, 10);

  body.innerHTML = top10.map(a => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="px-6 py-4 font-bold text-primary-dark">${a.numero_tag} <span class="text-xs text-slate-400 font-normal">(${a.nom || '—'})</span></td>
      <td class="px-6 py-4 text-slate-500 text-sm">${a.race}</td>
      <td class="px-6 py-4 text-right font-black text-slate-700">${a.poids_actuel} kg</td>
      <td class="px-6 py-4 text-right font-black text-secondary">+${parseFloat(a.gmq_kg_jour).toFixed(3)}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', initReports);
