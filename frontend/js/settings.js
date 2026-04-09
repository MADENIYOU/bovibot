
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();

    document.getElementById('farm_name').value = data.farm_name;
    document.getElementById('supervisor').value = data.supervisor;
    document.getElementById('llm_model_display').textContent = data.llm_model;
    document.getElementById('alert_threshold_gmq').value = data.alert_threshold_gmq;
    document.getElementById('gmq_val').textContent = data.alert_threshold_gmq + ' kg/j';

  } catch (e) { console.error("Erreur chargement paramètres:", e); }
}

function showToast(message) {
  const toast = document.getElementById('custom-toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

document.getElementById('farm-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const farm_name = document.getElementById('farm_name').value;
  const supervisor = document.getElementById('supervisor').value;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_name, supervisor })
    });
    if (res.ok) showToast("Profil mis à jour avec succès !");
  } catch (e) { showToast("Erreur lors de la mise à jour"); }
});

document.getElementById('alert_threshold_gmq')?.addEventListener('input', (e) => {
  document.getElementById('gmq_val').textContent = e.target.value + ' kg/j';
});

document.addEventListener('DOMContentLoaded', loadSettings);
