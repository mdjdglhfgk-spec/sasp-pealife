// ... (Gardez tout le début du fichier : checkAuth, DOMContentLoaded, logique Pages) ...

    // ==========================================
    // LOGIQUE AGENTS
    // ==========================================
    document.getElementById('btnCreateAgent').addEventListener('click', () => {
        document.getElementById('agentForm').reset();
        document.getElementById('agentId').value = '';
        document.getElementById('agentSup').checked = false;
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
            est_superviseur: document.getElementById('agentSup').checked, // NOUVEAU
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

// --- FONCTIONS DES TAGS (Modifiées pour les Select) ---
window.addTag = (type) => {
    // On récupère la valeur du menu déroulant correspondant
    const select = document.getElementById(type === 'formation' ? 'selectFormation' : 'selectSanction');
    const val = select.value;
    
    if (!val) return; // Si rien n'est sélectionné

    if (type === 'formation' && !currentFormations.includes(val)) currentFormations.push(val);
    else if (type === 'sanction' && !currentSanctions.includes(val)) currentSanctions.push(val);
    
    select.value = ''; // On remet le menu à zéro
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

// --- CHARGEMENT DES AGENTS ---
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
        
        // On prépare le badge SUP s'il est superviseur
        const supBadge = agent.est_superviseur ? ' <span class="agent-badge" style="background:var(--gold); color:var(--bg-dark); font-weight:bold; margin-left:5px;">SUP</span>' : '';

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
    const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single();
    if (!agent) return;

    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentNom').value = agent.nom;
    document.getElementById('agentMatricule').value = agent.matricule || '';
    document.getElementById('agentGrade').value = agent.grade || '';
    document.getElementById('agentDivision').value = agent.division || '';
    document.getElementById('agentSup').checked = agent.est_superviseur || false; // NOUVEAU
    
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
