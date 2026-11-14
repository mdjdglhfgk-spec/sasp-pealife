import { supabase } from './supabase.js';

// --- SÉCURITÉ ---
document.body.style.visibility = 'hidden';
document.body.style.opacity = '0';

let allPages = [];
let currentFormations = [];
let currentSanctions = [];

async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        const isFromLogin = document.referrer.includes('login.html');

        if (error || !session || !isFromLogin) {
            await supabase.auth.signOut();
            window.location.replace('login.html');
            return false;
        }

        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.body.style.visibility = 'visible';
        document.body.style.transition = 'opacity 0.3s';
        document.body.style.opacity = '1';
        return true;
    } catch (err) {
        window.location.replace('login.html');
        return false;
    }
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return; 

    loadPages();
    loadAgents(); // Charge les agents en arrière-plan

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        sessionStorage.clear();
        window.location.replace('login.html');
    });

    // --- ONGLETS ---
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            
            e.target.classList.add('active');
            document.getElementById(e.target.getAttribute('data-target')).classList.add('active');
        });
    });

    // ==========================================
    // LOGIQUE PAGES
    // ==========================================
    document.getElementById('btnCreateNew').addEventListener('click', () => {
        document.getElementById('pageForm').reset();
        document.getElementById('editorContent').innerHTML = '';
        document.getElementById('pageId').value = '';
        document.getElementById('modalTitle').textContent = "Créer une nouvelle page";
        document.getElementById('editorModal').classList.add('active');
    });

    document.getElementById('btnCloseModal').addEventListener('click', () => document.getElementById('editorModal').classList.remove('active'));
    document.getElementById('btnCancelModal').addEventListener('click', () => document.getElementById('editorModal').classList.remove('active'));

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPages.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
        renderPagesTable(filtered);
    });

    document.getElementById('pageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pageId').value;
        const btn = document.getElementById('submitBtn');
        const pageData = {
            title: document.getElementById('pageTitle').value,
            slug: document.getElementById('pageSlug').value,
            content: document.getElementById('editorContent').innerHTML 
        };

        btn.textContent = "Enregistrement...";
        btn.disabled = true;

        let error;
        if (id) {
            const { error: err } = await supabase.from('pages').update(pageData).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('pages').insert([pageData]);
            error = err;
        }

        btn.textContent = "Enregistrer";
        btn.disabled = false;

        if (error) alert("Erreur : " + error.message);
        else {
            document.getElementById('editorModal').classList.remove('active');
            showToast("Page enregistrée !");
            loadPages();
        }
    });

    // ==========================================
    // LOGIQUE AGENTS
    // ==========================================
    document.getElementById('btnCreateAgent').addEventListener('click', () => {
        document.getElementById('agentForm').reset();
        document.getElementById('agentId').value = '';
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
        
        const agentData = {
            nom: document.getElementById('agentNom').value,
            matricule: document.getElementById('agentMatricule').value,
            grade: document.getElementById('agentGrade').value,
            division: document.getElementById('agentDivision').value,
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

        if (error) alert("Erreur Supabase : " + error.message);
        else {
            document.getElementById('agentModal').classList.remove('active');
            showToast("Agent enregistré !");
            loadAgents();
        }
    });
});

// --- OUTILS ---
window.formatDoc = (command, value = null) => {
    document.execCommand(command, false, value);
    document.getElementById('editorContent').focus();
};

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

window.addTag = (type) => {
    const input = document.getElementById(type === 'formation' ? 'inputFormation' : 'inputSanction');
    const val = input.value.trim();
    if (!val) return;

    if (type === 'formation' && !currentFormations.includes(val)) currentFormations.push(val);
    else if (type === 'sanction' && !currentSanctions.includes(val)) currentSanctions.push(val);
    
    input.value = '';
    renderTags();
};

window.removeTag = (type, index) => {
    if (type === 'formation') currentFormations.splice(index, 1);
    else currentSanctions.splice(index, 1);
    renderTags();
};

function renderTags() {
    document.getElementById('listFormations').innerHTML = currentFormations.map((f, i) => `<div class="active-tag">${f} <span onclick="removeTag('formation', ${i})">×</span></div>`).join('');
    document.getElementById('listSanctions').innerHTML = currentSanctions.map((s, i) => `<div class="active-tag">${s} <span onclick="removeTag('sanction', ${i})">×</span></div>`).join('');
}

// --- CHARGEMENT DES DONNÉES ---
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
                <button class="btn-sm btn-edit" onclick="editPage('${page.id}', '${encodeURIComponent(page.title)}', '${page.slug}', '${encodeURIComponent(page.content)}')">Modifier</button>
                <button class="btn-sm btn-delete" onclick="deletePage('${page.id}')">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editPage = (id, title, slug, content) => {
    document.getElementById('pageId').value = id;
    document.getElementById('pageTitle').value = decodeURIComponent(title);
    document.getElementById('pageSlug').value = slug;
    document.getElementById('editorContent').innerHTML = decodeURIComponent(content);
    document.getElementById('modalTitle').textContent = "Modifier la page";
    document.getElementById('editorModal').classList.add('active');
};

window.deletePage = async (id) => {
    if (confirm("Supprimer cette page ?")) {
        const { error } = await supabase.from('pages').delete().eq('id', id);
        if (!error) loadPages();
    }
};

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
        tr.innerHTML = `
            <td>${agent.nom}</td>
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
    const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single();
    if (!agent) return;

    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentNom').value = agent.nom;
    document.getElementById('agentMatricule').value = agent.matricule || '';
    document.getElementById('agentGrade').value = agent.grade || '';
    document.getElementById('agentDivision').value = agent.division || '';
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
