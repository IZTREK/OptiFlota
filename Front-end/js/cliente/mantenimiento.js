document.addEventListener('DOMContentLoaded', () => {
    let mantenimientos = [];
    let vehiculos = [];

    // Referencias al DOM
    const tableBody = document.querySelector('.data-table tbody');
    const modalMantenimiento = document.getElementById('modal-mantenimiento');
    const formMantenimiento = document.getElementById('form-mantenimiento-datos') || document.querySelector('.data-form');
    const selectVehiculoModal = document.getElementById('vehiculo-mantenimiento') || document.querySelector('select[name="id_vehiculo"]');
    const btnGuardar = document.getElementById('btn-guardar-mantenimiento') || document.querySelector('#modal-mantenimiento .btn-primary');
    const modalVisor = document.getElementById('modal-visor');

    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/mantenimiento.php?action=get_vehiculos');
            vehiculos = await res.json();
            if(selectVehiculoModal) {
                selectVehiculoModal.innerHTML = '<option value="" disabled selected>Seleccione un vehículo...</option>';
                vehiculos.forEach(v => {
                    selectVehiculoModal.innerHTML += `<option value="${v.id_vehiculo}">${v.placas} (${v.marca_modelo})</option>`;
                });
            }
        } catch (e) { console.error("Error al cargar vehículos"); }
    };

    const cargarMantenimientos = async () => {
        try {
            const res = await fetch('/Back-end/cliente/mantenimiento.php');
            mantenimientos = await res.json();
            renderizarTabla(mantenimientos);
            calcularKPIs(); 
        } catch (e) {
            if(tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión al cargar registros.</td></tr>`;
        }
    };

    const calcularKPIs = () => {
        const mesActual = new Date().toISOString().substring(0, 7);
        let inversionMes = 0;
        let vehiculosEnTaller = new Set(); 

        mantenimientos.forEach(m => {
            if (m.fecha && m.fecha.startsWith(mesActual)) {
                inversionMes += parseFloat(m.costo_total || 0);
            }
            const est = m.estado ? m.estado.toLowerCase() : '';
            if (est.includes('taller') || est.includes('proceso') || est.includes('pendiente')) {
                vehiculosEnTaller.add(m.id_vehiculo);
            }
        });

        const kpis = document.querySelectorAll('.kpi-value');
        if (kpis.length >= 2) {
            kpis[0].innerText = '$' + inversionMes.toLocaleString('es-MX', {minimumFractionDigits: 2});
            kpis[1].innerText = vehiculosEnTaller.size;
        }
    };

    const formatearTipo = (tipo) => {
        const t = tipo ? tipo.toLowerCase() : '';
        if (t.includes('preventivo')) return `<span class="badge ok" style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:12px; font-size:12px;">Preventivo</span>`;
        if (t.includes('correctivo')) return `<span class="badge danger" style="background:#fee2e2; color:#991b1b; padding:4px 8px; border-radius:12px; font-size:12px;">Correctivo</span>`;
        return `<span class="badge" style="background:#f3f4f6; color:#374151; padding:4px 8px; border-radius:12px; font-size:12px;">${tipo}</span>`;
    };

    const formatearEstado = (estado) => {
        const est = estado ? estado.toLowerCase() : '';
        if (est.includes('completado') || est.includes('listo') || est.includes('finalizado') || est.includes('terminado')) {
            return `<span class="badge ok">${estado}</span>`;
        }
        if (est.includes('taller') || est.includes('proceso') || est.includes('pendiente')) {
            return `<span class="badge warning">${estado}</span>`;
        }
        return `<span class="badge">${estado}</span>`;
    };

    const renderizarTabla = (datos) => {
        if(!tableBody) return;
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros de mantenimiento.</td></tr>';
            return;
        }

        const svgOjo = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const svgEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const svgCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        const svgTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5M14 11v5"></path></svg>`;

        datos.forEach(m => {
            const costoF = '$' + parseFloat(m.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
            
            const btnVerHTML = `<button class="btn-icon btn-ver" data-id="${m.id}" title="Ver Detalles del Ticket" style="color:var(--text-main); display:inline-flex; align-items:center; justify-content:center;">${svgOjo}</button>`;
            const btnEditarHTML = `<button class="btn-icon btn-editar" data-id="${m.id}" title="Editar Servicio" style="color:var(--text-main); display:inline-flex; align-items:center; justify-content:center;">${svgEdit}</button>`;
            
            const est = m.estado ? m.estado.toLowerCase() : '';
            const estaCompletado = est.includes('completado') || est.includes('listo') || est.includes('finalizado') || est.includes('terminado');

            const btnCompletarHTML = !estaCompletado 
                ? `<button class="btn-icon btn-completar" data-id="${m.id}" title="Marcar como Completado" style="color:#10b981; display:inline-flex; align-items:center; justify-content:center;">${svgCheck}</button>` 
                : ``;

            const btnEliminarHTML = `<button class="btn-icon delete btn-eliminar" data-id="${m.id}" title="Eliminar Registro" style="display:inline-flex; align-items:center; justify-content:center;">${svgTrash}</button>`;

            tableBody.innerHTML += `
                <tr>
                    <td>${m.fecha}</td>
                    <td><strong>${m.placas}</strong><br><small>${m.marca_modelo}</small></td>
                    <td>${formatearTipo(m.tipo)}</td>
                    <td>${m.detalle}</td>
                    <td><strong>${costoF}</strong></td>
                    <td>${formatearEstado(m.estado)}</td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
                            ${btnVerHTML}
                            ${btnEditarHTML}
                            ${btnCompletarHTML}
                            ${btnEliminarHTML}
                        </div>
                    </td>
                </tr>
            `;
        });
        asignarEventosBotones();
    };

    const asignarEventosBotones = () => {
        // VER DETALLES
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const m = mantenimientos.find(x => x.id == id);
                if(m && modalVisor) {
                    const costoF = '$' + parseFloat(m.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
                    const linkFactura = m.factura_url 
                        ? `<a href="/Back-end${m.factura_url}" target="_blank" style="color:var(--primary-color); font-weight: 500; text-decoration: none;">Ver Factura / Cotización</a>` 
                        : `Sin comprobante adjunto`;

                    document.getElementById('visor-titulo').innerText = "Ticket de Mantenimiento";
                    document.getElementById('visor-contenido').innerHTML = `
                        <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #d1d5db; padding-bottom: 20px;">
                            <h3 style="color: var(--primary-color); font-size: 28px; font-weight: bold; margin-bottom: 5px;">${costoF}</h3>
                            <p style="color: var(--text-muted); font-size: 14px;">Servicio ${m.tipo}</p>
                        </div>
                        <div class="responsive-grid" style=" padding-bottom: 20px;">
                            <div><small style="color: var(--text-muted); font-size: 12px; display: block; margin-bottom: 4px;">Vehículo</small><p style="font-size: 14px; font-weight: 600; margin:0;">${m.placas}</p></div>
                            <div><small style="color: var(--text-muted); font-size: 12px; display: block; margin-bottom: 4px;">Fecha</small><p style="font-size: 14px; margin:0;">${m.fecha}</p></div>
                            <div style="grid-column: span 2;"><small style="color: var(--text-muted); font-size: 12px; display: block; margin-bottom: 4px;">Detalle de los Trabajos</small><p style="font-size: 14px; margin:0;">${m.detalle}</p></div>
                        </div>
                        <div style="text-align:center; padding: 12px; background-color: #f9fafb; border-radius: 6px; font-size: 14px; color: var(--text-muted);">${linkFactura}</div>
                    `;
                    modalVisor.classList.add('active');
                }
            });
        });

        // EDITAR REGISTRO (LA NUEVA MAGIA)
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const m = mantenimientos.find(x => x.id == id);
                if (m) {
                    formMantenimiento.reset();
                    
                    // Inyectamos un input oculto para pasar el ID sin tocar el HTML del usuario
                    let hiddenId = formMantenimiento.querySelector('input[name="id_mantenimiento"]');
                    if(!hiddenId) {
                        hiddenId = document.createElement('input');
                        hiddenId.type = 'hidden';
                        hiddenId.name = 'id_mantenimiento';
                        formMantenimiento.appendChild(hiddenId);
                    }
                    hiddenId.value = m.id;

                    // Llenamos los datos
                    if (formMantenimiento.querySelector('[name="id_vehiculo"]')) formMantenimiento.querySelector('[name="id_vehiculo"]').value = m.id_vehiculo;
                    if (formMantenimiento.querySelector('[name="fecha"]')) formMantenimiento.querySelector('[name="fecha"]').value = m.fecha;
                    if (formMantenimiento.querySelector('[name="tipo"]')) formMantenimiento.querySelector('[name="tipo"]').value = m.tipo;
                    if (formMantenimiento.querySelector('[name="costo_total"]')) formMantenimiento.querySelector('[name="costo_total"]').value = m.costo_total;
                    if (formMantenimiento.querySelector('[name="detalle"]')) formMantenimiento.querySelector('[name="detalle"]').value = m.detalle;
                    
                    // Ajuste inteligente para el select de estado
                    const est = m.estado.toLowerCase();
                    const selectEstado = formMantenimiento.querySelector('[name="estado"]');
                    if (selectEstado) {
                        if(est.includes('taller') || est.includes('proceso')) selectEstado.value = 'En Taller';
                        else if(est.includes('completado') || est.includes('listo') || est.includes('terminado')) selectEstado.value = 'Completado';
                        else selectEstado.value = m.estado; // Fallback
                    }

                    // Cambiamos el título del modal
                    const modalTitle = document.querySelector('#modal-mantenimiento .modal-header h2');
                    if(modalTitle) modalTitle.innerText = 'Editar Servicio';
                    
                    if(btnGuardar) btnGuardar.innerText = 'Actualizar Servicio';
                    
                    modalMantenimiento.classList.add('active');
                }
            });
        });

        // ELIMINAR
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Seguro que deseas eliminar este registro de mantenimiento?')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/mantenimiento.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
                        const result = await res.json();
                        if (result.success) cargarMantenimientos(); else alert(result.message);
                    } catch (err) { alert('Error al intentar eliminar.'); }
                }
            });
        });

        // COMPLETAR
        document.querySelectorAll('.btn-completar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Marcar este servicio como Completado?\n\nEl vehículo se liberará y volverá a estar "Activo" en tu plataforma.')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/mantenimiento.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, estado: 'Completado' }) });
                        const result = await res.json();
                        if (result.success) cargarMantenimientos(); else alert('❌ Error: ' + result.message);
                    } catch (err) { alert('❌ Error de conexión al servidor.'); }
                }
            });
        });
    };

    // --- GUARDAR (NUEVO Y EDICIÓN) ---
    if(btnGuardar && formMantenimiento) {
        btnGuardar.addEventListener('click', async (e) => {
            e.preventDefault(); 
            const formData = new FormData(formMantenimiento);
            
            if (!formData.get('id_vehiculo') || !formData.get('fecha') || !formData.get('tipo') || !formData.get('costo_total') || !formData.get('estado')) {
                alert("Por favor, rellena todos los campos obligatorios."); return;
            }

            const textoOriginal = btnGuardar.innerText;
            btnGuardar.innerText = "Guardando..."; 
            btnGuardar.disabled = true;

            try {
                const res = await fetch('/Back-end/cliente/mantenimiento.php', { method: 'POST', body: formData });
                const result = await res.json();
                
                if (result.success) {
                    if(modalMantenimiento) modalMantenimiento.classList.remove('active');
                    formMantenimiento.reset();
                    cargarMantenimientos(); 
                } else alert('❌ Error: ' + result.message);
            } catch (err) { alert('❌ Error de red al intentar guardar.'); } 
            finally { btnGuardar.innerText = textoOriginal; btnGuardar.disabled = false; }
        });
    }

    // --- FILTROS DE BÚSQUEDA ---
    const btnBuscar = document.getElementById('btn-buscar-filtros');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');

    if(btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            const fInicio = document.getElementById('filtro-fecha-inicio') ? document.getElementById('filtro-fecha-inicio').value : '';
            const fFin = document.getElementById('filtro-fecha-fin') ? document.getElementById('filtro-fecha-fin').value : '';
            const fPlacas = document.getElementById('filtro-placas') ? document.getElementById('filtro-placas').value.toLowerCase() : '';

            const filtrados = mantenimientos.filter(m => {
                let pasa = true;
                if (fInicio && m.fecha < fInicio) pasa = false;
                if (fFin && m.fecha > fFin) pasa = false;
                if (fPlacas && !m.placas.toLowerCase().includes(fPlacas)) pasa = false;
                return pasa;
            });
            renderizarTabla(filtrados);
        });
    }

    if(btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if(document.getElementById('filtro-fecha-inicio')) document.getElementById('filtro-fecha-inicio').value = '';
            if(document.getElementById('filtro-fecha-fin')) document.getElementById('filtro-fecha-fin').value = '';
            if(document.getElementById('filtro-placas')) document.getElementById('filtro-placas').value = '';
            renderizarTabla(mantenimientos);
        });
    }

    // --- ABRIR Y CERRAR MODALES ---
    const btnAbrir = document.getElementById('btn-abrir-mantenimiento') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Registrar Servicio'));
    const btnCerrar = document.getElementById('btn-cerrar-mantenimiento') || document.querySelector('#modal-mantenimiento .btn-close');
    const btnCancelar = document.getElementById('btn-cancelar-mantenimiento') || document.querySelector('#modal-mantenimiento .btn-secondary');
    
    const btnCerrarVisor = document.getElementById('btn-cerrar-visor') || document.querySelector('#modal-visor .btn-close');
    const btnEntendidoVisor = document.getElementById('btn-entendido-visor') || document.querySelector('#modal-visor .btn-secondary');

    if(btnAbrir) btnAbrir.addEventListener('click', () => { 
        if(formMantenimiento) {
            formMantenimiento.reset(); 
            // Limpiamos el ID oculto para que el sistema sepa que es un Nuevo Registro
            const hiddenId = formMantenimiento.querySelector('input[name="id_mantenimiento"]');
            if(hiddenId) hiddenId.value = '';
            
            const modalTitle = document.querySelector('#modal-mantenimiento .modal-header h2');
            if(modalTitle) modalTitle.innerText = 'Registrar Servicio de Mantenimiento';
            if(btnGuardar) btnGuardar.innerText = 'Guardar Servicio';
        }
        if(modalMantenimiento) modalMantenimiento.classList.add('active'); 
    });
    
    if(btnCerrar) btnCerrar.addEventListener('click', () => { if(modalMantenimiento) modalMantenimiento.classList.remove('active'); });
    if(btnCancelar) btnCancelar.addEventListener('click', (e) => { e.preventDefault(); if(modalMantenimiento) modalMantenimiento.classList.remove('active'); });
    if(btnCerrarVisor) btnCerrarVisor.addEventListener('click', () => { if(modalVisor) modalVisor.classList.remove('active'); });
    if(btnEntendidoVisor) btnEntendidoVisor.addEventListener('click', () => { if(modalVisor) modalVisor.classList.remove('active'); });

    cargarVehiculosParaSelect();
    cargarMantenimientos();
});