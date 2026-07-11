document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los KPIs
    const kpiClientes = document.getElementById('kpi-clientes');
    const kpiVehiculos = document.getElementById('kpi-vehiculos');
    const kpiTickets = document.getElementById('kpi-tickets');
    const kpiVencimientos = document.getElementById('kpi-vencimientos');
    
    // Referencias a tablas
    const tablaVencimientos = document.getElementById('tabla-vencimientos').querySelector('tbody');
    const tablaSoporte = document.getElementById('tabla-soporte').querySelector('tbody');
    const profileName = document.querySelector('.user-profile span');

    // Referencias al formulario de Nuevo Admin
    const formNuevoAdmin = document.getElementById('form-nuevo-admin');
    const divMensajeAdmin = document.getElementById('mensaje-admin');

    // --- CARGA DE DATOS DEL DASHBOARD ---
    const cargarDashboard = async () => {
        try {
            const res = await fetch('/Back-end/admin/dashboard.php');
            
            if (res.status === 403) {
                alert("Tu sesión de administrador ha expirado o no ha sido iniciada. Serás redirigido.");
                // Redirigimos al Login en lugar de setup_admin
                window.location.href = '/Front-end/Admin/login_admin.html'; 
                return;
            }

            const data = await res.json();

            if (data.success) {
                // Actualizar nombre
                if (profileName && data.admin_nombre) profileName.innerText = data.admin_nombre;

                // Pintar KPIs
                kpiClientes.innerText = data.kpis.clientes_activos;
                kpiVehiculos.innerText = data.kpis.vehiculos_gestionados;
                kpiTickets.innerText = data.kpis.tickets_abiertos;
                kpiVencimientos.innerText = data.kpis.proximos_vencer;

                // Pintar Vencimientos
                tablaVencimientos.innerHTML = '';
                if (data.tablas.vencimientos.length === 0) {
                    tablaVencimientos.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay vencimientos cercanos.</td></tr>';
                } else {
                    data.tablas.vencimientos.forEach(v => {
                        tablaVencimientos.innerHTML += `<tr><td><strong>${v.nombre}</strong></td><td><span class="badge warning">${v.fecha_corte}</span></td></tr>`;
                    });
                }

                // Pintar Soporte
                tablaSoporte.innerHTML = '';
                if (data.tablas.soporte.length === 0) {
                    tablaSoporte.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay tickets pendientes.</td></tr>';
                } else {
                    data.tablas.soporte.forEach(t => {
                        tablaSoporte.innerHTML += `<tr><td><strong>${t.empresa}</strong></td><td>${t.asunto}</td></tr>`;
                    });
                }
            } else {
                alert("Error devuelto por el servidor: " + data.message);
            }
        } catch (error) {
            console.error('Error de red o parsing:', error);
            kpiClientes.innerText = "Err";
            kpiVehiculos.innerText = "Err";
        }
    };

    // --- LÓGICA PARA REGISTRAR UN NUEVO ADMINISTRADOR ---
    if (formNuevoAdmin) {
        formNuevoAdmin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página recargue

            const formData = new FormData(formNuevoAdmin);
            const data = Object.fromEntries(formData.entries());
            const btnSubmit = formNuevoAdmin.querySelector('button[type="submit"]');

            btnSubmit.innerText = "Registrando...";
            btnSubmit.disabled = true;
            divMensajeAdmin.innerText = "";

            try {
                const response = await fetch('/Back-end/admin/registrar_admin.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    divMensajeAdmin.style.color = "#166534"; // Verde
                    divMensajeAdmin.innerText = "✅ " + result.message;
                    formNuevoAdmin.reset(); // Limpia el formulario
                    
                    // Borrar el mensaje de éxito después de 5 segundos
                    setTimeout(() => { divMensajeAdmin.innerText = ""; }, 5000);
                } else {
                    divMensajeAdmin.style.color = "#991b1b"; // Rojo
                    divMensajeAdmin.innerText = "❌ Error: " + result.message;
                }
            } catch (error) {
                divMensajeAdmin.style.color = "#991b1b";
                divMensajeAdmin.innerText = "❌ Error de conexión al servidor.";
            } finally {
                btnSubmit.innerText = "Crear Administrador";
                btnSubmit.disabled = false;
            }
        });
    }

    // Inicializar la carga
    cargarDashboard();
});