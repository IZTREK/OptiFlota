document.addEventListener('DOMContentLoaded', () => {
    let todasLasCargas = [];

    // Referencias DOM
    const tableBody = document.querySelector('.data-table tbody');
    const modalCombustible = document.getElementById('modal-combustible');
    const formCombustible = document.getElementById('form-combustible-datos');
    const modalVisor = document.getElementById('modal-visor');
    const selectVehiculoModal = document.getElementById('vehiculo-carga');

    // --- 1. CARGAR VEHÍCULOS PARA EL SELECT ---
    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php?action=get_vehiculos');
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
    const cargarCargas = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php');
            todasLasCargas = await res.json();
            renderizarTabla(todasLasCargas);
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
        }
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros de combustible.</td></tr>';
            return;
        }

        datos.forEach(d => {
            // Dar formato a dinero y litros
            const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
            const litrosF = parseFloat(d.litros).toFixed(2) + ' L';
            const kmF = parseInt(d.odometro).toLocaleString('es-MX') + ' km';
            
            tableBody.innerHTML += `
                <tr>
                    <td>${d.fecha}</td>
                    <td><strong>${d.placas}</strong></td>
                    <td>${litrosF}</td>
                    <td>${costoF}</td>
                    <td>${kmF}</td>
                    <td>${d.estacion}</td>
                    <td class="actions">
                        <button class="btn-icon btn-ver" title="Ver detalle y ticket" data-id="${d.id}">
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

    // --- 3. GUARDAR NUEVA CARGA (POST CON ARCHIVO) ---
    document.getElementById('btn-guardar-combustible').addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Usamos FormData porque enviamos un archivo (foto del ticket)
        const formData = new FormData(formCombustible);

        if (!formData.get('id_vehiculo') || !formData.get('fecha') || !formData.get('litros') || !formData.get('costo_total') || !formData.get('odometro')) {
            alert("Rellena todos los campos obligatorios."); return;
        }

        const btnGuardar = document.getElementById('btn-guardar-combustible');
        btnGuardar.innerText = "Guardando..."; btnGuardar.disabled = true;

        try {
            // NOTA: Cuando se use FormData no se debe poner 'Content-Type': 'application/json'
            const res = await fetch('/Back-end/cliente/combustible.php', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            
            if (result.success) {
                modalCombustible.classList.remove('active');
                cargarCargas(); // Recargar tabla
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('Error de conexión.');
        } finally {
            btnGuardar.innerText = "Guardar Registro"; btnGuardar.disabled = false;
        }
    });

    // --- 4. EVENTOS DE LA TABLA ---
    const asignarEventosBotones = () => {
        // VER DETALLE
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const d = todasLasCargas.find(x => x.id == id);
                
                const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
                const linkTicket = d.comprobante_url 
                    ? `<a href="/Back-end${d.comprobante_url}" target="_blank" style="color:var(--primary-color); font-weight:bold; text-decoration:underline;">📄 Ver Foto del Ticket</a>` 
                    : `<span style="color:var(--text-muted);">Sin comprobante adjunto</span>`;

                document.getElementById('visor-titulo').innerText = "Ticket de Combustible";
                document.getElementById('visor-contenido').innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h3 style="color: var(--primary-color); font-size: 24px;">${costoF}</h3>
                        <p style="color: var(--text-muted);">Cargado: ${parseFloat(d.litros).toFixed(2)} L</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding-top: 15px; border-top: 1px dashed #d1d5db;">
                        <div><small style="color: var(--text-muted);">Vehículo</small><p><strong>${d.placas}</strong></p></div>
                        <div><small style="color: var(--text-muted);">Fecha</small><p>${d.fecha}</p></div>
                        <div><small style="color: var(--text-muted);">Odómetro</small><p>${d.odometro} km</p></div>
                        <div><small style="color: var(--text-muted);">Estación</small><p>${d.estacion}</p></div>
                    </div>
                    <div style="text-align:center; margin-top: 20px; padding: 10px; background-color: #f9fafb; border-radius: 6px;">
                        ${linkTicket}
                    </div>
                `;
                modalVisor.classList.add('active');
            });
        });

        // ELIMINAR
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Seguro que deseas eliminar este registro?')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/combustible.php', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: id })
                        });
                        const result = await res.json();
                        if (result.success) cargarCargas();
                        else alert(result.message);
                    } catch (err) {
                        alert('Error al intentar eliminar.');
                    }
                }
            });
        });
    };

    // --- MANEJO DE MODALES UI ---
    document.getElementById('btn-abrir-combustible').addEventListener('click', () => {
        formCombustible.reset();
        modalCombustible.classList.add('active');
    });
    document.getElementById('btn-cerrar-combustible').addEventListener('click', () => modalCombustible.classList.remove('active'));
    document.getElementById('btn-cancelar-combustible').addEventListener('click', () => modalCombustible.classList.remove('active'));
    document.getElementById('btn-cerrar-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    document.getElementById('btn-entendido-visor').addEventListener('click', () => modalVisor.classList.remove('active'));

    // Modal Importar Inteligente (Solo UI, sin lógica backend por ahora)
    const modalImportar = document.getElementById('modal-importar');
    document.getElementById('btn-abrir-importar').addEventListener('click', () => modalImportar.classList.add('active'));
    document.getElementById('btn-cerrar-importar').addEventListener('click', () => modalImportar.classList.remove('active'));
    document.getElementById('btn-volver-importar').addEventListener('click', () => {
        document.getElementById('paso-1-importacion').style.display = 'block';
        document.getElementById('paso-2-mapeo').style.display = 'none';
        document.getElementById('footer-mapeo').style.display = 'none';
    });
    document.getElementById('btn-siguiente-mapeo').addEventListener('click', () => {
        document.getElementById('paso-1-importacion').style.display = 'none';
        document.getElementById('paso-2-mapeo').style.display = 'block';
        document.getElementById('footer-mapeo').style.display = 'flex';
    });
    document.getElementById('btn-procesar-archivo').addEventListener('click', () => {
        modalImportar.classList.remove('active');
        alert('Esta función se conectará en el siguiente módulo. ¡Gracias por probar la interfaz!');
    });

    // Arranque
    cargarVehiculosParaSelect();
    cargarCargas();
});