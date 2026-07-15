document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.data-table tbody');
    const adminNameSpan = document.getElementById('admin-name');
    const modal = document.getElementById('modal-atencion');
    
    let todosLosTickets = [];
    let idTicketActual = null;

    const cargarFiltroTipos = (tickets) => {
        const selectTipo = document.getElementById('filtro-tipo');
        // Si el ticket no tiene tipo, lo toma como 'Otro'
        const tiposUnicos = [...new Set(tickets.map(t => t.tipo_reporte || 'Otro'))].filter(Boolean);
        
        const valorActual = selectTipo.value;
        
        selectTipo.innerHTML = '<option value="Todos">Todos</option>';
        tiposUnicos.forEach(tipo => {
            selectTipo.innerHTML += `<option value="${tipo}">${tipo}</option>`;
        });
        
        if ([...selectTipo.options].some(o => o.value === valorActual)) {
            selectTipo.value = valorActual;
        }
    };

    const cargarTickets = async () => {
        try {
            const res = await fetch(`/Back-end/admin/tickets.php?_=${new Date().getTime()}`);
            if(res.status === 403) {
                alert("No tienes sesión de administrador.");
                window.location.href = '/Front-end/Cliente/login.html'; return;
            }
            
            const data = await res.json();
            if (data.success) {
                if(adminNameSpan) adminNameSpan.innerText = data.admin_nombre;
                
                document.getElementById('kpi-pendientes').innerText = data.kpis.pendientes;
                document.getElementById('kpi-proceso').innerText = data.kpis.proceso;

                todosLosTickets = data.tickets;
                
                cargarFiltroTipos(todosLosTickets);
                renderizarTabla(todosLosTickets);
            }
        } catch (e) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Error al cargar tickets.</td></tr>';
        }
    };

    const formatearEstado = (estado) => {
        const est = estado.toLowerCase();
        if (est.includes('pendiente')) return '<span class="badge danger">Pendiente</span>';
        if (est.includes('proceso')) return '<span class="badge warning">En Proceso</span>';
        return '<span class="badge ok">Resuelto</span>';
    };

    const formatearUrgencia = (urgencia) => {
        if (!urgencia) return '<span class="badge ok">Baja</span>';
        const urg = urgencia.toLowerCase();
        if (urg.includes('alta') || urg.includes('critica') || urg.includes('crítica')) return '<span class="badge danger">Alta</span>';
        if (urg.includes('media')) return '<span class="badge warning">Media</span>';
        return '<span class="badge ok">Baja</span>';
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No se encontraron tickets con esos filtros.</td></tr>';
            return;
        }

        datos.forEach(t => {
            // Regresamos el estilo gris y cursiva para N/A en la tabla
            const vehiculoInfo = t.marca_modelo ? `${t.marca_modelo} (${t.placas})` : '<span style="color: #6b7280; font-style: italic;">N/A (Soporte Sistema)</span>';
            const tipoReporte = t.tipo_reporte || 'Otro';

            tableBody.innerHTML += `
                <tr>
                    <td>${t.fecha_incidente}</td>
                    <td><strong>${t.empresa}</strong></td>
                    <td>${t.ticket_folio}</td>
                    <td>${t.asunto_breve}</td>
                    <td>${tipoReporte}</td>
                    <td>${vehiculoInfo}</td>
                    <td>${formatearUrgencia(t.nivel_urgencia)}</td>
                    <td>${formatearEstado(t.estado)}</td>
                    <td class="actions">
                        <button class="btn-primary btn-atender" data-id="${t.id}" style="padding: 6px 12px; font-size: 13px;">Atender</button>
                    </td>
                </tr>
            `;
        });

        asignarEventosAtender();
    };

    const asignarEventosAtender = () => {
        document.querySelectorAll('.btn-atender').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const ticket = todosLosTickets.find(x => x.id == id);
                idTicketActual = id;

                document.getElementById('ticket-modal-title').innerText = `Atendiendo: ${ticket.ticket_folio}`;
                document.getElementById('ticket-modal-empresa').innerText = ticket.empresa;
                document.getElementById('ticket-modal-fecha').innerText = ticket.fecha_incidente;
                
                const modalUrgencia = document.getElementById('ticket-modal-urgencia');
                if(modalUrgencia) modalUrgencia.innerHTML = formatearUrgencia(ticket.nivel_urgencia);

                const modalTipo = document.getElementById('ticket-modal-tipo');
                if(modalTipo) modalTipo.innerText = ticket.tipo_reporte || 'Otro';

                const modalVehiculo = document.getElementById('ticket-modal-vehiculo');
                if(modalVehiculo) {
                    // Regresamos el estilo gris y cursiva para N/A en el modal (nota: usamos innerHTML)
                    modalVehiculo.innerHTML = ticket.marca_modelo ? `${ticket.marca_modelo} (${ticket.placas})` : '<span style="color: #6b7280; font-style: italic;">N/A (Soporte)</span>';
                }
                
                const selectEstado = document.getElementById('select-estado-ticket');
                const est = ticket.estado.toLowerCase();
                if (est.includes('pendiente')) selectEstado.value = 'Pendiente';
                else if (est.includes('proceso')) selectEstado.value = 'En Proceso';
                else selectEstado.value = 'Resuelto';

                modal.classList.add('active');

                const chatHistorial = document.getElementById('admin-chat-historial');
                chatHistorial.innerHTML = '<p style="text-align:center;">Cargando conversación...</p>';

                try {
                    const resChat = await fetch(`/Back-end/admin/tickets.php?action=get_chat&id_ticket=${id}`);
                    const dataChat = await resChat.json();
                    
                    if(dataChat.success) {
                        chatHistorial.innerHTML = '';
                        
                        chatHistorial.innerHTML += `
                            <div style="align-self: flex-start; max-width: 85%;">
                                <small>Reporte Inicial (Cliente)</small>
                                <div style="background: #e5e7eb; padding: 10px; border-radius: 8px; margin-top: 4px;">
                                    <strong>${ticket.asunto_breve}</strong><br>
                                    ${ticket.descripcion_detallada}
                                </div>
                            </div>
                        `;

                        dataChat.chat.forEach(msg => {
                            const isSoporte = msg.rol === 'SuperAdmin' || !msg.rol; 
                            const align = isSoporte ? 'flex-end' : 'flex-start';
                            const bg = isSoporte ? '#d1fae5' : '#f3f4f6';
                            const sender = isSoporte ? 'Tú (Soporte)' : `Cliente (${msg.nombre})`;
                            
                            chatHistorial.innerHTML += `
                                <div style="align-self: ${align}; max-width: 85%;">
                                    <small>${sender} - ${msg.creado_en}</small>
                                    <div style="background: ${bg}; padding: 10px; border-radius: 8px; margin-top: 4px;">
                                        ${msg.comentario}
                                    </div>
                                </div>
                            `;
                        });
                        
                        chatHistorial.scrollTop = chatHistorial.scrollHeight;
                    }
                } catch(error) {
                    chatHistorial.innerHTML = '<p style="text-align:center;">Error al cargar el historial.</p>';
                }
            });
        });
    };

    const cerrarAtencion = () => {
        modal.classList.remove('active');
        document.getElementById('admin-respuesta').value = '';
        idTicketActual = null;
    };

    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarAtencion);
    document.getElementById('btn-cancelar-atencion').addEventListener('click', cerrarAtencion);

    document.getElementById('btn-actualizar-estado').addEventListener('click', async () => {
        if (!idTicketActual) return;
        const respuesta = document.getElementById('admin-respuesta').value.trim();
        const nuevoEstado = document.getElementById('select-estado-ticket').value;

        if (respuesta === "") {
            alert("Por favor, escribe una respuesta para el cliente antes de actualizar.");
            return;
        }

        const payload = { action: 'responder_ticket', id_ticket: idTicketActual, respuesta: respuesta, estado: nuevoEstado };
        const btn = document.getElementById('btn-actualizar-estado');
        
        btn.disabled = true;
        btn.innerText = "Guardando...";

        try {
            const res = await fetch('/Back-end/admin/tickets.php', { method: 'POST', body: JSON.stringify(payload) });
            const data = await res.json();
            
            if(data.success) {
                alert(data.message);
                cerrarAtencion();
                cargarTickets();
            } else alert(data.message);
        } catch (e) {
            alert("Error de red.");
        } finally {
            btn.disabled = false;
            btn.innerText = "Enviar Respuesta y Actualizar";
        }
    });

    document.getElementById('btn-buscar-filtros').addEventListener('click', () => {
        const fEmpresa = document.getElementById('filtro-empresa').value.toLowerCase();
        const fEstado = document.getElementById('filtro-estado').value.toLowerCase();
        const fTipo = document.getElementById('filtro-tipo').value.toLowerCase();

        const filtrados = todosLosTickets.filter(t => {
            const matchEmp = t.empresa.toLowerCase().includes(fEmpresa);
            const matchEst = fEstado === 'todos' ? true : t.estado.toLowerCase() === fEstado;
            
            const tipoReporteTicket = (t.tipo_reporte || 'Otro').toLowerCase();
            const matchTipo = fTipo === 'todos' ? true : tipoReporteTicket === fTipo;
            
            return matchEmp && matchEst && matchTipo;
        });
        renderizarTabla(filtrados);
    });

    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('filtro-empresa').value = '';
        document.getElementById('filtro-estado').value = 'Todos';
        document.getElementById('filtro-tipo').value = 'Todos';
        renderizarTabla(todosLosTickets);
    });

    cargarTickets();
});