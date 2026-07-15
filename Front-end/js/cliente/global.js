// Archivo: global.js

async function verificarSesion() {
    try {
        const response = await fetch('/Back-end/cliente/check_session.php'); 
        const result = await response.json();

        if (!result.success) {
            window.location.href = '/Front-end/Cliente/login.html'; 
            return;
        }

        const data = result.data;
        const currentUrl = window.location.pathname.toLowerCase();

        if (data.expirada) {
            if (!currentUrl.includes('index.html') && !currentUrl.includes('suscripcion.html')) {
                window.location.href = '/Front-end/Cliente/index.html'; 
                return;
            } 
            
            if (currentUrl.includes('index.html')) {
                const modalBloqueo = document.getElementById('modal-bloqueo-pago');
                if(modalBloqueo) modalBloqueo.classList.add('active');
                const sidebar = document.querySelector('.sidebar');
                if(sidebar) { sidebar.style.pointerEvents = 'none'; sidebar.style.opacity = '0.3'; }
            }
        } else {
            aplicarFeatureFlagsSidebar(data.permisos);
            
            const spanEmpresa = document.querySelector('.user-profile span');
            const avatarCirculo = document.querySelector('.user-profile .avatar');
            
            if (spanEmpresa) spanEmpresa.innerText = data.empresa; 
            
            if (avatarCirculo && data.empresa) {
                const palabras = data.empresa.trim().split(' ');
                let iniciales = palabras.length === 1 ? palabras[0].substring(0, 2).toUpperCase() : (palabras[0][0] + palabras[1][0]).toUpperCase();
                avatarCirculo.innerText = iniciales;
            }

            // --- CARGAR COLOR PERSONALIZADO ---
            const nombreEmpresa = data.empresa.replace(/\s+/g, '_');
            const colorGuardado = localStorage.getItem('sidebarColor_' + nombreEmpresa);
            if (colorGuardado) {
                document.documentElement.style.setProperty('--sidebar-bg', colorGuardado);
            }
        }

        // LA BARRA ROJA SOLO APARECE SI ES ADMIN 
        if (data.is_impersonating === true) {
            if (!document.getElementById('impersonation-banner')) {
                const banner = document.createElement('div');
                banner.id = 'impersonation-banner';
                banner.style.cssText = `
                    background-color: #dc3545; 
                    color: white; 
                    text-align: center; 
                    padding: 12px; 
                    font-weight: bold;
                    font-size: 14px;
                    position: sticky; 
                    top: 0; 
                    z-index: 9999;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                `;
                banner.innerHTML = `
                    ⚠️ MODO SOPORTE: Estás navegando dentro de la cuenta de <strong>${data.empresa}</strong>. 
                    <a href="/Back-end/admin/return_admin.php" style="color: #ffc107; text-decoration: underline; margin-left: 15px;">
                        Terminar soporte y volver al panel de Administrador
                    </a>
                `;
                document.body.prepend(banner);
            }
        } else {
            // Si por alguna razón la barra está ahí y NO es admin, la borramos
            const bannerExistente = document.getElementById('impersonation-banner');
            if (bannerExistente) {
                bannerExistente.remove();
            }
        }

    } catch (error) {
        console.error("Error conectando con el servidor:", error);
    }
}

const navMap = {
    'nav-dashboard': 'mod_dashboard', 
    'nav-vehiculos': 'mod_vehiculos', 
    'nav-diagnosticos': 'mod_diagnosticos',
    'nav-combustible': 'mod_combustible', 
    'nav-mantenimiento': 'mod_mantenimiento', 
    'nav-tickets': 'mod_tickets', 
    'nav-suscripcion': 'mod_suscripcion'
};

function aplicarFeatureFlagsSidebar(permisos) {
    if (!permisos) return;
    Object.entries(navMap).forEach(([navId, permisoKey]) => {
        const link = document.getElementById(navId);
        if (!link) return;
        const permitido = Number(permisos[permisoKey] || 0) === 1;
        if (!permitido) link.style.display = 'none';
    });
}

async function cerrarSesion(e) {
    e.preventDefault();
    
    const confirmar = confirm("¿Estás seguro de que deseas cerrar sesión?");
    if (!confirmar) {
        return; 
    }

    try {
        const response = await fetch('/Back-end/cliente/logout.php');
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '/Front-end/Cliente/login.html';
        }
    } catch (error) {
        console.error("Error al intentar cerrar sesión:", error);
        window.location.href = '/Front-end/Cliente/login.html';
    }
}

if (!window.location.pathname.toLowerCase().includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        verificarSesion();
        
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', cerrarSesion);
        }
    });
}