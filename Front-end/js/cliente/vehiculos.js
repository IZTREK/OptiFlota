document.addEventListener('DOMContentLoaded', () => {
    let vehiculos = [];
    let excelData = [];
    let excelHeaders = [];

    // Elementos DOM
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal');
    const btnGuardarVehiculo = document.getElementById('btn-guardar-vehiculo');
    const modalVehiculo = document.getElementById('modal-vehiculo');
    const formVehiculo = document.getElementById('form-vehiculo');
    const tableBody = document.querySelector('.data-table tbody');

    // Elementos DOM - Importación
    const modalImportar = document.getElementById('modal-importar');
    const btnAbrirImportar = document.getElementById('btn-abrir-importar');
    const btnCerrarImportar = document.getElementById('btn-cerrar-importar');
    const btnVolverImportar = document.getElementById('btn-volver-importar');
    const btnSiguienteMapeo = document.getElementById('btn-siguiente-mapeo');
    const btnProcesarArchivo = document.getElementById('btn-procesar-archivo');

    const cargarVehiculos = async () => {
        try {
            const res = await fetch('/Back-end/cliente/vehiculos.php');
            vehiculos = await res.json();
            renderizarTabla(vehiculos);
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión.</td></tr>';
        }
    };

    const formatearEstado = (estado) => {
        estado = estado.toLowerCase();
        if (estado === 'activo') return '<span class="badge ok">Activo</span>';
        if (estado === 'en taller' || estado === 'taller') return '<span class="badge warning">En Taller</span>';
        if (estado === 'inactivo') return '<span class="badge danger" style="background:#fee2e2; color:#b91c1c;">Baja / Inactivo</span>';
        return `<span class="badge">${estado}</span>`;
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay vehículos registrados que coincidan con la búsqueda.</td></tr>';
            return;
        }

        datos.forEach(v => {
            // Estilo visual si está inactivo
            const rowStyle = v.estado.toLowerCase() === 'inactivo' ? 'opacity: 0.6; background-color: #f9fafb;' : '';
            
            const tr = document.createElement('tr');
            tr.style = rowStyle;
            tr.innerHTML = `
                <td><strong>${v.placas}</strong></td>
                <td>${v.marca_modelo}</td>
                <td>${v.anio}</td>
                <td>${parseInt(v.kilometraje_actual).toLocaleString('es-MX')} km</td>
                <td>${formatearEstado(v.estado)}</td>
                <td class="actions">
                    <button class="btn-icon edit btn-editar" data-id="${v.id_vehiculo}" title="Editar vehículo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon delete btn-eliminar" data-id="${v.id_vehiculo}" title="Dar de baja">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5M14 11v5"></path></svg>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Evento Editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const v = vehiculos.find(x => x.id_vehiculo == id);
                if(v) {
                    document.getElementById('titulo-modal-vehiculo').innerText = 'Editar Vehículo';
                    document.getElementById('id_vehiculo').value = v.id_vehiculo;
                    document.getElementById('input-placas').value = v.placas;
                    document.getElementById('input-anio').value = v.anio;
                    document.getElementById('input-marca').value = v.marca_modelo;
                    document.getElementById('input-km').value = v.kilometraje_actual;
                    
                    // 🔥 Mapeo inteligente del estado al editar
                    const est = v.estado.toLowerCase();
                    if(est.includes('taller')) document.getElementById('input-estado').value = 'En Taller';
                    else if(est.includes('inactivo')) document.getElementById('input-estado').value = 'Inactivo';
                    else document.getElementById('input-estado').value = 'Activo';
                    
                    modalVehiculo.classList.add('active');
                }
            });
        });

        // Evento Eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('¿Seguro que deseas dar de baja este vehículo? (Pasará a estado Inactivo)')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/vehiculos.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_vehiculo: id }) });
                        const result = await res.json();
                        if (result.success) cargarVehiculos();
                        else alert(result.message);
                    } catch (error) { alert('Error de conexión.'); }
                }
            });
        });
    };

    // --- REGISTRO Y EDICIÓN MANUAL ---
    btnAbrirModal.addEventListener('click', () => { 
        formVehiculo.reset(); 
        document.getElementById('id_vehiculo').value = '';
        document.getElementById('input-estado').value = 'Activo';
        document.getElementById('titulo-modal-vehiculo').innerText = 'Añadir Nuevo Vehículo';
        modalVehiculo.classList.add('active'); 
    });
    btnCerrarModal.addEventListener('click', () => { modalVehiculo.classList.remove('active'); });
    btnCancelarModal.addEventListener('click', () => { modalVehiculo.classList.remove('active'); });

    btnGuardarVehiculo.addEventListener('click', async () => {
        const formData = new FormData(formVehiculo);
        const data = Object.fromEntries(formData.entries());

        if (!data.placas || !data.anio || !data.marca_modelo || !data.kilometraje_inicial) {
            alert('Por favor, llena todos los campos obligatorios.'); return;
        }

        const isEdit = !!data.id_vehiculo;
        const method = isEdit ? 'PUT' : 'POST';

        btnGuardarVehiculo.innerText = 'Guardando...'; btnGuardarVehiculo.disabled = true;
        try {
            const response = await fetch('/Back-end/cliente/vehiculos.php', { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (result.success) { modalVehiculo.classList.remove('active'); cargarVehiculos(); } 
            else { alert(result.message); }
        } catch (error) { alert('Error de conexión al servidor.'); } 
        finally { btnGuardarVehiculo.innerText = 'Guardar Vehículo'; btnGuardarVehiculo.disabled = false; }
    });

    // --- LÓGICA DE FILTROS EN LA TABLA ---
    const btnBuscarFiltros = document.querySelector('.filter-actions .btn-primary');
    const btnLimpiarFiltros = document.querySelector('.filter-actions .btn-secondary');

    if (btnBuscarFiltros) {
        btnBuscarFiltros.addEventListener('click', () => {
            const fPlacas = document.getElementById('filtro-placas').value.toLowerCase();
            const fAnio = document.getElementById('filtro-anio').value;
            const fEstado = document.getElementById('filtro-estado').value.toLowerCase();

            const filtrados = vehiculos.filter(v => {
                let pasa = true;
                // Busca coincidencias tanto en las placas como en el modelo
                if (fPlacas && !v.placas.toLowerCase().includes(fPlacas) && !v.marca_modelo.toLowerCase().includes(fPlacas)) pasa = false;
                if (fAnio && v.anio != fAnio) pasa = false;
                // Busca coincidencia exacta con el select de estado
                if (fEstado && !v.estado.toLowerCase().includes(fEstado)) pasa = false;
                return pasa;
            });
            renderizarTabla(filtrados);
        });
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', () => {
            document.getElementById('filtro-placas').value = '';
            document.getElementById('filtro-anio').value = '';
            document.getElementById('filtro-estado').value = '';
            renderizarTabla(vehiculos); // Restaura la tabla original
        });
    }

    // --- IMPORTACIÓN EXCEL / CSV ---
    btnAbrirImportar.addEventListener('click', () => {
        document.getElementById('archivo-excel-veh').value = '';
        btnVolverImportar.click();
        modalImportar.classList.add('active');
    });
    btnCerrarImportar.addEventListener('click', () => modalImportar.classList.remove('active'));

    btnSiguienteMapeo.addEventListener('click', () => {
        const inputArchivo = document.getElementById('archivo-excel-veh');
        if (inputArchivo.files.length === 0) { alert('Sube un archivo de Excel o CSV.'); return; }

        const file = inputArchivo.files[0];
        const reader = new FileReader();
        btnSiguienteMapeo.innerText = "Leyendo archivo..."; btnSiguienteMapeo.disabled = true;

        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false});
            
            if(jsonData.length < 2) { alert('El archivo está vacío.'); btnSiguienteMapeo.innerText = "Analizar Archivo"; btnSiguienteMapeo.disabled = false; return; }
            
            excelHeaders = jsonData[0];
            jsonData.shift();
            excelData = jsonData.filter(row => row.length > 0);

            document.querySelectorAll('.select-mapeo-veh').forEach(select => {
                const tipo = select.dataset.type;
                select.innerHTML = '<option value="">-- Opcional / Por defecto --</option>';
                
                excelHeaders.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index; option.text = header;
                    select.appendChild(option);

                    const ht = header.toLowerCase();
                    if(tipo === 'placas' && (ht.includes('placa') || ht.includes('matr'))) select.value = index;
                    if(tipo === 'marca' && (ht.includes('marca') || ht.includes('modelo') || ht.includes('veh'))) select.value = index;
                    if(tipo === 'anio' && (ht.includes('año') || ht.includes('anio') || ht.includes('year'))) select.value = index;
                    if(tipo === 'km' && (ht.includes('km') || ht.includes('kilom') || ht.includes('odome'))) select.value = index;
                    if(tipo === 'estado' && (ht.includes('estado') || ht.includes('status'))) select.value = index;
                });
            });

            document.getElementById('paso-1-importacion').style.display = 'none';
            document.getElementById('paso-2-mapeo').style.display = 'block';
            btnVolverImportar.style.display = 'block';
            btnProcesarArchivo.style.display = 'block';
            btnSiguienteMapeo.style.display = 'none';
            btnSiguienteMapeo.innerText = "Analizar Archivo"; btnSiguienteMapeo.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    });

    btnVolverImportar.addEventListener('click', () => {
        document.getElementById('paso-1-importacion').style.display = 'block';
        document.getElementById('paso-2-mapeo').style.display = 'none';
        btnVolverImportar.style.display = 'none';
        btnProcesarArchivo.style.display = 'none';
        btnSiguienteMapeo.style.display = 'block';
        document.getElementById('archivo-excel-veh').value = '';
    });

    btnProcesarArchivo.addEventListener('click', async () => {
        const iPlacas = document.getElementById('map-placas').value;
        const iMarca = document.getElementById('map-marca').value;
        const iAnio = document.getElementById('map-anio').value;
        const iKm = document.getElementById('map-km').value;
        const iEstado = document.getElementById('map-estado').value;

        if(!iPlacas || !iMarca) {
            alert("Las Placas y la Marca/Modelo son columnas obligatorias."); return;
        }

        const payload = excelData.map(row => ({
            placas: row[iPlacas] ? String(row[iPlacas]) : '',
            marca_modelo: row[iMarca] ? String(row[iMarca]) : '',
            anio: iAnio && row[iAnio] ? row[iAnio] : new Date().getFullYear(),
            kilometraje: iKm && row[iKm] ? parseFloat(String(row[iKm]).replace(/[^0-9.]/g, '')) : 0,
            estado: iEstado && row[iEstado] ? String(row[iEstado]) : 'Activo'
        })).filter(item => item.placas && item.marca_modelo);

        btnProcesarArchivo.innerText = "Importando..."; btnProcesarArchivo.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/vehiculos.php?action=importar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            if(result.success) {
                let mensaje = `✅ Se registraron ${result.exitos} vehículos nuevos.\n`;
                if(result.duplicados > 0) mensaje += `⚠️ Se ignoraron ${result.duplicados} vehículos que ya estaban registrados.\n`;
                alert(mensaje);
                modalImportar.classList.remove('active');
                cargarVehiculos();
            } else {
                alert(result.message || 'Error en el servidor.');
            }
        } catch (e) { alert("Error conectando al servidor."); } 
        finally { btnProcesarArchivo.innerText = "Importar a Base de Datos"; btnProcesarArchivo.disabled = false; }
    });

    cargarVehiculos();
});