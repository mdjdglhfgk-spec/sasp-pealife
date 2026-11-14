import { supabase } from './supabase.js';

// ==========================================
// 1. SÉCURITÉ & INITIALISATION
// ==========================================
document.body.style.visibility = 'hidden';
document.body.style.opacity = '0';

let allPages = [];
let currentFormations = [];
let currentSanctions = [];

async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.replace('login.html');
            return false;
        }
        
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
        return true;
    } catch (err) {
        window.location.replace('login.html');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return; 

    loadPages();
    loadAgents();

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });

    // Système d'onglets
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
});

// ==========================================
// 2. GESTION DES PAGES (AFFICHAGE SEULEMENT)
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
                <!-- Le bouton Modifier redirige vers editer.html -->
                <a href="editer.html?id=${page.id}" class="btn-sm btn-edit" style="text-decoration: none; display: inline-block;">Modifier</a>
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
// 3. GESTION DES AGENTS
// ==========================================
async function loadAgents() {
    const tbody = document.getElementById('agentsTableBody');
    const { data: agents, error } = await supabase.from('agents').select('*').order('nom', { ascending: true });

    if (error || !agents || agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucun agent.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    agents.forEach(agent => {
        const tr = document.createElement('tr');
        const supBadge = agent.est_superviseur ? ' <span class="agent-badge" style="background:var(--gold); color:var(--bg-dark); font-weight:bold; margin-left:5px; font-size:0.7rem;">SUP</span>' : '';
        
        tr.innerHTML = `
            <td>${agent.nom}${supBadge}</td>
            <td><span class="agent-badge grade">${agent.grade || '-'}</span></td>
            <td>${agent.division || '-'}</td>
            <td style="text-align: right;">
                <button class="btn-sm btn-edit" onclick="editAgent('${agent.id}')">Modifier</button>
                <button class="btn-sm btn-delete" onclick="deleteAgent('${agent.id}')">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editAgent = async (id) => {
    // Le code d'édition des agents via la modale reste inchangé
    const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single();
    if (!agent) return;

    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentNom').value = agent.nom;
    document.getElementById('agentMatricule').value = agent.matricule || '';
    document.getElementById('agentGrade').value = agent.grade || '';
    document.getElementById('agentDivision').value = agent.division || '';
    document.getElementById('agentSup').checked = agent.est_superviseur || false;
    
    currentFormations = agent.formations || [];
    currentSanctions = agent.sanctions || [];
    renderTags();
    
    document.getElementById('agentModalTitle').textContent = "Modifier l'Agent";
    document.getElementById('agentModal').classList.add('active');
};

window.deleteAgent = async (id) => {
    if (confirm("Supprimer cet agent ?")) {
        const { error } = await supabase.from('agents').delete().eq('id', id);
        if (!error) loadAgents();
    }
};

// OUTILS POUR LES AGENTS (Tags)
function renderTags() {
    const listF = document.getElementById('listFormations');
    const listS = document.getElementById('listSanctions');
    
    if (listF) listF.innerHTML = currentFormations.map((f, i) => `<div class="active-tag">${f} <span onclick="removeTag('formation', ${i})">×</span></div>`).join('');
    if (listS) listS.innerHTML = currentSanctions.map((s, i) => `<div class="active-tag">${s} <span onclick="removeTag('sanction', ${i})">×</span></div>`).join('');
}

window.addTag = (type) => {
    const select = document.getElementById(type === 'formation' ? 'selectFormation' : 'selectSanction');
    const val = select.value;
    if (!val) return;
    
    if (type === 'formation' && !currentFormations.includes(val)) currentFormations.push(val);
    else if (type === 'sanction' && !currentSanctions.includes(val)) currentSanctions.push(val);
    
    select.value = '';
    renderTags();
};

window.removeTag = (type, index) => {
    if (type === 'formation') currentFormations.splice(index, 1);
    else currentSanctions.splice(index, 1);
    renderTags();
};

window.formatDoc = (command, value = null) => {
    document.execCommand(command, false, value);
    document.getElementById('editorContent').focus();
};
