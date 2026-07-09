document.addEventListener('DOMContentLoaded', () => {
    let todosLosServicios = [];

    // Referencias DOM
    const tableBody = document.querySelector('.data-table tbody');
    const modalMant = document.getElementById('modal-mantenimiento');
    const formMant = document.getElementById('form-mantenimiento-datos');
    const modalVisor = document.getElementById('modal-visor');
    const selectVehiculoModal = document.getElementById('vehiculo-mant');

    // Filtros
    const inputFiltroMes = document.getElementById('filtro-mes');
    const inputFiltroPlacas = document.getElementById('filtro-placas');
    const selectFiltroTipo = document.getElementById('filtro-tipo');
    const btnBuscar = document.querySelector('.filter-actions .btn-primary');
    const btnLimpiar = document.querySelector('.filter-actions .btn-secondary');

    // --- 1. CARGAR VEHÍCULOS PARA EL SELECT ---
    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/mantenimiento.php?action=get_vehiculos');
            const vehiculos = await res.json();
            
            selectVehiculoModal.innerHTML = '<option value="" disabled selected>Seleccione una unidad...</option>';
            vehiculos.forEach(v => {
                selectVehiculoModal.innerHTML += `<option value="${v.id_vehiculo}">${v.placas} (${v.marca_modelo})</option>`;
            });
        } catch (e) {
            console.error("Error al cargar vehículos");
        }
    };

    // --- 2. CARGAR Y PINTAR TABLA ---
    const cargarServicios = async () => {
        try {
            const res = await fetch('/Back-end/cliente/mantenimiento.php');
            todosLosServicios = await res.json();
            renderizarTabla(todosLosServicios);
            actualizarKPIs(todosLosServicios);
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
        }
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay servicios registrados.</td></tr>';
            return;
        }

        datos.forEach(d => {
            const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
            const badgeTipo = d.tipo.toLowerCase() === 'preventivo' ? '<span class="badge ok">Preventivo</span>' : '<span class="badge danger">Correctivo</span>';
            const detalleCorto = d.detalle.length > 35 ? d.detalle.substring(0,35) + '...' : d.detalle;
            
            tableBody.innerHTML += `
                <tr>
                    <td>${d.fecha}</td>
                    <td><strong>${d.placas}</strong></td>
                    <td>${badgeTipo}</td>
                    <td>${detalleCorto}</td>
                    <td style="font-weight: 600;">${costoF}</td>
                    <td>${d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}</td>
                    <td class="actions">
                        <button class="btn-icon btn-ver" title="Ver detalle y factura" data-id="${d.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button class="btn-icon delete btn-eliminar" title="Eliminar registro" data-id="${d.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5M14 11v5"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        asignarEventosBotones();
    };

    // --- 3. ACTUALIZAR KPIS DINÁMICOS ---
    const actualizarKPIs = (datos) => {
        const fechaActual = new Date();
        const mesActual = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        const anioActual = fechaActual.getFullYear().toString();
        const strMesActual = `${anioActual}-${mesActual}`;

        let totalMes = 0;
        let enTaller = 0;

        datos.forEach(d => {
            if (d.fecha.startsWith(strMesActual)) {
                totalMes += parseFloat(d.costo_total);
            }
            if (d.estado.toLowerCase() === 'taller') {
                enTaller++;
            }
        });

        document.getElementById('kpi-gasto').innerText = '$' + totalMes.toLocaleString('es-MX', {minimumFractionDigits: 2});
        document.getElementById('kpi-taller').innerText = enTaller;
    };

    // --- 4. FILTROS ---
    btnBuscar.addEventListener('click', () => {
        const pMes = inputFiltroMes.value;
        const pPlacas = inputFiltroPlacas.value.toLowerCase();
        const pTipo = selectFiltroTipo.value;

        const filtrados = todosLosServicios.filter(d => {
            const matchMes = pMes ? d.fecha.startsWith(pMes) : true;
            const matchPlacas = d.placas.toLowerCase().includes(pPlacas) || d.marca_modelo.toLowerCase().includes(pPlacas);
            const matchTipo = pTipo ? d.tipo === pTipo : true;
            return matchMes && matchPlacas && matchTipo;
        });
        renderizarTabla(filtrados);
    });

    btnLimpiar.addEventListener('click', () => {
        inputFiltroMes.value = ''; inputFiltroPlacas.value = ''; selectFiltroTipo.value = '';
        renderizarTabla(todosLosServicios);
    });

    // --- 5. GUARDAR SERVICIO (POST CON ARCHIVO) ---
    document.getElementById('btn-guardar-mant').addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = new FormData(formMant);

        if (!formData.get('id_vehiculo') || !formData.get('fecha') || !formData.get('costo_total') || !formData.get('detalle')) {
            alert("Rellena todos los campos obligatorios."); return;
        }

        const btnGuardar = document.getElementById('btn-guardar-mant');
        btnGuardar.innerText = "Guardando..."; btnGuardar.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/mantenimiento.php', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            
            if (result.success) {
                modalMant.classList.remove('active');
                cargarServicios(); // Recargar tabla
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('Error de conexión.');
        } finally {
            btnGuardar.innerText = "Guardar Servicio"; btnGuardar.disabled = false;
        }
    });

    // --- 6. EVENTOS DE LA TABLA ---
    const asignarEventosBotones = () => {
        // VER DETALLE
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const d = todosLosServicios.find(x => x.id == id);
                
                const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
                const linkFactura = d.factura_url 
                    ? `<a href="/Back-end${d.factura_url}" target="_blank" style="color:var(--primary-color); font-weight:bold; text-decoration:underline;">📄 Ver Factura / Comprobante</a>` 
                    : `<span style="color:var(--text-muted);">Sin factura adjunta</span>`;

                document.getElementById('visor-titulo').innerText = "Orden de Servicio";
                document.getElementById('visor-contenido').innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 15px;"><strong>Vehículo:</strong> ${d.placas} (${d.marca_modelo})</span>
                        <span class="badge ${d.tipo === 'preventivo' ? 'ok' : 'danger'}">${d.tipo.toUpperCase()}</span>
                    </div>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                        <small style="color: var(--text-muted);">Trabajos Realizados</small>
                        <p style="margin-top: 5px; font-weight: 500;">${d.detalle}</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div><small style="color: var(--text-muted);">Fecha</small><p>${d.fecha}</p></div>
                        <div><small style="color: var(--text-muted);">Costo</small><p style="color: var(--primary-color); font-weight:bold;">${costoF}</p></div>
                        <div><small style="color: var(--text-muted);">Estado</small><p>${d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}</p></div>
                    </div>
                    <div style="text-align:center; margin-top: 20px; padding: 10px; background-color: #f9fafb; border-radius: 6px;">
                        ${linkFactura}
                    </div>
                `;
                modalVisor.classList.add('active');
            });
        });

        // ELIMINAR
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Seguro que deseas eliminar el registro de este servicio?')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/mantenimiento.php', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: id })
                        });
                        const result = await res.json();
                        if (result.success) cargarServicios();
                        else alert(result.message);
                    } catch (err) {
                        alert('Error al intentar eliminar.');
                    }
                }
            });
        });
    };

    // UI Modales
    document.getElementById('btn-abrir-modal').addEventListener('click', () => {
        formMant.reset();
        modalMant.classList.add('active');
    });
    document.getElementById('btn-cerrar-modal').addEventListener('click', () => modalMant.classList.remove('active'));
    document.getElementById('btn-cancelar-modal').addEventListener('click', () => modalMant.classList.remove('active'));
    document.getElementById('btn-cerrar-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    document.getElementById('btn-entendido-visor').addEventListener('click', () => modalVisor.classList.remove('active'));

    // Arranque
    cargarVehiculosParaSelect();
    cargarServicios();
});