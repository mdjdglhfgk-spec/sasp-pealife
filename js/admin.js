import { supabase } from './supabase.js';

// On cache le body pour éviter de voir la page clignoter
document.body.style.visibility = 'hidden';
document.body.style.opacity = '0';

let allPages = [];
const modal = document.getElementById('agentModal');

// ==========================================
// 1. SÉCURITÉ (Le portier)
// ==========================================
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Si erreur ou pas de session = redirection vers le login
        if (error || !session) {
            window.location.replace('login.html');
            return false;
        }

        // Si session OK = on affiche le dashboard
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
        document.getElementById('adminDashboard').style.display = 'flex';
        return true;
        
    } catch (err) {
        window.location.replace('login.html');
        return false;
    }
}

// ==========================================
// 2. FONCTIONS MODALES
// ==========================================
function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==========================================
// 3. INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return; // Si pas connecté, on arrête tout ici.

    // Charger les données
    loadPages();
    loadAgents();

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });

    // Navigation par onglets
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });

    // Recherche de pages
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPages.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
        renderPagesTable(filtered);
    });

    // Bouton Nouvel Agent
    document.getElementById('btnCreateAgent').addEventListener('click', () => {
        document.getElementById('agentForm').reset();
        document.getElementById('agentId').value = '';
        document.getElementById('agentSup').checked = false;
        
        document.querySelectorAll('.agent-div-checkbox, .agent-form-checkbox, .agent-sanction-checkbox').forEach(cb => cb.checked = false);

        document.getElementById('agentModalTitle').textContent = "Ajouter un Agent";
        openModal();
    });

    // Fermeture modales
    document.getElementById('btnCloseAgentModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelAgentModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Sauvegarde d'un Agent
    document.getElementById('agentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('agentId').value;
        const btn = document.getElementById('submitAgentBtn');
        
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
            alert("Erreur : " + error.message);
        } else {
            closeModal();
            showToast("Agent enregistré !");
            loadAgents();
        }
    });
});

// ==========================================
// 4. CHARGEMENT DES PAGES
// ==========================================
async function loadPages() {
    const { data: pages, error } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
    if (!error) {
        allPages = pages || [];
        renderPagesTable(allPages);
    }
}

function renderPagesTable(pagesToRender) {
    const tbody = document.getElementById('pagesTableBody');
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
// 5. CHARGEMENT DES AGENTS
// ==========================================
async function loadAgents() {
    const tbody = document.getElementById('agentsTableBody');
    const { data: agents, error } = await supabase.from('agents').select('*').order('nom', { ascending: true });

    if (error || !agents || agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun agent.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    agents.forEach(agent => {
        const tr = document.createElement('tr');
        const supBadge = agent.est_superviseur ? ' <span class="agent-badge" style="background:var(--gold); color:var(--bg-dark); font-weight:bold; margin-left:5px; font-size:0.7rem;">SUP</span>' : '';
        
        let divisionsDisplay = '-';
        if (agent.division) {
            divisionsDisplay = Array.isArray(agent.division) 
                ? agent.division.map(d => `<span class="div-badge-admin">${d}</span>`).join('') 
                : `<span class="div-badge-admin">${agent.division}</span>`;
        }

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
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
