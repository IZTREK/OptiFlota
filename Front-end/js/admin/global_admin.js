document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btn-logout-admin');
    
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            if(confirm("¿Estás seguro que deseas cerrar la sesión de Administrador?")) {
                try {
                    const res = await fetch('/Back-end/admin/logout.php');
                    const data = await res.json();
                    if (data.success) {
                        window.location.href = '/Front-end/Admin/login_admin.html';
                    }
                } catch (err) {
                    alert("Error al intentar cerrar sesión.");
                }
            }
        });
    }
});