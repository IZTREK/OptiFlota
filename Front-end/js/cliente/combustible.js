document.addEventListener('DOMContentLoaded', () => {
    let todasLasCargas = [];
    let todosLosAnalisis = []; 
    let excelData = [];
    let excelHeaders = [];

    const tableBodyHistorial = document.querySelector('#tabla-historial tbody');
    const tableBodyAnalisis = document.querySelector('#tabla-analisis tbody');
    const modalCombustible = document.getElementById('modal-combustible');
    const formCombustible = document.getElementById('form-combustible-datos');
    const modalVisor = document.getElementById('modal-visor');
    const selectVehiculoModal = document.getElementById('vehiculo-carga');
    const modalImportar = document.getElementById('modal-importar');

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(e.currentTarget.dataset.target).classList.add('active');
        });
    });

    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php?action=get_vehiculos');
            const vehiculos = await res.json();
            selectVehiculoModal.innerHTML = '<option value="" disabled selected>Seleccione una unidad...</option>';
            vehiculos.forEach(v => {
                selectVehiculoModal.innerHTML += `<option value="${v.id_vehiculo}">${v.placas} (${v.marca_modelo})</option>`;
            });
        } catch (e) { console.error("Error al cargar vehículos"); }
    };

    const cargarCargas = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php');
            todasLasCargas = await res.json();
            renderizarTablaHistorial(todasLasCargas);
            calcularKPIs(); 
        } catch (e) {
            tableBodyHistorial.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
        }
    };

    const cargarAnalisis = async () => {
        try {
            const res = await fetch('/Back-end/cliente/combustible.php?action=get_analisis');
            todosLosAnalisis = await res.json();
            renderizarTablaAnalisis(todosLosAnalisis);
            // 🐛 FIX DEL BUG AQUI: Volvemos a calcular los KPIs asegurándonos de que ya llegaron los datos de Rendimiento
            calcularKPIs(); 
        } catch (e) {
            tableBodyAnalisis.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error de conexión al cargar análisis.</td></tr>`;
        }
    };

    const renderizarTablaHistorial = (datos) => {
        tableBodyHistorial.innerHTML = '';
        if (datos.length === 0) {
            tableBodyHistorial.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros.</td></tr>';
            return;
        }

        datos.forEach(d => {
            const costoF = '$' + parseFloat(d.costo_total).toLocaleString('es-MX', {minimumFractionDigits: 2});
            const litrosF = parseFloat(d.litros).toFixed(2) + ' L';
            const kmF = parseInt(d.odometro).toLocaleString('es-MX') + ' km';
            
            const badgeExcel = d.origen_registro === 'Importacion_Excel' ? '<span class="badge" style="background:#e0e7ff; color:#1e40af; font-size:10px; margin-left:5px;">Excel</span>' : '';

            const svgOjo = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            const svgEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            const svgTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5M14 11v5"></path></svg>`;

            const btnVerHTML = `<button class="btn-icon btn-ver" data-id="${d.id}" title="Ver Detalles" style="display:inline-flex; align-items:center; justify-content:center; color:var(--text-main);">${svgOjo}</button>`;
            const btnEditarHTML = `<button class="btn-icon btn-editar" data-id="${d.id}" title="Corregir Carga" style="display:inline-flex; align-items:center; justify-content:center; color:var(--text-main);">${svgEdit}</button>`;
            const btnEliminarHTML = `<button class="btn-icon delete btn-eliminar" data-id="${d.id}" title="Eliminar Registro" style="display:inline-flex; align-items:center; justify-content:center;">${svgTrash}</button>`;

            tableBodyHistorial.innerHTML += `
                <tr>
                    <td>${d.fecha}</td>
                    <td><strong>${d.placas}</strong></td>
                    <td>${litrosF}</td>
                    <td>${costoF}</td>
                    <td>${kmF}</td>
                    <td>${d.estacion} ${badgeExcel}</td>
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

    const renderizarTablaAnalisis = (datos) => {
        tableBodyAnalisis.innerHTML = '';
        if (datos.length === 0) {
            tableBodyAnalisis.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay registros analizados.</td></tr>';
            return;
        }

        datos.forEach(d => {
            const idealF = parseFloat(d.Km_L_Ideal).toFixed(2);
            const realF = parseFloat(d.Km_L_Real).toFixed(2);
            const diffPorcentaje = (parseFloat(d.Diferencia) * 100).toFixed(1) + '%';
            
            let badgeConf = '';
            if (d.Comentario_Confiabilidad === 'OK') {
                badgeConf = '<span style="background:#dcfce7; color:#166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight:bold;">OK</span>';
            } else {
                badgeConf = `<span style="background:#fee2e2; color:#991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight:bold;">${d.Comentario_Confiabilidad}</span>`;
            }

            let diffStyle = d.Comentario_Confiabilidad === 'OK' ? 'color:#166534;' : 'color:#991b1b; font-weight:bold;';

            tableBodyAnalisis.innerHTML += `
                <tr>
                    <td>${d.Fecha_Carga}</td>
                    <td><strong>${d.Vehiculo}</strong> <br><small>${d.Modelo || ''}</small></td>
                    <td>${d.Km_Recorridos} km</td>
                    <td>${idealF}</td>
                    <td><strong>${realF}</strong></td>
                    <td style="${diffStyle}">${diffPorcentaje}</td>
                    <td>${badgeConf}</td>
                </tr>
            `;
        });
    };

    const calcularKPIs = (cargasAAnalizar = todasLasCargas) => {
        const mesActual = new Date().toISOString().substring(0, 7); 
        let gastoMes = 0;
        let totalLitrosMes = 0;
        let totalKmRecorridosMes = 0;

        cargasAAnalizar.forEach(c => {
            if (c.fecha && c.fecha.startsWith(mesActual)) {
                gastoMes += parseFloat(c.costo_total);
            }
        });

        todosLosAnalisis.forEach(a => {
             if (a.Fecha_Carga && a.Fecha_Carga.startsWith(mesActual) && parseFloat(a.Km_Recorridos) > 0) {
                 totalKmRecorridosMes += parseFloat(a.Km_Recorridos);
                 totalLitrosMes += parseFloat(a.Litros);
             }
        });

        const rendimientoPromedio = totalLitrosMes > 0 ? (totalKmRecorridosMes / totalLitrosMes) : 0;

        const kpiGasto = document.getElementById('kpi-gasto-mes');
        const kpiRend = document.getElementById('kpi-rendimiento');
        if (kpiGasto) kpiGasto.innerText = '$' + gastoMes.toLocaleString('es-MX', { minimumFractionDigits: 2 });
        if (kpiRend) kpiRend.innerText = rendimientoPromedio > 0 ? rendimientoPromedio.toFixed(2) + ' km/L' : '0.00 km/L';
    };

    document.getElementById('btn-guardar-combustible').addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = new FormData(formCombustible);

        if (!formData.get('id_vehiculo') || !formData.get('fecha') || !formData.get('litros') || !formData.get('costo_total')) {
            alert("Rellena todos los campos obligatorios."); return;
        }
        const btnGuardar = document.getElementById('btn-guardar-combustible');
        const originalText = btnGuardar.innerText;
        btnGuardar.innerText = "Calculando y Guardando..."; btnGuardar.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/combustible.php', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                modalCombustible.classList.remove('active');
                cargarCargas(); 
                cargarAnalisis();
            } else alert(result.message);
        } catch (err) { alert('Error de conexión.'); } 
        finally { btnGuardar.innerText = originalText; btnGuardar.disabled = false; }
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
                    <div style="text-align: center; margin-bottom: 20px;"><h3 style="color: var(--primary-color); font-size: 28px; font-weight:bold;">${costoF}</h3><p style="color: var(--text-muted);">Cargado: ${parseFloat(d.litros).toFixed(2)} L</p></div>
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

        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const c = todasLasCargas.find(x => x.id == id);
                if (c) {
                    formCombustible.reset();
                    
                    let hiddenId = formCombustible.querySelector('input[name="id_carga"]');
                    if(!hiddenId) {
                        hiddenId = document.createElement('input');
                        hiddenId.type = 'hidden'; hiddenId.name = 'id_carga';
                        formCombustible.appendChild(hiddenId);
                    }
                    hiddenId.value = c.id;

                    if (formCombustible.querySelector('[name="id_vehiculo"]')) formCombustible.querySelector('[name="id_vehiculo"]').value = c.id_vehiculo;
                    if (formCombustible.querySelector('[name="fecha"]')) formCombustible.querySelector('[name="fecha"]').value = c.fecha;
                    if (formCombustible.querySelector('[name="litros"]')) formCombustible.querySelector('[name="litros"]').value = c.litros;
                    if (formCombustible.querySelector('[name="costo_total"]')) formCombustible.querySelector('[name="costo_total"]').value = c.costo_total;
                    if (formCombustible.querySelector('[name="odometro"]')) formCombustible.querySelector('[name="odometro"]').value = c.odometro;
                    if (formCombustible.querySelector('[name="estacion"]')) formCombustible.querySelector('[name="estacion"]').value = c.estacion;

                    const modalTitle = document.querySelector('#modal-combustible .modal-header h2');
                    if(modalTitle) modalTitle.innerText = 'Corregir Carga';
                    
                    const btnGuardar = document.getElementById('btn-guardar-combustible');
                    if(btnGuardar) btnGuardar.innerText = 'Actualizar Registro';

                    modalCombustible.classList.add('active');
                }
            });
        });
        
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('¿Seguro que deseas eliminar este registro?')) {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/Back-end/cliente/combustible.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
                        const result = await res.json();
                        if (result.success) { cargarCargas(); cargarAnalisis(); }
                    } catch (err) { alert('Error al intentar eliminar.'); }
                }
            });
        });
    };

    document.getElementById('btn-buscar-filtros').addEventListener('click', () => {
        const fInicio = document.getElementById('filtro-fecha-inicio').value;
        const fFin = document.getElementById('filtro-fecha-fin').value;
        const fPlacas = document.getElementById('filtro-placas').value.toLowerCase();

        const filtradosData = todasLasCargas.filter(c => {
            let pasa = true;
            if (fInicio && c.fecha < fInicio) pasa = false;
            if (fFin && c.fecha > fFin) pasa = false;
            if (fPlacas && !c.placas.toLowerCase().includes(fPlacas)) pasa = false;
            return pasa;
        });

        const filtradosAnalisis = todosLosAnalisis.filter(a => {
            let pasa = true;
            if (fInicio && a.Fecha_Carga < fInicio) pasa = false;
            if (fFin && a.Fecha_Carga > fFin) pasa = false;
            if (fPlacas && !a.Vehiculo.toLowerCase().includes(fPlacas)) pasa = false;
            return pasa;
        });
        
        renderizarTablaHistorial(filtradosData);
        renderizarTablaAnalisis(filtradosAnalisis);
    });

    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('filtro-fecha-inicio').value = '';
        document.getElementById('filtro-fecha-fin').value = '';
        document.getElementById('filtro-placas').value = '';
        renderizarTablaHistorial(todasLasCargas);
        renderizarTablaAnalisis(todosLosAnalisis);
    });

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
                    if(tipo === 'estacion' && (ht.includes('estacion') || ht.includes('gasolinera'))) select.value = index;
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
        const iEstacion = document.getElementById('map-estacion').value; 

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
            odometro: iOdometro && row[iOdometro] ? row[iOdometro] : 0,
            estacion: iEstacion && row[iEstacion] ? String(row[iEstacion]) : 'No especificada' 
        })).filter(item => item.placas && item.fecha); 

        const btn = document.getElementById('btn-procesar-archivo');
        btn.innerText = "Analizando anomalías..."; btn.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/combustible.php?action=importar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            if(result.success) {
                let mensaje = `Se registraron y analizaron ${result.exitos} cargas.\n`;
                if(result.duplicados > 0) mensaje += `Se ignoraron ${result.duplicados} filas duplicadas.\n`;
                
                alert(mensaje);
                modalImportar.classList.remove('active');
                cargarCargas();
                cargarAnalisis(); 
            } else alert(result.message || 'Error en el procesamiento.');
        } catch (e) { alert("Error conectando al servidor."); } 
        finally { btn.innerText = "Importar a Base de Datos"; btn.disabled = false; }
    });

    document.getElementById('btn-abrir-combustible').addEventListener('click', () => { 
        formCombustible.reset(); 
        const hiddenId = formCombustible.querySelector('input[name="id_carga"]');
        if(hiddenId) hiddenId.value = ''; 
        
        const modalTitle = document.querySelector('#modal-combustible .modal-header h2');
        if(modalTitle) modalTitle.innerText = 'Registrar Carga de Combustible';
        const btnGuardar = document.getElementById('btn-guardar-combustible');
        if(btnGuardar) btnGuardar.innerText = 'Guardar Registro';

        modalCombustible.classList.add('active'); 
    });
    document.getElementById('btn-cerrar-combustible').addEventListener('click', () => modalCombustible.classList.remove('active'));
    document.getElementById('btn-cancelar-combustible').addEventListener('click', () => modalCombustible.classList.remove('active'));
    document.getElementById('btn-cerrar-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    document.getElementById('btn-entendido-visor').addEventListener('click', () => modalVisor.classList.remove('active'));
    document.getElementById('btn-abrir-importar').addEventListener('click', () => { document.getElementById('archivo-excel').value = ''; document.getElementById('btn-volver-importar').click(); modalImportar.classList.add('active'); });
    document.getElementById('btn-cerrar-importar').addEventListener('click', () => modalImportar.classList.remove('active'));

    cargarVehiculosParaSelect();
    cargarCargas();
    cargarAnalisis();
});