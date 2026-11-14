import { supabase } from './supabase.js';

document.body.style.visibility = 'hidden';
document.body.style.opacity = '0';

let allPages = [];

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

const modal = document.getElementById('agentModal');

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return; 

    loadPages();
    loadAgents();

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.replace('login.html');
    });

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPages.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
        renderPagesTable(filtered);
    });

    // ÉVÉNEMENTS AGENTS
    document.getElementById('btnCreateAgent').addEventListener('click', () => {
        document.getElementById('agentForm').reset();
        document.getElementById('agentId').value = '';
        document.getElementById('agentSup').checked = false;
        
        // Décocher toutes les cases
        document.querySelectorAll('.agent-div-checkbox, .agent-form-checkbox, .agent-sanction-checkbox').forEach(cb => cb.checked = false);

        document.getElementById('agentModalTitle').textContent = "Ajouter un Agent";
        openModal();
    });

    document.getElementById('btnCloseAgentModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelAgentModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById('agentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('agentId').value;
        const btn = document.getElementById('submitAgentBtn');
        
        // On lit directement les cases cochées
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
});

// GESTION DES PAGES
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

// GESTION DES AGENTS
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
            if (Array.isArray(agent.division)) {
                divisionsDisplay = agent.division.map(d => `<span class="div-badge-admin">${d}</span>`).join('');
            } else {
                divisionsDisplay = `<span class="div-badge-admin">${agent.division}</span>`;
            }
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
    
    // Cocher les divisions
    const agentDivisions = Array.isArray(agent.division) ? agent.division : [agent.division];
    document.querySelectorAll('.agent-div-checkbox').forEach(cb => {
        cb.checked = agentDivisions.includes(cb.value);
    });

    // Cocher les formations
    const agentFormations = Array.isArray(agent.formations) ? agent.formations : [];
    document.querySelectorAll('.agent-form-checkbox').forEach(cb => {
        cb.checked = agentFormations.includes(cb.value);
    });

    // Cocher les sanctions
    const agentSanctions = Array.isArray(agent.sanctions) ? agent.sanctions : [];
    document.querySelectorAll('.agent-sanction-checkbox').forEach(cb => {
        cb.checked = agentSanctions.includes(cb.value);
    });
    
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
