document.addEventListener('DOMContentLoaded', () => {
    // Variables globales para manejar filtros y edición
    let todosLosVehiculos = []; 
    let idVehiculoEditando = null;

    // Referencias al DOM
    const modalVehiculo = document.getElementById('modal-vehiculo');
    const formVehiculo = document.getElementById('form-vehiculo');
    const tableBody = document.querySelector('.data-table tbody');
    const modalTitle = document.querySelector('#modal-vehiculo .modal-header h2');
    
    // Referencias de Filtros
    const inputFiltroPlacas = document.getElementById('filtro-placas');
    const inputFiltroAnio = document.getElementById('filtro-anio');
    const selectFiltroEstado = document.getElementById('filtro-estado');
    const btnBuscar = document.querySelector('.filter-actions .btn-primary');
    const btnLimpiar = document.querySelector('.filter-actions .btn-secondary');

    const abrirModal = () => modalVehiculo.classList.add('active');
    const cerrarModal = () => {
        modalVehiculo.classList.remove('active');
        formVehiculo.reset();
        idVehiculoEditando = null;
        document.getElementById('kilometraje').disabled = false; // Reactivar input si fue bloqueado
    };

    // --- 1. CARGAR DATOS DESDE LA BD ---
    const cargarVehiculos = async () => {
        try {
            const response = await fetch('/Back-end/cliente/vehiculos.php');
            todosLosVehiculos = await response.json();
            renderizarTabla(todosLosVehiculos);
        } catch (error) {
            console.error('Error al cargar:', error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
        }
    };

    // --- 2. PINTAR LA TABLA DINÁMICAMENTE ---
    const renderizarTabla = (vehiculos) => {
        tableBody.innerHTML = '';

        if (vehiculos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No se encontraron vehículos.</td></tr>';
            return;
        }

        vehiculos.forEach(v => {
            const km = parseInt(v.kilometraje_actual).toLocaleString('es-MX');
            let badgeClass = v.estado.toLowerCase() === 'activo' ? 'ok' : (v.estado.toLowerCase() === 'en taller' ? 'warning' : 'danger');

            tableBody.innerHTML += `
                <tr>
                    <td><strong>${v.placas}</strong></td>
                    <td>${v.marca_modelo}</td>
                    <td>${v.anio}</td>
                    <td>${km} km</td>
                    <td><span class="badge ${badgeClass}">${v.estado}</span></td>
                    <td class="actions">
                        <button class="btn-icon btn-editar" title="Editar" data-id="${v.id_vehiculo}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"></path><path d="M13 6 17 10"></path></svg>
                        </button>
                        <button class="btn-icon delete btn-eliminar" title="Dar de baja" data-id="${v.id_vehiculo}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5M14 11v5"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        asignarEventosBotonesTabla();
    };

    // --- 3. FUNCIONALIDAD DE LOS FILTROS ---
    const aplicarFiltros = () => {
        const pPlacas = inputFiltroPlacas.value.toLowerCase();
        const pAnio = inputFiltroAnio.value;
        const pEstado = selectFiltroEstado.value.toLowerCase();

        const filtrados = todosLosVehiculos.filter(v => {
            const coincidePlacas = v.placas.toLowerCase().includes(pPlacas) || v.marca_modelo.toLowerCase().includes(pPlacas);
            const coincideAnio = pAnio ? v.anio == pAnio : true;
            const coincideEstado = pEstado ? v.estado.toLowerCase().includes(pEstado) : true;
            return coincidePlacas && coincideAnio && coincideEstado;
        });

        renderizarTabla(filtrados);
    };

    btnBuscar.addEventListener('click', aplicarFiltros);
    btnLimpiar.addEventListener('click', () => {
        inputFiltroPlacas.value = '';
        inputFiltroAnio.value = '';
        selectFiltroEstado.value = '';
        renderizarTabla(todosLosVehiculos);
    });

    // --- 4. CREAR O EDITAR VEHÍCULO (POST / PUT) ---
    document.getElementById('btn-guardar-vehiculo').addEventListener('click', async () => {
        const formData = new FormData(formVehiculo);
        const data = Object.fromEntries(formData.entries());

        if (!data.placas || !data.marca_modelo || !data.anio) {
            alert('Por favor, completa los campos obligatorios.');
            return;
        }

        const method = idVehiculoEditando ? 'PUT' : 'POST';
        if (idVehiculoEditando) data.id_vehiculo = idVehiculoEditando;

        try {
            const response = await fetch('/Back-end/cliente/vehiculos.php', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                cerrarModal();
                cargarVehiculos();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Error de conexión al guardar.');
        }
    });

    // --- 5. DELEGACIÓN DE EVENTOS PARA EDITAR Y ELIMINAR ---
    const asignarEventosBotonesTabla = () => {
        // Evento Editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const vehiculo = todosLosVehiculos.find(v => v.id_vehiculo == id);
                
                if(vehiculo) {
                    idVehiculoEditando = id;
                    modalTitle.innerText = 'Editar Vehículo';
                    
                    document.getElementById('placas').value = vehiculo.placas;
                    document.getElementById('marca').value = vehiculo.marca_modelo;
                    document.getElementById('anio').value = vehiculo.anio;
                    
                    // Al editar no se cambia el kilometraje desde aquí (se hace con las cargas de gas)
                    document.getElementById('kilometraje').value = vehiculo.kilometraje_actual;
                    document.getElementById('kilometraje').disabled = true; 

                    // Setear el estado correcto del select
                    const estadoVal = vehiculo.estado.toLowerCase().includes('activo') ? 'activo' : 'taller';
                    document.getElementById('estado').value = estadoVal;

                    abrirModal();
                }
            });
        });

        // Evento Eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if(confirm('¿Estás seguro de dar de baja este vehículo? Ya no aparecerá en los reportes activos.')) {
                    try {
                        const response = await fetch('/Back-end/cliente/vehiculos.php', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id_vehiculo: id })
                        });
                        const result = await response.json();
                        if (result.success) cargarVehiculos();
                        else alert(result.message);
                    } catch (error) {
                        alert('Error al intentar eliminar.');
                    }
                }
            });
        });
    };

    // Botón para abrir modal "Nuevo"
    document.getElementById('btn-abrir-modal').addEventListener('click', () => {
        modalTitle.innerText = 'Añadir Nuevo Vehículo';
        abrirModal();
    });

    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);
    
    // Carga inicial
    cargarVehiculos();
});