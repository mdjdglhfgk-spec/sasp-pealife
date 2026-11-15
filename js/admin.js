import { supabase } from './supabase.js';

// Affichage immédiat
document.body.style.visibility = 'visible';
document.body.style.opacity = '1';
document.getElementById('adminDashboard').style.display = 'flex';

let allPages = [];

// Fonction générique pour ouvrir/fermer les modales
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (modal) {
        if (show) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
        else { modal.classList.remove('active'); document.body.style.overflow = ''; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Charger les données au démarrage
    loadPages();
    loadAgents();
    loadAnnonces();
    loadAcademy();

    // --- ONGLETS ---
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-target')).classList.add('active');
        });
    });

    // --- RECHERCHE PAGES ---
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPages.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
        renderPagesTable(filtered);
    });

    // ==========================================
    // GESTION DES BOUTONS ET FORMULAIRES
    // ==========================================

    // 1. AGENT (Ouverture / Fermeture / Sauvegarde)
    document.getElementById('btnCreateAgent')?.addEventListener('click', () => {
        document.getElementById('agentForm').reset();
        document.getElementById('agentId').value = '';
        document.getElementById('agentSup').checked = false;
        document.querySelectorAll('.agent-div-checkbox, .agent-form-checkbox, .agent-sanction-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('agentModalTitle').textContent = "Ajouter un Agent";
        toggleModal('agentModal', true);
    });

    document.getElementById('btnCloseAgentModal')?.addEventListener('click', () => toggleModal('agentModal', false));
    document.getElementById('btnCancelAgentModal')?.addEventListener('click', () => toggleModal('agentModal', false));
    
    document.getElementById('agentForm')?.addEventListener('submit', async (e) => {
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

        btn.textContent = "Enregistrement..."; btn.disabled = true;

        let error;
        if (id) {
            const { error: err } = await supabase.from('agents').update(agentData).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('agents').insert([agentData]);
            error = err;
        }

        btn.textContent = "Enregistrer"; btn.disabled = false;

        if (error) alert("Erreur : " + error.message);
        else {
            toggleModal('agentModal', false);
            showToast("Agent enregistré !");
            loadAgents();
        }
    });

    // 2. ANNONCE (Ouverture / Fermeture / Sauvegarde)
    document.getElementById('btnCreateAnnonce')?.addEventListener('click', () => {
        document.getElementById('annonceForm').reset();
        document.getElementById('annonceId').value = '';
        document.getElementById('annonceModalTitle').textContent = "Nouvelle Annonce";
        toggleModal('annonceModal', true);
    });

    document.getElementById('btnCloseAnnonceModal')?.addEventListener('click', () => toggleModal('annonceModal', false));
    document.getElementById('btnCancelAnnonceModal')?.addEventListener('click', () => toggleModal('annonceModal', false));

    document.getElementById('annonceForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('annonceId').value;
        const data = {
            titre: document.getElementById('annonceTitre').value,
            auteur: document.getElementById('annonceAuteur').value,
            contenu: document.getElementById('annonceContenu').value
        };

        let error;
        if (id) {
            const { error: err } = await supabase.from('annonces').update(data).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('annonces').insert([data]);
            error = err;
        }

        if (error) alert("Erreur : " + error.message);
        else {
            toggleModal('annonceModal', false);
            showToast("Annonce publiée !");
            loadAnnonces();
        }
    });

    // 3. ACADEMY (Ouverture / Fermeture / Sauvegarde) - C'ÉTAIT ICI LE BUG
    document.getElementById('btnCreateSession')?.addEventListener('click', () => {
        document.getElementById('sessionForm').reset();
        document.getElementById('sessionId').value = '';
        document.getElementById('sessionModalTitle').textContent = "Nouvelle Session PA";
        toggleModal('sessionModal', true);
    });

    document.getElementById('btnCloseSessionModal')?.addEventListener('click', () => toggleModal('sessionModal', false));
    document.getElementById('btnCancelSessionModal')?.addEventListener('click', () => toggleModal('sessionModal', false));

    document.getElementById('sessionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('sessionId').value;
        const data = {
            date_session: document.getElementById('sessionDate').value,
            heure: document.getElementById('sessionHeure').value,
            instructeur: document.getElementById('sessionInstructeur').value,
            places: document.getElementById('sessionPlaces').value
        };

        let error;
        if (id) {
            const { error: err } = await supabase.from('academy_sessions').update(data).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('academy_sessions').insert([data]);
            error = err;
        }

        if (error) alert("Erreur : " + error.message);
        else {
            toggleModal('sessionModal', false);
            showToast("Session planifiée !");
            loadAcademy();
        }
    });
});

// ==========================================
// CHARGEMENT DES DONNÉES
// ==========================================

// --- PAGES ---
async function loadPages() {
    const { data } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
    allPages = data || [];
    renderPagesTable(allPages);
}

