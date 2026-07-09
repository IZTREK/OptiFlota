document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const infoMiPlan = document.getElementById('info-mi-plan');
    const plansContainer = document.getElementById('plans-container');
    const modalPago = document.getElementById('modal-pago');
    const formPago = document.getElementById('form-pago-datos');
    const inputPlanSeleccionado = document.getElementById('input-plan-seleccionado');
    
    // Variables para el pago
    let idPlanSeleccionado = null;
    let montoPlanSeleccionado = 0;

    // --- 1. CARGAR INFORMACIÓN DEL PLAN ACTUAL ---
    const cargarMiPlan = async () => {
        try {
            const res = await fetch('/Back-end/cliente/suscripcion.php?action=get_mi_plan');
            const data = await res.json();
            
            if(data) {
                // Validar si la cuenta está vencida para colorear el estado
                const hoy = new Date().toISOString().split('T')[0];
                const estaVencida = hoy > data.fecha_vencimiento;
                const estadoTxt = estaVencida ? 'Vencida' : data.estado;
                const colorEstado = estaVencida ? '#ef4444' : '#10b981';

                infoMiPlan.innerHTML = `
                    <p><strong>Plan Actual:</strong> ${data.plan} (Límite: ${data.limite_vehiculos} vehículos)</p>
                    <p><strong>Estado:</strong> <span style="color: ${colorEstado}; font-weight:bold;">${estadoTxt}</span> (Vence: ${data.fecha_vencimiento})</p>
                    <p style="margin-top: 8px; font-size: 13.5px; color: var(--text-main);">
                        Tienes <strong>${data.total_vehiculos} vehículos</strong> registrados actualmente en el sistema.
                    </p>
                `;
            }
        } catch (e) {
            infoMiPlan.innerHTML = '<p style="color:red;">Error al cargar los datos de tu suscripción.</p>';
        }
    };

    // --- 2. CARGAR TARJETAS DE PLANES DISPONIBLES ---
    const cargarPlanes = async () => {
        try {
            const res = await fetch('/Back-end/cliente/suscripcion.php?action=get_planes');
            const planes = await res.json();
            
            plansContainer.innerHTML = ''; // Limpiar contenedor
            
            planes.forEach(p => {
                const costoFormateado = '$' + parseFloat(p.costo_mensual).toLocaleString('es-MX', {minimumFractionDigits: 2});
                const limiteTxt = p.limite_vehiculos >= 9999 ? 'Flotillas ilimitadas' : `Hasta ${p.limite_vehiculos} vehículos`;
                
                plansContainer.innerHTML += `
                    <div class="plan-card">
                        <h4>${p.nombre}</h4>
                        <p>${costoFormateado} / mes</p>
                        <small>${limiteTxt}</small>
                        <button class="btn-secondary btn-seleccionar-plan" style="width: 100%; margin-top: 15px;" 
                            data-id="${p.id}" data-nombre="${p.nombre}" data-precio="${p.costo_mensual}">
                            Seleccionar / Renovar
                        </button>
                    </div>
                `;
            });
            
            asignarEventosBotones();
        } catch (e) {
            plansContainer.innerHTML = '<p style="color:red;">Error al cargar los planes disponibles.</p>';
        }
    };

    // --- 3. EVENTOS DE SELECCIÓN Y PAGO ---
    const asignarEventosBotones = () => {
        document.querySelectorAll('.btn-seleccionar-plan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const nombre = e.target.dataset.nombre;
                const precio = e.target.dataset.precio;
                
                idPlanSeleccionado = id;
                montoPlanSeleccionado = precio;
                
                document.getElementById('titulo-modal-pago').innerText = `Adquirir/Renovar: ${nombre}`;
                inputPlanSeleccionado.value = `${nombre} ($${parseFloat(precio).toLocaleString('es-MX')} / mes)`;
                
                formPago.reset();
                modalPago.classList.add('active');
            });
        });
    };

    // --- 4. ENVIAR COMPROBANTE AL SERVIDOR ---
    document.getElementById('btn-enviar-comprobante').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('comprobante-file');
        if(fileInput.files.length === 0) {
            alert("Por favor, sube el comprobante de pago o transferencia (PDF o Imagen).");
            return;
        }

        const formData = new FormData(formPago);
        formData.append('id_plan', idPlanSeleccionado);
        formData.append('monto', montoPlanSeleccionado);

        const btnEnviar = document.getElementById('btn-enviar-comprobante');
        btnEnviar.innerText = "Enviando archivo...";
        btnEnviar.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/suscripcion.php', {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            
            if(result.success) {
                modalPago.classList.remove('active');
                alert(result.message);
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert("Error de conexión al enviar el comprobante.");
        } finally {
            btnEnviar.innerText = "Enviar Comprobante";
            btnEnviar.disabled = false;
        }
    });

    // UI Modales Base
    document.getElementById('btn-cerrar-modal').addEventListener('click', () => modalPago.classList.remove('active'));
    document.getElementById('btn-cancelar-modal').addEventListener('click', () => modalPago.classList.remove('active'));

    // Arranque
    cargarMiPlan();
    cargarPlanes();
});