document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.data-table tbody');
    const adminNameSpan = document.getElementById('admin-name');
    let todosLosPagos = [];

    const cargarPagos = async () => {
        try {
            const res = await fetch('/Back-end/admin/pagos.php');
            
            // Validación de seguridad
            if(res.status === 403) {
                alert("No tienes sesión de administrador.");
                window.location.href = '/Front-end/Cliente/login.html';
                return;
            }

            const result = await res.json();
            
            if (result.success) {
                // Nombre en el topbar
                if (adminNameSpan) adminNameSpan.innerText = result.admin_nombre;

                // Renderizar tabla
                todosLosPagos = result.pagos;
                renderizarTabla(todosLosPagos);
                
                // Actualizar los KPIs
                document.getElementById('kpi-cobrado-mes').innerText = '$' + parseFloat(result.kpis.cobrado_mes).toLocaleString('es-MX', {minimumFractionDigits: 2});
                document.getElementById('kpi-tx-exitosas').innerText = result.kpis.tx_exitosas;
            }
        } catch (e) {
            console.error("Error al cargar pagos:", e);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al conectar con el servidor.</td></tr>';
        }
    };

    const formatearEstado = (estado) => {
        if (estado.toLowerCase() === 'aprobado') return '<span class="badge ok">Aprobado</span>';
        if (estado.toLowerCase() === 'pendiente') return '<span class="badge warning">Pendiente / Abandonado</span>';
        return `<span class="badge">${estado}</span>`;
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay pagos registrados.</td></tr>';
            return;
        }

        datos.forEach(p => {
            const montoF = '$' + parseFloat(p.monto).toLocaleString('es-MX', {minimumFractionDigits: 2});
            
            const ref = p.stripe_payment_id 
                ? `<span style="font-family: monospace; font-size: 13px; color: var(--text-muted); background: #f3f4f6; padding: 4px 8px; border-radius: 4px; border: 1px solid #e5e7eb;">${p.stripe_payment_id}</span>` 
                : '<span style="color:var(--text-muted); font-size:12px; font-style: italic;">Sin procesar</span>';

            tableBody.innerHTML += `
                <tr>
                    <td>${p.fecha_pago}</td>
                    <td><strong>${p.empresa}</strong></td>
                    <td style="font-weight: 600; color: var(--success);">${montoF}</td>
                    <td>${ref}</td>
                    <td>${formatearEstado(p.estado)}</td>
                </tr>
            `;
        });
    };

    // --- LÓGICA DE FILTROS ---
    document.getElementById('btn-buscar-filtros').addEventListener('click', () => {
        const pCliente = document.getElementById('filtro-cliente').value.toLowerCase();
        const pEstado = document.getElementById('filtro-estado-pago').value.toLowerCase();

        const filtrados = todosLosPagos.filter(p => {
            const matchCliente = p.empresa.toLowerCase().includes(pCliente);
            const matchEstado = pEstado ? p.estado.toLowerCase() === pEstado : true;
            return matchCliente && matchEstado;
        });
        renderizarTabla(filtrados);
    });

    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('filtro-cliente').value = '';
        document.getElementById('filtro-estado-pago').value = '';
        renderizarTabla(todosLosPagos);
    });

    // Arrancamos
    cargarPagos();
});