document.addEventListener('DOMContentLoaded', () => {
    let todosLosTickets = [];
    let idTicketActivo = null; 

    // Referencias DOM
    const tableBody = document.querySelector('.data-table tbody');
    const modalTicket = document.getElementById('modal-ticket');
    const formTicket = document.getElementById('form-ticket-datos');
    const modalVisor = document.getElementById('modal-visor');
    const selectVehiculoModal = document.getElementById('vehiculo-ticket');
    const chatContainer = document.getElementById('visor-contenido');

    // Referencias Filtros
    const inputFiltroFecha = document.getElementById('filtro-fecha');
    const inputFiltroFolio = document.getElementById('filtro-folio');
    const selectFiltroEstado = document.getElementById('filtro-estado');
    const btnBuscar = document.getElementById('btn-buscar-filtros');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');

    // --- 1. CARGAR VEHÍCULOS PARA EL SELECT ---
    const cargarVehiculosParaSelect = async () => {
        try {
            const res = await fetch('/Back-end/cliente/tickets.php?action=get_vehiculos');
            const vehiculos = await res.json();
            
            selectVehiculoModal.innerHTML = '<option value="NA">N/A - Soporte del Sistema</option>';
            vehiculos.forEach(v => {
                selectVehiculoModal.innerHTML += `<option value="${v.id_vehiculo}">${v.placas} (${v.marca_modelo})</option>`;
            });
        } catch (e) {
            console.error("Error al cargar vehículos");
        }
    };

    // --- 2. CARGAR Y PINTAR TABLA ---
    const cargarTickets = async () => {
        try {
            const res = await fetch('/Back-end/cliente/tickets.php');
            todosLosTickets = await res.json();
            renderizarTabla(todosLosTickets);
            actualizarKPIs(todosLosTickets);
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión.</td></tr>`;
        }
    };

    const formatearEstado = (estado) => {
        switch(estado.toLowerCase()) {
            case 'resuelto': return '<span class="badge ok">Resuelto</span>';
            case 'pendiente': return '<span class="badge danger">Pendiente</span>';
            case 'en proceso': return '<span class="badge warning">En Proceso</span>';
            default: return `<span class="badge">${estado}</span>`;
        }
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No se encontraron tickets.</td></tr>';
            return;
        }

        datos.forEach(t => {
            const vehiculoStr = t.placas ? `<strong>${t.placas}</strong>` : 'N/A (Soporte Sistema)';
            
            tableBody.innerHTML += `
                <tr>
                    <td>${t.fecha_incidente}</td>
                    <td><strong>${t.ticket_folio}</strong></td>
                    <td>${t.asunto_breve}</td>
                    <td>${vehiculoStr}</td>
                    <td>${formatearEstado(t.estado)}</td>
                    <td class="actions">
                        <button class="btn-icon btn-ver" title="Ver chat y detalles" data-id="${t.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        asignarEventosBotones();
    };

    // --- 3. LÓGICA DE FILTROS ---
    btnBuscar.addEventListener('click', () => {
        const pFecha = inputFiltroFecha.value;
        const pFolio = inputFiltroFolio.value.toLowerCase();
        const pEstado = selectFiltroEstado.value.toLowerCase();

        const filtrados = todosLosTickets.filter(t => {
            const matchFecha = pFecha ? t.fecha_incidente === pFecha : true;
            const matchFolio = pFolio ? t.ticket_folio.toLowerCase().includes(pFolio) : true;
            const matchEstado = pEstado ? t.estado.toLowerCase().includes(pEstado) : true;
            return matchFecha && matchFolio && matchEstado;
        });

        renderizarTabla(filtrados);
    });

    btnLimpiar.addEventListener('click', () => {
        inputFiltroFecha.value = '';
        inputFiltroFolio.value = '';
        selectFiltroEstado.value = '';
        renderizarTabla(todosLosTickets);
    });

    // --- 4. ACTUALIZAR KPIS DINÁMICOS ---
    const actualizarKPIs = (datos) => {
        let abiertos = 0;
        let resueltosMes = 0;
        const mesActual = new Date().getMonth() + 1;

        datos.forEach(t => {
            if (t.estado.toLowerCase() !== 'resuelto') abiertos++;
            const mesTicket = new Date(t.fecha_incidente).getMonth() + 1;
            if (t.estado.toLowerCase() === 'resuelto' && mesTicket === mesActual) resueltosMes++;
        });

        document.getElementById('kpi-abiertos').innerText = abiertos;
        document.getElementById('kpi-resueltos').innerText = resueltosMes;
    };

    // --- 5. CREAR NUEVO TICKET (POST) ---
    document.getElementById('btn-guardar-ticket').addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = new FormData(formTicket);

        if (!formData.get('fecha_incidente') || !formData.get('asunto_breve') || !formData.get('descripcion_detallada')) {
            alert("Rellena todos los campos obligatorios."); return;
        }

        const btnGuardar = document.getElementById('btn-guardar-ticket');
        btnGuardar.innerText = "Creando..."; btnGuardar.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/tickets.php', { method: 'POST', body: formData });
            const result = await res.json();
            
            if (result.success) {
                modalTicket.classList.remove('active');
                cargarTickets();
                alert(result.message);
            } else alert(result.message);
        } catch (err) {
            alert('Error de conexión.');
        } finally {
            btnGuardar.innerText = "Crear Ticket"; btnGuardar.disabled = false;
        }
    });

    // --- 6. EVENTOS DE LA TABLA Y CHAT ---
    const asignarEventosBotones = () => {
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                idTicketActivo = id;
                const t = todosLosTickets.find(x => x.id == id);
                
                document.getElementById('visor-titulo').innerText = `Ticket: ${t.ticket_folio}`;
                chatContainer.innerHTML = '<p style="text-align:center;">Cargando mensajes...</p>';
                modalVisor.classList.add('active');

                let htmlChat = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div><small style="color: var(--text-muted);">Apertura:</small> <br>${t.fecha_incidente}</div>
                        <div>${formatearEstado(t.estado)}</div>
                    </div>
                    <div class="chat-bubble-cliente">
                        <small style="color: var(--primary-color); font-weight: 600;">Tú (Reporte Inicial)</small>
                        <p style="margin-top: 5px; font-size: 14px; color: var(--text-main);">${t.descripcion_detallada}</p>
                    </div>
                `;

                try {
                    const resCom = await fetch(`/Back-end/cliente/tickets.php?action=get_comentarios&id_ticket=${id}`);
                    const comentarios = await resCom.json();

                    comentarios.forEach(c => {
                        //  Validamos estrictamente que sea el SuperAdmin
                        const esAdmin = c.rol === 'SuperAdmin';
                        
                        if (esAdmin) {
                            htmlChat += `
                                <div class="chat-bubble-admin">
                                    <small style="color: #065f46; font-weight: 600;">Soporte OptiFlota</small>
                                    <p style="margin-top: 5px; font-size: 14px; color: var(--text-main);">${c.comentario}</p>
                                </div>
                            `;
                        } else {
                            htmlChat += `
                                <div class="chat-bubble-cliente">
                                    <small style="color: var(--primary-color); font-weight: 600;">Tú (${c.nombre})</small>
                                    <p style="margin-top: 5px; font-size: 14px; color: var(--text-main);">${c.comentario}</p>
                                </div>
                            `;
                        }
                    });

                    chatContainer.innerHTML = htmlChat;
                    chatContainer.scrollTop = chatContainer.scrollHeight;

                } catch (err) {
                    chatContainer.innerHTML += '<p style="color:red; text-align:center;">No se pudo cargar el historial del chat.</p>';
                }
            });
        });
    };

    // --- 7. RESPONDER TICKET DESDE EL CHAT ---
    document.getElementById('btn-responder-ticket').addEventListener('click', async () => {
        const respuesta = document.getElementById('cliente-respuesta').value.trim();
        if (respuesta === "") { alert("Por favor, escribe una respuesta."); return; }

        const formData = new FormData();
        formData.append('action', 'reply');
        formData.append('id_ticket', idTicketActivo);
        formData.append('comentario', respuesta);

        document.getElementById('btn-responder-ticket').innerText = "Enviando...";

        try {
            const res = await fetch('/Back-end/cliente/tickets.php', { method: 'POST', body: formData });
            const result = await res.json();
            
            if(result.success) {
                document.getElementById('cliente-respuesta').value = '';
                modalVisor.classList.remove('active');
                cargarTickets(); 
                alert("Tu respuesta ha sido enviada. Soporte la revisará en breve.");
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert("Error al enviar la respuesta.");
        } finally {
            document.getElementById('btn-responder-ticket').innerText = "Enviar Respuesta";
        }
    });

    // UI Modales Base
    document.getElementById('btn-abrir-modal').addEventListener('click', () => {
        formTicket.reset();
        modalTicket.classList.add('active');
    });
    document.getElementById('btn-cerrar-modal').addEventListener('click', () => modalTicket.classList.remove('active'));
    document.getElementById('btn-cancelar-modal').addEventListener('click', () => modalTicket.classList.remove('active'));
    document.getElementById('btn-cerrar-visor').addEventListener('click', () => {
        modalVisor.classList.remove('active');
        document.getElementById('cliente-respuesta').value = '';
    });

    // Arranque
    cargarVehiculosParaSelect();
    cargarTickets();
});