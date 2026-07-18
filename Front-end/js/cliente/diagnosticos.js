document.addEventListener('DOMContentLoaded', () => {
    let todosLosDiagnosticos = [];
    let idEditando = null;

    // Referencias DOM
    const tableBody = document.querySelector('.data-table tbody');
    const modalDiag = document.getElementById('modal-diagnostico');
    const formDiag = modalDiag.querySelector('.data-form');
    const modalVisor = document.getElementById('modal-visor');
    const selectVehiculoModal = document.getElementById('vehiculo-diag');
    const modalTitle = document.querySelector('#modal-diagnostico .modal-header h2');

    // Referencias Filtros
    const inputFiltroFecha = document.getElementById('filtro-fecha');
    const inputFiltroPlacas = document.getElementById('filtro-placas');
    const selectFiltroSalud = document.getElementById('filtro-salud');
    const btnBuscar = document.querySelector('.filter-actions .btn-primary');
    const btnLimpiar = document.querySelector('.filter-actions .btn-secondary');

    // --- 1. CARGAR SELECT DE VEHÍCULOS ---
    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/diagnosticos.php?action=get_vehiculos');
            const vehiculos = await res.json();
            
            selectVehiculoModal.innerHTML = '<option value="" disabled selected>Seleccione una unidad...</option>';
            vehiculos.forEach(v => {
                selectVehiculoModal.innerHTML += `<option value="${v.id_vehiculo}">${v.placas} (${v.marca_modelo})</option>`;
            });
        } catch (e) {
            console.error("Error al cargar vehículos:", e);
        }
    };

    // --- 2. CARGAR Y PINTAR DIAGNÓSTICOS ---
    const cargarDiagnosticos = async () => {
        try {
            const res = await fetch('/Back-end/cliente/diagnosticos.php');
            todosLosDiagnosticos = await res.json();
            renderizarTabla(todosLosDiagnosticos);
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
        }
    };

    const formatearSalud = (salud) => {
        switch(salud) {
            case 'optimo': return '<span class="badge ok" style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:12px; font-size:12px;">Óptimo (Verde)</span>';
            case 'regular': return '<span class="badge warning" style="background:#fef3c7; color:#92400e; padding:4px 8px; border-radius:12px; font-size:12px;">Regular (Amarillo)</span>';
            case 'critico': return '<span class="badge danger" style="background:#fee2e2; color:#991b1b; padding:4px 8px; border-radius:12px; font-size:12px;">Crítico (Rojo)</span>';
            default: return `<span class="badge" style="background:#f3f4f6; color:#374151; padding:4px 8px; border-radius:12px; font-size:12px;">${salud}</span>`;
        }
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay evaluaciones registradas.</td></tr>';
            return;
        }

        // Definición de SVGs unificados (16x16)
        const svgOjo = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const svgEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const svgTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5M14 11v5"></path></svg>`;

        datos.forEach(d => {
            const obsCortas = d.observaciones ? (d.observaciones.length > 40 ? d.observaciones.substring(0,40)+'...' : d.observaciones) : 'Ninguna';
            
            // Botones estilizados para mantener tamaño y alineación exacta
            const btnVerHTML = `<button class="btn-icon btn-ver" title="Ver detalle" data-id="${d.id}" style="color:var(--text-main); display:inline-flex; align-items:center; justify-content:center;">${svgOjo}</button>`;
            const btnEditarHTML = `<button class="btn-icon btn-editar" title="Corregir (Editar)" data-id="${d.id}" style="color:var(--text-main); display:inline-flex; align-items:center; justify-content:center;">${svgEdit}</button>`;
            const btnEliminarHTML = `<button class="btn-icon delete btn-eliminar" title="Eliminar" data-id="${d.id}" style="display:inline-flex; align-items:center; justify-content:center;">${svgTrash}</button>`;

            tableBody.innerHTML += `
                <tr>
                    <td>${d.fecha}</td>
                    <td><strong>${d.placas}</strong> (${d.marca_modelo})</td>
                    <td>${d.evaluador}</td>
                    <td>${formatearSalud(d.salud_general)}</td>
                    <td>${obsCortas}</td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
                            ${btnVerHTML}
                            ${btnEditarHTML}
                            ${btnEliminarHTML}
                        </div>
                    </td>
                </tr>
            `;
        });
        asignarEventosBotones();
    };

    // --- 3. FILTROS ---
    btnBuscar.addEventListener('click', () => {
        const pFecha = inputFiltroFecha.value; // Formato YYYY-MM
        const pPlacas = inputFiltroPlacas.value.toLowerCase();
        const pSalud = selectFiltroSalud.value;

        const filtrados = todosLosDiagnosticos.filter(d => {
            const matchFecha = pFecha ? d.fecha.startsWith(pFecha) : true;
            const matchPlacas = d.placas.toLowerCase().includes(pPlacas) || d.marca_modelo.toLowerCase().includes(pPlacas);
            const matchSalud = pSalud ? d.salud_general === pSalud : true;
            return matchFecha && matchPlacas && matchSalud;
        });
        renderizarTabla(filtrados);
    });

    btnLimpiar.addEventListener('click', () => {
        inputFiltroFecha.value = ''; inputFiltroPlacas.value = ''; selectFiltroSalud.value = '';
        renderizarTabla(todosLosDiagnosticos);
    });

    // --- 4. GUARDAR / EDITAR (POST / PUT) ---
    document.getElementById('btn-guardar-diagnostico').addEventListener('click', async () => {
        const data = {
            id_vehiculo: document.getElementById('vehiculo-diag').value,
            fecha: document.getElementById('fecha-diag').value,
            evaluador: document.getElementById('evaluador').value,
            salud_general: document.getElementById('salud').value,
            observaciones: document.getElementById('observaciones').value
        };

        if (!data.id_vehiculo || !data.fecha || !data.evaluador || !data.salud_general) {
            alert("Rellena todos los campos obligatorios."); return;
        }

        const method = idEditando ? 'PUT' : 'POST';
        if (idEditando) data.id = idEditando;

        try {
            const res = await fetch('/Back-end/cliente/diagnosticos.php', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if (result.success) {
                modalDiag.classList.remove('active');
                cargarDiagnosticos();
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert('Error de conexión.');
        }
    });

    // --- 5. EVENTOS DINÁMICOS DE TABLA ---
    const asignarEventosBotones = () => {
        // VER
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const d = todosLosDiagnosticos.find(x => x.id == id);
                document.getElementById('visor-titulo').innerText = "Detalle del Diagnóstico";
                document.getElementById('visor-contenido').innerHTML = `
                    <div class="responsive-grid" style="">
                        <div><small style="color: var(--text-muted);">Vehículo</small><p><strong>${d.placas}</strong> (${d.marca_modelo})</p></div>
                        <div><small style="color: var(--text-muted);">Fecha</small><p>${d.fecha}</p></div>
                        <div><small style="color: var(--text-muted);">Evaluador</small><p>${d.evaluador}</p></div>
                        <div><small style="color: var(--text-muted);">Estado</small><p>${formatearSalud(d.salud_general)}</p></div>
                    </div>
                    <div style="background: #f9fafb; padding: 15px; margin-top: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <small style="color: var(--text-muted);">Observaciones del taller</small>
                        <p style="margin-top: 5px;">${d.observaciones || 'Sin observaciones'}</p>
                    </div>`;
                modalVisor.classList.add('active');
            });
        });

        // EDITAR
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const d = todosLosDiagnosticos.find(x => x.id == id);
                
                idEditando = id;
                modalTitle.innerText = "Corregir Evaluación";
                
                document.getElementById('vehiculo-diag').value = d.id_vehiculo;
                document.getElementById('vehiculo-diag').disabled = true; // No permitir cambiar vehículo por seguridad
                document.getElementById('fecha-diag').value = d.fecha;
                document.getElementById('evaluador').value = d.evaluador;
                document.getElementById('salud').value = d.salud_general;
                document.getElementById('observaciones').value = d.observaciones;
                
                modalDiag.classList.add('active');
            });
        });

        // ELIMINAR
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Seguro que deseas eliminar esta evaluación permanentemente?')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/diagnosticos.php', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: id })
                        });
                        const result = await res.json();
                        if (result.success) cargarDiagnosticos();
                        else alert(result.message);
                    } catch (err) {
                        alert('Error al intentar eliminar.');
                    }
                }
            });
        });
    };

    // Manejo de Modales Básicos
    document.getElementById('btn-abrir-modal').addEventListener('click', () => {
        idEditando = null;
        formDiag.reset();
        document.getElementById('vehiculo-diag').disabled = false;
        modalTitle.innerText = "Registrar Evaluación";
        modalDiag.classList.add('active');
    });

    document.getElementById('btn-cerrar-modal').addEventListener('click', () => modalDiag.classList.remove('active'));
    document.getElementById('btn-cancelar-modal').addEventListener('click', () => modalDiag.classList.remove('active'));
    document.getElementById('btn-cerrar-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    document.getElementById('btn-entendido-visor').addEventListener('click', () => modalVisor.classList.remove('active'));

    // Arranque
    cargarVehiculosParaSelect();
    cargarDiagnosticos();
});