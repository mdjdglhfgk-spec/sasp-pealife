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

    // Onglets
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });

    // Recherche pages
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPages.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
        renderPagesTable(filtered);
    });

    // ==========================================
    // GESTION DES AGENTS
    // ==========================================
    document.getElementById('btnCreateAgent').addEventListener('click', () => {
        document.getElementById('agentForm').reset();
        document.getElementById('agentId').value = '';
        document.getElementById('agentSup').checked = false;
        
        // Décocher toutes les divisions et spécialisations
        document.querySelectorAll('.agent-div-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.agent-spec-checkbox').forEach(cb => cb.checked = false);

        currentFormations = [];
        currentSanctions = [];
        renderTags();
        
        document.getElementById('agentModalTitle').textContent = "Ajouter un Agent";
        document.getElementById('agentModal').classList.add('active');
    });

    document.getElementById('btnCloseAgentModal').addEventListener('click', () => document.getElementById('agentModal').classList.remove('active'));
    document.getElementById('btnCancelAgentModal').addEventListener('click', () => document.getElementById('agentModal').classList.remove('active'));

    document.getElementById('agentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('agentId').value;
        const btn = document.getElementById('submitAgentBtn');
        
        // Récupérer les cases cochées
        const selectedDivisions = Array.from(document.querySelectorAll('.agent-div-checkbox:checked')).map(cb => cb.value);
        const selectedSpecs = Array.from(document.querySelectorAll('.agent-spec-checkbox:checked')).map(cb => cb.value);

        const agentData = {
            nom: document.getElementById('agentNom').value,
            matricule: document.getElementById('agentMatricule').value,
            grade: document.getElementById('agentGrade').value,
            division: selectedDivisions,
            specialisations: selectedSpecs,
            est_superviseur: document.getElementById('agentSup').checked,
            formations: currentFormations,
            sanctions: currentSanctions
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
            document.getElementById('agentModal').classList.remove('active');
            showToast("Agent enregistré !");
            loadAgents();
        }
    });
});

// ==========================================
// 2. GESTION DES PAGES
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
// 3. CHARGEMENT DU TABLEAU DES AGENTS
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
        
        // Formatage des divisions
        let divisionsDisplay = '-';
        if (agent.division) {
            if (Array.isArray(agent.division)) {
                divisionsDisplay = agent.division.map(d => `<span class="div-badge-admin">${d}</span>`).join('');
            } else {
                divisionsDisplay = `<span class="div-badge-admin">${agent.division}</span>`;
            }
        }

        // Formatage des sanctions (badge rouge dans le tableau admin)
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

// ==========================================
// 4. ÉDITION D'UN AGENT
// ==========================================
window.editAgent = async (id) => {
    const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single();
    if (!agent) return;

    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentNom').value = agent.nom;
    document.getElementById('agentMatricule').value = agent.matricule || '';
    document.getElementById('agentGrade').value = agent.grade || '';
    document.getElementById('agentSup').checked = agent.est_superviseur || false;
    
    // Cocher les divisions
    const agentDivisions = Array.isArray(agent.division) ? agent.division : [agent.division];
    document.querySelectorAll('.agent-div-checkbox').forEach(cb => {
        cb.checked = agentDivisions.includes(cb.value);
    });

    // Cocher les spécialisations
    const agentSpecs = Array.isArray(agent.specialisations) ? agent.specialisations : [];
    document.querySelectorAll('.agent-spec-checkbox').forEach(cb => {
        cb.checked = agentSpecs.includes(cb.value);
    });

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

// ==========================================
// 5. OUTILS (Tags & Toast)
// ==========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function renderTags() {
    document.getElementById('listFormations').innerHTML = currentFormations.map((f, i) => `<div class="active-tag">${f} <span onclick="removeTag('formation', ${i})">×</span></div>`).join('');
    document.getElementById('listSanctions').innerHTML = currentSanctions.map((s, i) => `<div class="active-tag">${s} <span onclick="removeTag('sanction', ${i})">×</span></div>`).join('');
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
