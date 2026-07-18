document.addEventListener('DOMContentLoaded', () => {
    // Buscar el botón de menú y el sidebar
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        // Alternar clase active al hacer clic en el botón
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el clic cierre inmediatamente el menú
            sidebar.classList.toggle('active');
        });
        
        // Cerrar el menú si se hace clic fuera del sidebar cuando está abierto
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
        
        // Evitar que los clics dentro del sidebar cierren el menú (excepto enlaces si se desea)
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});
