document.addEventListener('DOMContentLoaded', () => {
    let todasLasCargas = [];
    
    // Variables para la importación masiva con SheetJS
    let excelData = [];
    let excelHeaders = [];

    // Referencias al DOM
    const tableBody = document.querySelector('.data-table tbody');
    const modalCombustible = document.getElementById('modal-combustible');
    const formCombustible = document.getElementById('form-combustible-datos');
    const modalVisor = document.getElementById('modal-visor');
    const selectVehiculoModal = document.getElementById('vehiculo-carga');
    const modalImportar = document.getElementById('modal-importar');

    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php?action=get_vehiculos');
            const vehiculos = await res.json();
            selectVehiculoModal.innerHTML = '<option value="" disabled selected>Seleccione una unidad...</option>';
            vehiculos.forEach(v => {
                selectVehiculoModal.innerHTML += `<option value="${v.id_vehiculo}">${v.placas} (${v.marca_modelo})</option>`;
            });
        } catch (e) { 
            console.error("Error al cargar vehículos para el formulario"); 
        }
    };

    const actualizarDatalistEstaciones = () => {
        const datalist = document.getElementById('lista-estaciones');
        if(!datalist) return;
        
        const estacionesUnicas = [...new Set(todasLasCargas.map(c => c.estacion ? c.estacion.trim() : ''))].filter(e => e !== '');
        
        datalist.innerHTML = '';
        estacionesUnicas.forEach(est => {
            const option = document.createElement('option');
            option.value = est;
            datalist.appendChild(option);
        });
    };

    const cargarCargas = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php');
            todasLasCargas = await res.json();
            renderizarTabla(todasLasCargas);
            calcularKPIs(todasLasCargas); // Inicializa las tarjetas con el total de la flota
            actualizarDatalistEstaciones();
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión al cargar datos.</td></tr>`;
        }
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros para mostrar.</td></tr>';
            return;
        }

        datos.forEach(d => {
            const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
            const litrosF = parseFloat(d.litros).toFixed(2) + ' L';
            const kmF = parseInt(d.odometro).toLocaleString('es-MX') + ' km';
            
            const badgeExcel = d.origen_registro === 'Importacion_Excel' ? '<span class="badge" style="background:#e0e7ff; color:#1e40af; margin-left:8px; font-size:10px;">Excel</span>' : '';

            tableBody.innerHTML += `
                <tr>
                    <td>${d.fecha}</td>
                    <td><strong>${d.placas}</strong></td>
                    <td>${litrosF}</td>
                    <td>${costoF}</td>
                    <td>${kmF}</td>
                    <td>${d.estacion} ${badgeExcel}</td>
                    <td class="actions">
                        <button class="btn-icon btn-ver" title="Ver detalle" data-id="${d.id}">
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

    // --- INDICADORES DINÁMICOS BASADOS EN LOS DATOS FILTRADOS  ---
    const calcularKPIs = (cargasAAnalizar = todasLasCargas) => {
        const mesActual = new Date().toISOString().substring(0, 7); // Formato YYYY-MM
        let gastoMes = 0;

        // Agrupamos el subconjunto de datos por vehículo para ordenarlos cronológicamente
        const cargasPorVehiculo = {};
        cargasAAnalizar.forEach(c => {
            const vehiculo = c.placas;
            if (!cargasPorVehiculo[vehiculo]) {
                cargasPorVehiculo[vehiculo] = [];
            }
            cargasPorVehiculo[vehiculo].push({
                fecha: c.fecha,
                litros: parseFloat(c.litros) || 0,
                costo_total: parseFloat(c.costo_total) || 0,
                odometro: parseInt(c.odometro) || 0
            });
        });

        let totalKilometrosMes = 0;
        let totalLitrosMes = 0;

        // Calculamos las diferencias de odómetros dentro de la línea de tiempo de cada auto
        Object.keys(cargasPorVehiculo).forEach(vehiculo => {
            const listaCargas = cargasPorVehiculo[vehiculo];
            
            // Ordenamos por kilometraje para garantizar la coherencia cronológica
            listaCargas.sort((a, b) => a.odometro - b.odometro);

            for (let i = 0; i < listaCargas.length; i++) {
                const cargaActual = listaCargas[i];

                // Acumulamos el costo si pertenece al mes actual
                if (cargaActual.fecha && cargaActual.fecha.startsWith(mesActual)) {
                    gastoMes += cargaActual.costo_total;
                }

                // Necesitamos un punto de comparación anterior para calcular el kilometraje recorrido
                if (i > 0) {
                    const cargaAnterior = listaCargas[i - 1];
                    const kilometrosRecorridos = cargaActual.odometro - cargaAnterior.odometro;

                    // Si el viaje es lógico y la recarga actual pertenece al mes evaluado, sumamos al rendimiento
                    if (kilometrosRecorridos > 0 && cargaActual.fecha && cargaActual.fecha.startsWith(mesActual)) {
                        totalKilometrosMes += kilometrosRecorridos;
                        totalLitrosMes += cargaActual.litros;
                    }
                }
            }
        });

        // Cálculo definitivo de rendimiento
        const rendimientoPromedio = totalLitrosMes > 0 ? (totalKilometrosMes / totalLitrosMes) : 0;

        const kpiGasto = document.getElementById('kpi-gasto-mes');
        const kpiRend = document.getElementById('kpi-rendimiento');
        
        if (kpiGasto) {
            kpiGasto.innerText = '$' + gastoMes.toLocaleString('es-MX', { minimumFractionDigits: 2 });
        }
        if (kpiRend) {
            kpiRend.innerText = rendimientoPromedio > 0 
                ? rendimientoPromedio.toFixed(2) + ' km/L' 
                : '0.00 km/L';
        }
    };

    // --- REGISTRO MANUAL ---
    document.getElementById('btn-guardar-combustible').addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = new FormData(formCombustible);

        if (!formData.get('id_vehiculo') || !formData.get('fecha') || !formData.get('litros') || !formData.get('costo_total')) {
            alert("Rellena todos los campos obligatorios."); return;
        }
        const btnGuardar = document.getElementById('btn-guardar-combustible');
        btnGuardar.innerText = "Guardando..."; btnGuardar.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/combustible.php', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                modalCombustible.classList.remove('active');
                cargarCargas(); 
            } else alert(result.message);
        } catch (err) { alert('Error de conexión.'); } 
        finally { btnGuardar.innerText = "Guardar Registro"; btnGuardar.disabled = false; }
    });

    const asignarEventosBotones = () => {
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const d = todasLasCargas.find(x => x.id == id);
                const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
                const linkTicket = d.comprobante_url ? `<a href="/Back-end${d.comprobante_url}" target="_blank" style="color:var(--primary-color);">Ver Foto</a>` : `Sin comprobante adjunto`;

                document.getElementById('visor-titulo').innerText = "Ticket de Combustible";
                document.getElementById('visor-contenido').innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;"><h3 style="color: var(--primary-color); font-size: 24px;">${costoF}</h3><p style="color: var(--text-muted);">Cargado: ${parseFloat(d.litros).toFixed(2)} L</p></div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border-top: 1px dashed #d1d5db; padding-top:15px;">
                        <div><small>Vehículo</small><p><strong>${d.placas}</strong></p></div>
                        <div><small>Fecha</small><p>${d.fecha}</p></div>
                        <div><small>Odómetro</small><p>${d.odometro} km</p></div>
                        <div><small>Estación</small><p>${d.estacion}</p></div>
                    </div>
                    <div style="text-align:center; margin-top: 20px; padding: 10px; background-color: #f9fafb; border-radius: 6px;">${linkTicket}</div>
                `;
                modalVisor.classList.add('active');
            });
        });
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Seguro que deseas eliminar este registro?')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/combustible.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
                        const result = await res.json();
                        if (result.success) cargarCargas();
                    } catch (err) { alert('Error al intentar eliminar.'); }
                }
            });
        });
    };

    // --- FILTROS DE BÚSQUEDA REACTIVOS ---
    const btnBuscarFiltros = document.getElementById('btn-buscar-filtros');
    const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');

    if (btnBuscarFiltros) {
        btnBuscarFiltros.addEventListener('click', () => {
            const fInicio = document.getElementById('filtro-fecha-inicio').value;
            const fFin = document.getElementById('filtro-fecha-fin').value;
            const fPlacas = document.getElementById('filtro-placas').value.toLowerCase();
            const fEstacion = document.getElementById('filtro-estacion').value.toLowerCase();

            const filtrados = todasLasCargas.filter(c => {
                let pasa = true;
                if (fInicio && c.fecha < fInicio) pasa = false;
                if (fFin && c.fecha > fFin) pasa = false;
                if (fPlacas && !c.placas.toLowerCase().includes(fPlacas)) pasa = false;
                if (fEstacion && !c.estacion.toLowerCase().includes(fEstacion)) pasa = false;
                return pasa;
            });
            
            renderizarTabla(filtrados);
            calcularKPIs(filtrados); //  Las tarjetas analizan solo las filas filtradas
        });
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', () => {
            document.getElementById('filtro-fecha-inicio').value = '';
            document.getElementById('filtro-fecha-fin').value = '';
            document.getElementById('filtro-placas').value = '';
            document.getElementById('filtro-estacion').value = '';
            
            renderizarTabla(todasLasCargas);
            calcularKPIs(todasLasCargas); // Restaura los cálculos globales al limpiar filtros
        });
    }

    // --- IMPORTACIÓN EXCEL / CSV (SHEETJS) ---
    document.getElementById('btn-siguiente-mapeo').addEventListener('click', () => {
        const inputArchivo = document.getElementById('archivo-excel');
        if (inputArchivo.files.length === 0) { alert('Sube un archivo de Excel o CSV.'); return; }

        const file = inputArchivo.files[0];
        const reader = new FileReader();
        const btn = document.getElementById('btn-siguiente-mapeo');
        btn.innerText = "Leyendo archivo..."; btn.disabled = true;

        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false});
            
            if(jsonData.length < 2) { alert('El archivo está vacío.'); btn.innerText = "Analizar Archivo"; btn.disabled = false; return; }
            
            excelHeaders = jsonData[0];
            jsonData.shift();
            excelData = jsonData.filter(row => row.length > 0);

            document.querySelectorAll('.select-mapeo').forEach(select => {
                const tipo = select.dataset.type;
                select.innerHTML = '<option value="">-- Ignorar --</option>';
                
                excelHeaders.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = index; option.text = header;
                    select.appendChild(option);

                    const ht = header.toLowerCase();
                    if(tipo === 'placas' && (ht.includes('placa') || ht.includes('vehiculo'))) select.value = index;
                    if(tipo === 'fecha' && ht.includes('fecha')) select.value = index;
                    if(tipo === 'litros' && ht.includes('litro')) select.value = index;
                    if(tipo === 'costo' && (ht.includes('costo') || ht.includes('importe'))) select.value = index;
                    if(tipo === 'odometro' && (ht.includes('odometro') || ht.includes('km') || ht.includes('kilom'))) select.value = index;
                });
            });

            document.getElementById('paso-1-importacion').style.display = 'none';
            document.getElementById('paso-2-mapeo').style.display = 'block';
            document.getElementById('btn-volver-importar').style.display = 'block';
            document.getElementById('btn-procesar-archivo').style.display = 'block';
            btn.style.display = 'none';
            btn.innerText = "Analizar Archivo"; btn.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById('btn-volver-importar').addEventListener('click', () => {
        document.getElementById('paso-1-importacion').style.display = 'block';
        document.getElementById('paso-2-mapeo').style.display = 'none';
        document.getElementById('btn-volver-importar').style.display = 'none';
        document.getElementById('btn-procesar-archivo').style.display = 'none';
        document.getElementById('btn-siguiente-mapeo').style.display = 'block';
        document.getElementById('archivo-excel').value = '';
    });

    document.getElementById('btn-procesar-archivo').addEventListener('click', async () => {
        const iPlacas = document.getElementById('map-placas').value;
        const iFecha = document.getElementById('map-fecha').value;
        const iLitros = document.getElementById('map-litros').value;
        const iCosto = document.getElementById('map-costo').value;
        const iOdometro = document.getElementById('map-odometro').value;

        if(!iPlacas || !iFecha || !iLitros || !iCosto) {
            alert("Las Placas, Fecha, Litros y Costo son obligatorios de mapear."); return;
        }

        const fixFecha = (str) => {
            if(!str) return '';
            if(str.includes('/')) {
                const p = str.split('/');
                if(p[2] && p[2].length === 4) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
            }
            return str;
        };

        const payload = excelData.map(row => ({
            placas: row[iPlacas] ? String(row[iPlacas]) : '',
            fecha: fixFecha(row[iFecha] ? String(row[iFecha]) : ''),
            litros: row[iLitros] || 0,
            costo_total: row[iCosto] || 0,
            odometro: iOdometro && row[iOdometro] ? row[iOdometro] : 0
        })).filter(item => item.placas && item.fecha); 

        const btn = document.getElementById('btn-procesar-archivo');
        btn.innerText = "Importando datos..."; btn.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/combustible.php?action=importar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            if(result.success) {
                let mensaje = `Se registraron ${result.exitos} cargas nuevas.\n`;
                if(result.duplicados > 0) mensaje += `Se ignoraron ${result.duplicados} filas por estar duplicadas.\n`;
                if(result.errores.length > 0) mensaje += `Vehículos no encontrados: ${result.errores.join(', ')}`;
                
                alert(mensaje);
                modalImportar.classList.remove('active');
                cargarCargas();
            } else alert(result.message || 'Error en el procesamiento.');
        } catch (e) { alert("Error conectando al servidor."); } 
        finally { btn.innerText = "Procesar y Guardar"; btn.disabled = false; }
    });

    // CONTROL DE MODALES
    document.getElementById('btn-abrir-combustible').addEventListener('click', () => { formCombustible.reset(); modalCombustible.classList.add('active'); });
    document.getElementById('btn-cerrar-combustible').addEventListener('click', () => modalCombustible.classList.remove('active'));
    document.getElementById('btn-cancelar-combustible').addEventListener('click', () => modalCombustible.classList.remove('active'));
    document.getElementById('btn-cerrar-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    document.getElementById('btn-entendido-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    
    document.getElementById('btn-abrir-importar').addEventListener('click', () => {
        document.getElementById('archivo-excel').value = '';
        document.getElementById('btn-volver-importar').click(); 
        modalImportar.classList.add('active');
    });
    document.getElementById('btn-cerrar-importar').addEventListener('click', () => modalImportar.classList.remove('active'));

    cargarVehiculosParaSelect();
    cargarCargas();
});