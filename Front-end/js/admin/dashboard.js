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

    const cargarDashboard = async () => {
        try {
            const res = await fetch('/Back-end/admin/dashboard.php');
            
            
            if (res.status === 403) {
                alert("Tu sesión de administrador ha expirado o no ha sido iniciada. Serás redirigido.");
                window.location.href = '/Back-end/admin/setup_admin.php'; 
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
                    tablaVencimientos.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay vencimientos.</td></tr>';
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

    cargarDashboard();
});