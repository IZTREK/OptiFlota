document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. LÓGICA DE INICIO DE SESIÓN
    // ==========================================
    const formLogin = document.querySelector('.login-form');
    
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btnSubmit = formLogin.querySelector('button[type="submit"]');

            btnSubmit.innerText = 'Validando...';
            btnSubmit.disabled = true;

            try {
                const response = await fetch('/Back-end/cliente/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });

                const result = await response.json();

                if (result.success) {
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

    // ==========================================
    // 2. LÓGICA DE SOPORTE EXTERNO (MODAL)
    // ==========================================
    const modalSoporte = document.getElementById('modal-ticket-login');
    const btnAbrirSoporte = document.getElementById('btn-abrir-ticket');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal');
    
    // Abrir Modal
    if (btnAbrirSoporte && modalSoporte) {
        btnAbrirSoporte.addEventListener('click', (e) => {
            e.preventDefault();
            modalSoporte.classList.add('active');
        });
    }

    // Cerrar Modal
    const cerrarModalSoporte = (e) => {
        if (e) e.preventDefault();
        modalSoporte.classList.remove('active');
        const formSoporte = modalSoporte.querySelector('form');
        if (formSoporte) formSoporte.reset(); // Limpiar campos
    };

    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalSoporte);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalSoporte);

// Enviar formulario (Conexión Real con BD)
    const btnEnviarSoporte = modalSoporte ? modalSoporte.querySelector('.btn-primary') : null;
    
    if (btnEnviarSoporte) {
        btnEnviarSoporte.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const formSoporte = modalSoporte.querySelector('form');
            if (!formSoporte.checkValidity()) {
                alert("Por favor, completa todos los campos del formulario antes de enviar.");
                return;
            }

            // Extraemos los valores visuales para mandarlos al PHP
            const emailInput = formSoporte.querySelector('input[type="email"]');
            const asuntoInput = formSoporte.querySelector('input[type="text"]');
            const mensajeInput = formSoporte.querySelector('textarea');

            const formData = new FormData();
            if (emailInput) formData.append('email', emailInput.value);
            if (asuntoInput) formData.append('asunto', asuntoInput.value);
            if (mensajeInput) formData.append('mensaje', mensajeInput.value);

            btnEnviarSoporte.innerText = 'Enviando...';
            btnEnviarSoporte.disabled = true;

            try {
                // Ahora sí apuntamos a nuestro nuevo archivo backend
                const res = await fetch('/Back-end/cliente/soporte_externo.php', {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                
                if (result.success) {
                    alert(result.message);
                    cerrarModalSoporte();
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert("Error de red al intentar enviar el ticket.");
            } finally {
                btnEnviarSoporte.innerText = 'Enviar Ticket';
                btnEnviarSoporte.disabled = false;
            }
        });
    }
});