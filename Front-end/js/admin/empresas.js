document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.data-table tbody');
    const adminNameSpan = document.getElementById('admin-name');
    const modalEmpresa = document.getElementById('modal-empresa');
    const formEmpresa = document.getElementById('form-empresa');
    
    let todasLasEmpresas = [];

    const cargarEmpresas = async () => {
        try {
            const res = await fetch('/Back-end/admin/empresas.php');
            if(res.status === 403) {
                alert("No tienes sesión de administrador.");
                window.location.href = '/Front-end/Cliente/login.html'; return;
            }
            const data = await res.json();
            if (data.success) {
                adminNameSpan.innerText = data.admin_nombre;
                
                // Pintar las tarjetas superiores (KPIs)
                document.getElementById('kpi-activas').innerText = data.kpis.activas;
                document.getElementById('kpi-suspendidas').innerText = data.kpis.suspendidas;
                document.getElementById('kpi-vehiculos').innerText = data.kpis.total_vehiculos;

                todasLasEmpresas = data.empresas;
                renderizarTabla(todasLasEmpresas);
            }
        } catch (e) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar empresas.</td></tr>';
        }
    };

    const renderizarTabla = (datos) => {
        tableBody.innerHTML = '';
        if (datos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay empresas registradas.</td></tr>';
            return;
        }

        datos.forEach(e => {
            const esSuspendida = e.estado === 'Suspendida';
            const estadoHTML = esSuspendida ? '<span class="badge danger">Suspendida</span>' : '<span class="badge ok">Activa</span>';
            
            // Reconstruimos botones con íconos SVG originales
            const btnBlockHTML = esSuspendida
                ? `<button class="btn-icon ok btn-estado" title="Reactivar" data-id="${e.id}" data-estado="Activa" style="display: inline-flex; align-items: center; justify-content: center; color: var(--success);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg></button>`
                : `<button class="btn-icon btn-estado" title="Bloquear Acceso" data-id="${e.id}" data-estado="Suspendida" style="display: inline-flex; align-items: center; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="m8 8 8 8"></path></svg></button>`;

            tableBody.innerHTML += `
                <tr>
                    <td><strong>${e.nombre}</strong></td>
                    <td>${e.email_contacto}</td>
                    <td>${e.total_vehiculos} unidades</td>
                    <td>${e.fecha_vencimiento}</td>
                    <td>${estadoHTML}</td>
                    <td class="actions">
                        <button class="btn-icon btn-editar" title="Editar Suscripción" data-id="${e.id}" style="display: inline-flex; align-items: center; justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 20 4-1 11-11-3-3L5 16l-1 4Z"></path><path d="M13 6 17 10"></path></svg>
                        </button>
                        ${btnBlockHTML}
                    </td>
                </tr>
            `;
        });

        asignarEventosAcciones();
    };

    const asignarEventosAcciones = () => {
        // Suspender o Reactivar
        document.querySelectorAll('.btn-estado').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const estado = e.currentTarget.dataset.estado;
                if(confirm(`¿Deseas cambiar el estado de la empresa a ${estado}?`)) {
                    await mandarAccion({ action: 'cambiar_estado', id_empresa: id, estado: estado });
                }
            });
        });

        // Editar Empresa Existente (Abre el modal)
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const emp = todasLasEmpresas.find(x => x.id == id);
                
                document.querySelector('.modal-header h2').innerText = `Editar Cliente: ${emp.nombre}`;
                
                document.getElementById('id_empresa_input').value = emp.id;
                document.querySelector('input[name="nombre"]').value = emp.nombre;
                document.querySelector('input[name="email"]').value = emp.email_contacto;
                
                const inputPass = document.querySelector('input[name="password"]');
                inputPass.value = '';
                inputPass.placeholder = 'Déjalo vacío si no deseas cambiarla';
                inputPass.removeAttribute('required'); // Ya no es obligatoria al editar
                
                document.querySelector('input[name="vencimiento"]').value = emp.fecha_vencimiento;
                
                const planSelect = document.querySelector('select[name="plan"]');
                const p = emp.plan.toLowerCase();
                if(p.includes('trial')) planSelect.value = "1";
                else if(p.includes('básico')) planSelect.value = "2";
                else if(p.includes('pro')) planSelect.value = "3";
                else planSelect.value = "4";

                modalEmpresa.classList.add('active');
            });
        });
    };

    const mandarAccion = async (payload) => {
        try {
            const res = await fetch('/Back-end/admin/empresas.php', { method: 'POST', body: JSON.stringify(payload) });
            const data = await res.json();
            if(data.success) { alert(data.message); cargarEmpresas(); } 
            else alert(data.message);
        } catch (e) { alert("Error de red."); }
    };

    // --- LÓGICA DEL MODAL ---
    const cerrarModal = () => modalEmpresa.classList.remove('active');
    
    document.getElementById('btn-abrir-modal').addEventListener('click', () => {
        document.querySelector('.modal-header h2').innerText = 'Dar de alta un nuevo cliente';
        formEmpresa.reset();
        document.getElementById('id_empresa_input').value = ''; // Limpiar el ID oculto
        
        const inputPass = document.querySelector('input[name="password"]');
        inputPass.value = 'OptiFlota2026!';
        inputPass.setAttribute('required', 'true');

        // Ponemos por defecto un mes a futuro
        const hoy = new Date();
        hoy.setMonth(hoy.getMonth() + 1);
        document.querySelector('input[name="vencimiento"]').value = hoy.toISOString().split('T')[0];

        modalEmpresa.classList.add('active');
    });

    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);

    // Enviar formulario (Crear o Editar)
    document.getElementById('btn-guardar-empresa').addEventListener('click', async () => {
        const formData = new FormData(formEmpresa);
        const data = Object.fromEntries(formData.entries());

        if(!data.nombre || !data.email || !data.plan || !data.vencimiento) {
            alert("Por favor completa los campos principales."); return;
        }

        // Si hay ID oculto, significa que estamos editando. Si no, estamos creando.
        data.action = data.id_empresa ? 'editar_empresa' : 'crear_empresa';

        try {
            const res = await fetch('/Back-end/admin/empresas.php', { method: 'POST', body: JSON.stringify(data) });
            const result = await res.json();
            
            if(result.success) {
                alert(result.message);
                cerrarModal();
                cargarEmpresas();
            } else alert(result.message);
        } catch (e) { alert("Error conectando con el servidor."); }
    });

    // --- FILTROS DE BÚSQUEDA ---
    document.getElementById('btn-buscar-filtros').addEventListener('click', () => {
        const fNombre = document.getElementById('filtro-empresa').value.toLowerCase();
        const fEstado = document.getElementById('filtro-estado-cuenta').value.toLowerCase();

        const filtradas = todasLasEmpresas.filter(e => {
            const matchNombre = e.nombre.toLowerCase().includes(fNombre) || e.email_contacto.toLowerCase().includes(fNombre);
            const matchEstado = fEstado ? e.estado.toLowerCase() === fEstado : true;
            return matchNombre && matchEstado;
        });
        renderizarTabla(filtradas);
    });

    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
        document.getElementById('filtro-empresa').value = '';
        document.getElementById('filtro-estado-cuenta').value = '';
        renderizarTabla(todasLasEmpresas);
    });

    cargarEmpresas();
});