function renderPagesTable(pagesToRender) {
    const tbody = document.getElementById('pagesTableBody');
    if (!tbody) return;
    if (pagesToRender.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Aucune page.</td></tr>'; return; }
    tbody.innerHTML = '';
    pagesToRender.forEach(page => {
        tbody.innerHTML += `<tr><td>${page.title}</td><td><a href="page.html?slug=${page.slug}" target="_blank" style="color:var(--admin-primary);">/${page.slug}</a></td><td style="text-align: right;"><a href="editer.html?id=${page.id}" class="btn-sm btn-edit">Modifier</a><button class="btn-sm btn-delete" onclick="deletePage('${page.id}')">Supprimer</button></td></tr>`;
    });
}

window.deletePage = async (id) => {
    if (confirm("Supprimer cette page ?")) {
        await supabase.from('pages').delete().eq('id', id);
        loadPages();
    }
};

// --- AGENTS ---
async function loadAgents() {
    const { data: agents } = await supabase.from('agents').select('*').order('nom', { ascending: true });
    const tbody = document.getElementById('agentsTableBody');
    if (!tbody) return;
    if (!agents || agents.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun agent.</td></tr>'; return; }
    tbody.innerHTML = '';
    agents.forEach(agent => {
        const supBadge = agent.est_superviseur ? ' <span class="agent-badge" style="background:var(--admin-primary); color:#000; font-weight:bold; margin-left:5px; font-size:0.7rem;">SUP</span>' : '';
        const divs = Array.isArray(agent.division) ? agent.division.map(d => `<span class="div-badge-admin">${d}</span>`).join('') : '-';
        const sancts = agent.sanctions?.length > 0 ? agent.sanctions.map(s => `<span class="agent-badge sanction" style="font-size:0.7rem;">${s}</span>`).join(' ') : '-';
        
        tbody.innerHTML += `<tr><td>${agent.nom}${supBadge}</td><td><span class="agent-badge grade">${agent.grade || '-'}</span></td><td>${divs}</td><td>${sancts}</td><td style="text-align: right;"><button class="btn-sm btn-edit" onclick="editAgent('${agent.id}')">Modifier</button><button class="btn-sm btn-delete" onclick="deleteAgent('${agent.id}')">Supprimer</button></td></tr>`;
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
    document.querySelectorAll('.agent-div-checkbox').forEach(cb => { cb.checked = (agent.division || []).includes(cb.value); });
    document.querySelectorAll('.agent-form-checkbox').forEach(cb => { cb.checked = (agent.formations || []).includes(cb.value); });
    document.querySelectorAll('.agent-sanction-checkbox').forEach(cb => { cb.checked = (agent.sanctions || []).includes(cb.value); });
    document.getElementById('agentModalTitle').textContent = "Modifier l'Agent";
    toggleModal('agentModal', true);
};

window.deleteAgent = async (id) => {
    if (confirm("Supprimer cet agent ?")) {
        await supabase.from('agents').delete().eq('id', id);
        loadAgents();
    }
};

// --- ANNONCES ---
async function loadAnnonces() {
    const { data: annonces } = await supabase.from('annonces').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('annoncesTableBody');
    if (!tbody) return;
    if (!annonces || annonces.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune annonce.</td></tr>'; return; }
    tbody.innerHTML = '';
    annonces.forEach(annonce => {
        const date = new Date(annonce.created_at).toLocaleDateString('fr-FR');
        tbody.innerHTML += `<tr><td>${annonce.titre}</td><td>${annonce.auteur}</td><td>${date}</td><td style="text-align: right;"><button class="btn-sm btn-edit" onclick="editAnnonce('${annonce.id}')">Modifier</button><button class="btn-sm btn-delete" onclick="deleteAnnonce('${annonce.id}')">Supprimer</button></td></tr>`;
    });
}

window.editAnnonce = async (id) => {
    const { data: annonce } = await supabase.from('annonces').select('*').eq('id', id).single();
    if (!annonce) return;
    document.getElementById('annonceId').value = annonce.id;
    document.getElementById('annonceTitre').value = annonce.titre;
    document.getElementById('annonceAuteur').value = annonce.auteur;
    document.getElementById('annonceContenu').value = annonce.contenu;
    document.getElementById('annonceModalTitle').textContent = "Modifier l'Annonce";
    toggleModal('annonceModal', true);
};

window.deleteAnnonce = async (id) => {
    if (confirm("Supprimer cette annonce ?")) {
        await supabase.from('annonces').delete().eq('id', id);
        loadAnnonces();
    }
};

// --- ACADEMY ---
async function loadAcademy() {
    const { data: sessions } = await supabase.from('academy_sessions').select('*').order('date_session', { ascending: true });
    const tbody = document.getElementById('academyTableBody');
    if (!tbody) return;
    if (!sessions || sessions.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune session planifiée.</td></tr>'; return; }
    tbody.innerHTML = '';
    sessions.forEach(session => {
        const date = new Date(session.date_session).toLocaleDateString('fr-FR');
        tbody.innerHTML += `<tr><td>${date}</td><td>${session.heure}</td><td>${session.instructeur}</td><td>${session.places || '-'}</td><td style="text-align: right;"><button class="btn-sm btn-edit" onclick="editSession('${session.id}')">Modifier</button><button class="btn-sm btn-delete" onclick="deleteSession('${session.id}')">Supprimer</button></td></tr>`;
    });
}

window.editSession = async (id) => {
    const { data: session } = await supabase.from('academy_sessions').select('*').eq('id', id).single();
    if (!session) return;
    document.getElementById('sessionId').value = session.id;
    document.getElementById('sessionDate').value = session.date_session;
    document.getElementById('sessionHeure').value = session.heure;
    document.getElementById('sessionInstructeur').value = session.instructeur;
    document.getElementById('sessionPlaces').value = session.places || '';
    document.getElementById('sessionModalTitle').textContent = "Modifier la Session";
    toggleModal('sessionModal', true);
};

window.deleteSession = async (id) => {
    if (confirm("Supprimer cette session ?")) {
        await supabase.from('academy_sessions').delete().eq('id', id);
        loadAcademy();
    }
};

// --- TOAST ---
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}
