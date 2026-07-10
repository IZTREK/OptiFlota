document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login-admin');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            const btn = form.querySelector('button');
            
            btn.disabled = true;
            btn.innerText = 'Validando credenciales...';

            try {
                const res = await fetch('/Back-end/admin/auth_admin.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email, password})
                });
                const data = await res.json();
                
                if (data.success) {
                    // Si entra bien, lo mandamos al dashboard
                    window.location.href = '/Front-end/Admin/admin_dashboard.html';
                } else {
                    alert(data.message);
                }
            } catch (err) {
                alert("Error crítico de conexión.");
            } finally {
                btn.disabled = false;
                btn.innerText = 'Iniciar Sesión Segura';
            }
        });
    }
});