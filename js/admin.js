import { supabase } from './supabase.js';

console.log("Script Admin chargé.");

document.body.style.visibility = 'hidden';
document.body.style.opacity = '0';

// Déclarations globales
let allPages = [];
const modal = document.getElementById('editorModal');
const editor = document.getElementById('editorContent');

async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // On vérifie si on vient du login (sécurité)
        const isFromLogin = document.referrer.includes('login.html');

        if (error || !session || !isFromLogin) {
            console.log("Accès refusé : pas de session ou pas de login.");
            await supabase.auth.signOut();
            window.location.replace('login.html');
            return false;
        }

        console.log("Accès autorisé.");
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.body.style.visibility = 'visible';
        document.body.style.transition = 'opacity 0.3s';
        document.body.style.opacity = '1';
        return true;
    } catch (err) {
        console.error("Erreur Auth:", err);
        window.location.replace('login.html');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    loadPages();

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        sessionStorage.clear();
        window.location.replace('login.html');
    });

    // Créer
    document.getElementById('btnCreateNew').addEventListener('click', () => {
        document.getElementById('pageForm').reset();
        editor.innerHTML = '';
        document.getElementById('pageId').value = '';
        document.getElementById('modalTitle').textContent = "Créer une nouvelle page";
        document.getElementById('submitBtn').textContent = "Publier la page";
        openModal();
    });

    // Fermer
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    // Recherche
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPages.filter(p =>
            p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term)
        );
        renderTable(filtered);
    });

    // Sauvegarde
    document.getElementById('pageForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('pageId').value;
        const submitBtn = document.getElementById('submitBtn');

        const pageData = {
            title: document.getElementById('pageTitle').value,
            slug: document.getElementById('pageSlug').value,
            content: editor.innerHTML
        };

        submitBtn.textContent = "Enregistrement...";
        submitBtn.disabled = true;

        let error;
        try {
            if (id) {
                console.log("Modification de la page...");
                const { error: err } = await supabase.from('pages').update(pageData).eq('id', id);
                error = err;
            } else {
                console.log("Création de la page...");
                const { error: err } = await supabase.from('pages').insert([pageData]);
                error = err;
            }
        } catch (err) {
            error = err;
        }

        if (error) {
            console.error("Erreur DB:", error);
            alert("Erreur : " + error.message);
            submitBtn.textContent = "Enregistrer";
            submitBtn.disabled = false;
        } else {
            console.log("Sauvegarde réussie.");
            closeModal();
            showToast("Page enregistrée avec succès !");
            loadPages();
        }
    });
});

// Outils d'édition visuelle
window.formatDoc = (command, value = null) => {
    document.execCommand(command, false, value);
    editor.focus();
};

// Modale
function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('pageForm').reset();
    editor.innerHTML = '';
}

// Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Chargement
async function loadPages() {
    const tbody = document.getElementById('pagesTableBody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Chargement...</td></tr>';

    try {
        const { data: pages, error } = await supabase.from('pages').select('*').order('created_at', { ascending: false });

        if (error) throw error;

        allPages = pages || [];
        renderTable(allPages);
    } catch (err) {
        console.error("Erreur chargement:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--error); text-align:center;">Erreur: ${err.message}</td></tr>`;
    }
}

function renderTable(pagesToRender) {
    const tbody = document.getElementById('pagesTableBody');

    if (pagesToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Aucune page trouvée.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    pagesToRender.forEach(page => {
        const tr = document.createElement('tr');

        // On encode pour éviter les bugs avec les guillemets dans le HTML
        const safeTitle = encodeURIComponent(page.title);
        const safeContent = encodeURIComponent(page.content);

        tr.innerHTML = `
            <td style="font-weight: 500;">${page.title}</td>
            <td><a href="page.html?slug=${page.slug}" target="_blank" style="color:var(--gold);">/${page.slug}</a></td>
            <td style="text-align: right;">
                <button class="btn-sm btn-edit" data-id="${page.id}" data-title="${safeTitle}" data-slug="${page.slug}" data-content="${safeContent}">Modifier</button>
                <button class="btn-sm btn-delete" data-id="${page.id}">Supprimer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const title = decodeURIComponent(e.target.getAttribute('data-title'));
            const slug = e.target.getAttribute('data-slug');
            const content = decodeURIComponent(e.target.getAttribute('data-content'));

            document.getElementById('pageId').value = id;
            document.getElementById('pageTitle').value = title;
            document.getElementById('pageSlug').value = slug;
            editor.innerHTML = content;

            document.getElementById('modalTitle').textContent = "Modifier la page";
            document.getElementById('submitBtn').textContent = "Enregistrer les modifications";

            openModal();
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("⚠️ Supprimer définitivement cette page ?")) {
                const { error } = await supabase.from('pages').delete().eq('id', id);
                if (error) alert("Erreur : " + error.message);
                else {
                    showToast("Page supprimée.");
                    loadPages();
                }
            }
        });
    });
}