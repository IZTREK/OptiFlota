document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los números de las tarjetas (KPIs)
    const kpiClientes = document.getElementById('kpi-clientes');
    const kpiVehiculos = document.getElementById('kpi-vehiculos');
    const kpiTickets = document.getElementById('kpi-tickets');
    const kpiVencimientos = document.getElementById('kpi-vencimientos');
    
    // Referencias a los cuerpos de las tablas
    const tablaVencimientos = document.getElementById('tabla-vencimientos').querySelector('tbody');
    const tablaSoporte = document.getElementById('tabla-soporte').querySelector('tbody');

    const cargarDashboard = async () => {
        try {
            const res = await fetch('/Back-end/admin/dashboard.php');
            const data = await res.json();

            if(data.success) {
                // 1. Pintar Tarjetas
                kpiClientes.innerText = data.kpis.clientes_activos;
                kpiVehiculos.innerText = data.kpis.vehiculos_gestionados;
                kpiTickets.innerText = data.kpis.tickets_abiertos;
                kpiVencimientos.innerText = data.kpis.proximos_vencer;

                // 2. Pintar Tabla de Vencimientos
                tablaVencimientos.innerHTML = '';
                if(data.tablas.vencimientos.length === 0) {
                    tablaVencimientos.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay vencimientos próximos.</td></tr>';
                } else {
                    data.tablas.vencimientos.forEach(v => {
                        tablaVencimientos.innerHTML += `
                            <tr>
                                <td><strong>${v.nombre}</strong></td>
                                <td><span class="badge warning">${v.fecha_corte}</span></td>
                            </tr>
                        `;
                    });
                }

                // 3. Pintar Tabla de Soporte
                tablaSoporte.innerHTML = '';
                if(data.tablas.soporte.length === 0) {
                    tablaSoporte.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay tickets pendientes de atender.</td></tr>';
                } else {
                    data.tablas.soporte.forEach(t => {
                        tablaSoporte.innerHTML += `
                            <tr>
                                <td><strong>${t.empresa}</strong></td>
                                <td>${t.asunto}</td>
                            </tr>
                        `;
                    });
                }
            }
        } catch (error) {
            console.error('Error al cargar el dashboard admin:', error);
            kpiClientes.innerText = "Error";
        }
    };

    cargarDashboard();
});