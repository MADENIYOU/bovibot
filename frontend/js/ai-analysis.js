/**
 * BoviBot — AI Analysis Module
 * Handles the "Analyse IA" button and modal display across different pages.
 */

const AI_API_URL = '/api/chat';
let lastAnalysis = { title: "", content: "" };

/**
 * Scrapes data from the current page to provide context to the IA.
 */
function getPageData() {
    let dataStr = "";
    
    // 1. Check for KPI cards (Dashboard, Reports)
    const kpis = document.querySelectorAll('.kpi-card, .stat-card, [id^="stat-"], [id^="s-"]');
    if (kpis.length > 0) {
        dataStr += "KPIs actuels : ";
        kpis.forEach(k => {
            const label = k.querySelector('.kpi-label, .stat-lbl')?.innerText || k.id || "Valeur";
            const value = k.querySelector('.kpi-value, .stat-val')?.innerText || k.innerText || "?";
            dataStr += `${label}: ${value.trim()}; `;
        });
        dataStr += "\n";
    }

    // 2. Check for Tables (Troupeau, Gestation, Santé)
    const tableRows = document.querySelectorAll('table tbody tr');
    if (tableRows.length > 0 && tableRows[0].innerText.trim() !== "" && !tableRows[0].innerText.includes("Chargement")) {
        dataStr += "Données du tableau : ";
        const rowsToTake = Array.from(tableRows).slice(0, 10); // Take first 10 rows for context
        rowsToTake.forEach((row, i) => {
            dataStr += `[Ligne ${i+1}: ${row.innerText.replace(/\s+/g, ' ').trim()}]; `;
        });
        dataStr += "\n";
    }

    // 3. Check for Alerts
    const alerts = document.querySelectorAll('#health-alerts-list, #alerts-cards-container');
    if (alerts.length > 0) {
        dataStr += "Alertes visibles : " + alerts[0].innerText.replace(/\s+/g, ' ').trim() + "\n";
    }

    return dataStr || "Aucune donnée spécifique visible sur cette page.";
}

/**
 * Triggers the AI analysis based on the current page context.
 * @param {string} context - A description of the current page/context for the AI.
 */
async function triggerAiAnalysis(context) {
    const modal = document.getElementById('ai-analysis-modal');
    const modalBody = document.getElementById('ai-modal-body');
    const modalTitle = document.getElementById('ai-modal-title');

    if (!modal || !modalBody) {
        console.error("AI Analysis modal elements not found in DOM.");
        return;
    }

    // Gather page data
    const pageData = getPageData();
    const title = context.split('(')[0].trim() || "Générale";

    // Show modal and loading state
    modal.style.display = 'flex';
    modalTitle.textContent = "Analyse IA — " + title;
    modalBody.innerHTML = `
        <div class="flex flex-col justify-center items-center p-12 gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p class="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest text-center">BoviBot analyse les données en temps réel...</p>
        </div>
    `;

    const prompt = `Voici les données extraites de la page actuelle "${context}" :
    ---
    ${pageData}
    ---
    
    EN TANT QU'EXPERT EN ÉLEVAGE :
    Fais une analyse stratégique approfondie basée UNIQUEMENT sur ces faits. 
    Ne me dis pas que tu dois faire des requêtes SQL, utilise les données fournies ci-dessus.
    
    Structure ta réponse EXACTEMENT comme suit avec des titres en gras :
    
    1. **Faits** : (Résumé synthétique des données fournies)
    2. **Analyse** : (Interprétation des chiffres, corrélations et tendances observées)
    3. **Problèmes identifiés** : (Points critiques, anomalies ou risques détectés)
    4. **Solutions proposées** : (Actions correctives immédiates et recommandations stratégiques à long terme)
    
    Réponds de manière professionnelle et structurée en français.`;

    try {
        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: prompt,
                history: []
            })
        });

        if (!response.ok) throw new Error("Erreur lors de l'appel à l'API IA");

        const result = await response.json();
        
        // Format the response
        let content = result.answer || "Désolé, je n'ai pas pu générer d'analyse pour le moment.";
        
        // Convert markdown-like formatting to HTML
        const htmlContent = content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary-dark font-black uppercase text-xs block mt-4 mb-2 tracking-widest">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/- (.*?)<br>/g, '<li class="ml-4 list-disc text-slate-600 mb-1">$1</li>')
            .replace(/<\/li><br>/g, '</li>');

        // Store for PDF export
        lastAnalysis = { title: "Analyse IA : " + title, content: htmlContent };

        modalBody.innerHTML = `
            <div class="prose prose-slate max-w-none p-2">
                <div class="bg-primary-light/40 border-l-4 border-primary p-6 rounded-r-2xl shadow-sm mb-6">
                    <div class="flex items-center gap-3 mb-2 text-primary font-black uppercase text-[10px] tracking-tighter">
                        <span class="material-symbols-outlined text-lg">psychology</span>
                        Raisonnement Stratégique BoviBot
                    </div>
                    <div class="text-slate-700 leading-relaxed text-sm">
                        ${htmlContent}
                    </div>
                </div>
                
                <div class="mt-8 flex justify-end gap-3">
                    <button id="download-pdf-btn" onclick="downloadAnalysisPdf()" class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                        Exporter en PDF
                    </button>
                    <button onclick="closeAiAnalysisModal()" class="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg active:scale-95">
                        Fermer
                    </button>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("AI Analysis Error:", error);
        modalBody.innerHTML = `
            <div class="flex flex-col justify-center items-center p-12 text-center">
                <span class="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
                <p class="text-red-600 font-bold mb-2 uppercase tracking-widest text-xs">Échec de la génération</p>
                <p class="text-slate-500 text-sm">${error.message}</p>
                <button onclick="closeAiAnalysisModal()" class="mt-6 px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase">Retour</button>
            </div>
        `;
    }
}

/**
 * Sends analysis content to backend to generate a clean PDF.
 */
async function downloadAnalysisPdf() {
    const btn = document.getElementById('download-pdf-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin material-symbols-outlined text-sm">sync</span> Génération...';

    try {
        const response = await fetch('/api/ai-analysis/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lastAnalysis)
        });

        if (!response.ok) throw new Error("Erreur lors de la génération du PDF");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analyse_BoviBot_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("PDF Export Error:", error);
        alert("Impossible de générer le PDF : " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Closes the AI Analysis modal.
 */
function closeAiAnalysisModal() {
    const modal = document.getElementById('ai-analysis-modal');
    if (modal) modal.style.display = 'none';
}

// Global click-outside listener
window.addEventListener('click', (event) => {
    const modal = document.getElementById('ai-analysis-modal');
    if (event.target === modal) {
        closeAiAnalysisModal();
    }
});
