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

        // LÓGICA DE BLOQUEO POR PAGO
        if (data.expirada) {
            // Si intenta navegar a otra parte, lo forzamos a volver al index
            if (!currentUrl.includes('index.html')) {
                window.location.href = '/Front-end/Cliente/index.html'; 
                return;
            } 
            
            // Si ya está en el index, lo atrapamos con el modal
            if (currentUrl.includes('index.html')) {
                const modalBloqueo = document.getElementById('modal-bloqueo-pago');
                if(modalBloqueo) modalBloqueo.classList.add('active');
                
                // Apagamos visualmente el menú
                const sidebar = document.querySelector('.sidebar');
                if(sidebar) {
                    sidebar.style.pointerEvents = 'none'; 
                    sidebar.style.opacity = '0.3'; 
                }
            }
        } else {
            // Si todo está pagado, aplicamos Feature Flags normales
            aplicarFeatureFlagsSidebar(data.permisos);
            
            // Pintamos el nombre de la empresa
            const spanEmpresa = document.querySelector('.user-profile span');
            if (spanEmpresa) spanEmpresa.innerText = data.empresa;
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
    Object.entries(navMap).forEach(([navId, permisoKey]) => {
        const link = document.getElementById(navId);
        if (!link) return;

        const permitido = Number(permisos[permisoKey] ?? 0) === 1;
        if (!permitido) {
            link.style.display = 'none';
        }
    });
}

if (!window.location.pathname.toLowerCase().includes('login.html')) {
    document.addEventListener('DOMContentLoaded', verificarSesion);
}