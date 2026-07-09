document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.querySelector('.login-form');
    
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitar que la página recargue

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btnSubmit = formLogin.querySelector('button[type="submit"]');

            btnSubmit.innerText = 'Validando...';
            btnSubmit.disabled = true;

            try {
                // Hacer petición a tu API de autenticación
                const response = await fetch('/Back-end/cliente/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });

                const result = await response.json();

                if (result.success) {
                    // ¡Login exitoso! Redirigir al dashboard
                    window.location.href = 'index.html';
                } else {
                    alert(result.message);
                    btnSubmit.innerText = 'Iniciar Sesión';
                    btnSubmit.disabled = false;
                }
            } catch (error) {
                console.error(error);
                alert('Error al conectar con el servidor.');
                btnSubmit.innerText = 'Iniciar Sesión';
                btnSubmit.disabled = false;
            }
        });
    }
});