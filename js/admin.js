import { supabase } from './supabase.js';

// On rend le body visible
document.body.style.visibility = 'visible';
document.body.style.opacity = '1';

let allPages = [];
const modal = document.getElementById('agentModal');

// Fonctions pour la modale
function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Charger les données
    loadPages();
    loadAgents();

    // 2. Gérer le bouton de déconnexion (s'il existe)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // 3. Gérer les onglets
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });

    // 4. Recherche dans les pages
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allPages.filter(p => 
                p.title.toLowerCase().includes(term) || 
                p.slug.toLowerCase().includes(term)
            );
            renderPagesTable(filtered);
        });
    }

    // 5. Bouton Nouvel Agent
    const btnCreateAgent = document.getElementById('btnCreateAgent');
    if (btnCreateAgent) {
        btnCreateAgent.addEventListener('click', () => {
            document.getElementById('agentForm').reset();
            document.getElementById('agentId').value = '';
            document.getElementById('agentSup').checked = false;
            
            // Décocher toutes les pastilles
            document.querySelectorAll('.agent-div-checkbox, .agent-form-checkbox, .agent-sanction-checkbox').forEach(cb => cb.checked = false);

            document.getElementById('agentModalTitle').textContent = "Ajouter un Agent";
            openModal();
        });
    }

    // 6. Fermeture de la modale
    const btnCloseAgentModal = document.getElementById('btnCloseAgentModal');
    const btnCancelAgentModal = document.getElementById('btnCancelAgentModal');
    if (btnCloseAgentModal) btnCloseAgentModal.addEventListener('click', closeModal);
    if (btnCancelAgentModal) btnCancelAgentModal.addEventListener('click', closeModal);
    
    // Fermer en cliquant à l'extérieur
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // 7. Sauvegarde d'un agent
    const agentForm = document.getElementById('agentForm');
    if (agentForm) {
        agentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('agentId').value;
            const btn = document.getElementById('submitAgentBtn');
            
            // Récupération des cases cochées
            const selectedDivisions = Array.from(document.querySelectorAll('.agent-div-checkbox:checked')).map(cb => cb.value);
            const selectedFormations = Array.from(document.querySelectorAll('.agent-form-checkbox:checked')).map(cb => cb.value);
            const selectedSanctions = Array.from(document.querySelectorAll('.agent-sanction-checkbox:checked')).map(cb => cb.value);

            const agentData = {
                nom: document.getElementById('agentNom').value,
                matricule: document.getElementById('agentMatricule').value,
                grade: document.getElementById('agentGrade').value,
                division: selectedDivisions,
                formations: selectedFormations,
                sanctions: selectedSanctions,
                est_superviseur: document.getElementById('agentSup').checked
            };

            btn.textContent = "Enregistrement...";
            btn.disabled = true;

            let error;
            if (id) {
                const { error: err } = await supabase.from('agents').update(agentData).eq('id', id);
                error = err;
            } else {
                const { error: err } = await supabase.from('agents').insert([agentData]);
                error = err;
            }

            btn.textContent = "Enregistrer";
            btn.disabled = false;

            if (error) {
                alert("Erreur Supabase : " + error.message);
            } else {
                closeModal();
                showToast("Agent enregistré !");
                loadAgents();
            }
        });
    }
});

// ==========================================
// CHARGEMENT DES PAGES
// ==========================================
async function loadPages() {
    const tbody = document.getElementById('pagesTableBody');
    if (!tbody) return;

    const { data: pages, error } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:red;">Erreur: ${error.message}</td></tr>`;
        return;
    }
    
    allPages = pages || [];
    renderPagesTable(allPages);
}

function renderPagesTable(pagesToRender) {
    const tbody = document.getElementById('pagesTableBody');
    if (!tbody) return;

    if (pagesToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune page.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    pagesToRender.forEach(page => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${page.title}</td>
            <td><a href="page.html?slug=${page.slug}" target="_blank" style="color:var(--gold);">/${page.slug}</a></td>
            <td style="text-align: right;">
                <a href="editer.html?id=${page.id}" class="btn-sm btn-edit">Modifier</a>
                <button class="btn-sm btn-delete" onclick="deletePage('${page.id}')">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deletePage = async (id) => {
    if (confirm("Supprimer cette page ?")) {
        const { error } = await supabase.from('pages').delete().eq('id', id);
        if (!error) loadPages();
    }
};

// ==========================================
// CHARGEMENT DES AGENTS
// ==========================================
async function loadAgents() {
    const tbody = document.getElementById('agentsTableBody');
    if (!tbody) return;

    const { data: agents, error } = await supabase.from('agents').select('*').order('nom', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Erreur: ${error.message}</td></tr>`;
        return;
    }

    if (!agents || agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun agent.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    agents.forEach(agent => {
        const tr = document.createElement('tr');
        const supBadge = agent.est_superviseur ? ' <span class="agent-badge" style="background:var(--gold); color:var(--bg-dark); font-weight:bold; margin-left:5px; font-size:0.7rem;">SUP</span>' : '';
        
        // Divisions
        let divisionsDisplay = '-';
        if (agent.division) {
            divisionsDisplay = Array.isArray(agent.division) 
                ? agent.division.map(d => `<span class="div-badge-admin">${d}</span>`).join('') 
                : `<span class="div-badge-admin">${agent.division}</span>`;
        }

        // Sanctions
        let sanctionsDisplay = '-';
        if (agent.sanctions && agent.sanctions.length > 0) {
            sanctionsDisplay = agent.sanctions.map(s => `<span class="agent-badge sanction" style="font-size:0.7rem; margin-bottom:2px;">${s}</span>`).join(' ');
        }

        tr.innerHTML = `
            <td>${agent.nom}${supBadge}</td>
            <td><span class="agent-badge grade">${agent.grade || '-'}</span></td>
            <td>${divisionsDisplay}</td>
            <td>${sanctionsDisplay}</td>
            <td style="text-align: right;">
                <button class="btn-sm btn-edit" onclick="editAgent('${agent.id}')">Modifier</button>
                <button class="btn-sm btn-delete" onclick="deleteAgent('${agent.id}')">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editAgent = async (id) => {
    const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single();
    if (!agent) return;

    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentNom').value = agent.nom;
    document.getElementById('agentMatricule').value = agent.matricule || '';
    document.getElementById('agentGrade').value = agent.grade || '';
    document.getElementById('agentSup').checked = agent.est_superviseur || false;
    
    const agentDivisions = Array.isArray(agent.division) ? agent.division : [];
    document.querySelectorAll('.agent-div-checkbox').forEach(cb => { cb.checked = agentDivisions.includes(cb.value); });

    const agentFormations = Array.isArray(agent.formations) ? agent.formations : [];
    document.querySelectorAll('.agent-form-checkbox').forEach(cb => { cb.checked = agentFormations.includes(cb.value); });

    const agentSanctions = Array.isArray(agent.sanctions) ? agent.sanctions : [];
    document.querySelectorAll('.agent-sanction-checkbox').forEach(cb => { cb.checked = agentSanctions.includes(cb.value); });
    
    document.getElementById('agentModalTitle').textContent = "Modifier l'Agent";
    openModal();
};

window.deleteAgent = async (id) => {
    if (confirm("Supprimer cet agent ?")) {
        const { error } = await supabase.from('agents').delete().eq('id', id);
        if (!error) loadAgents();
    }
};

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}
