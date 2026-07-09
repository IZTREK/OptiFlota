document.addEventListener('DOMContentLoaded', () => {
    const infoMiPlan = document.getElementById('info-mi-plan');
    const plansContainer = document.getElementById('plans-container');
    const modalPago = document.getElementById('modal-pago');
    const formPago = document.getElementById('form-pago-datos');
    const inputPlanSeleccionado = document.getElementById('input-plan-seleccionado');
    
    let idPlanSeleccionado = null;
    let montoPlanSeleccionado = 0;

    const cargarMiPlan = async () => {
        try {
            const res = await fetch('/Back-end/cliente/suscripcion.php?action=get_mi_plan');
            const data = await res.json();
            
            if(data) {
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

    const cargarPlanes = async () => {
        try {
            const res = await fetch('/Back-end/cliente/suscripcion.php?action=get_planes');
            const planes = await res.json();
            
            plansContainer.innerHTML = ''; 
            
            planes.forEach(p => {
                
                // 🛑 MAGIA AQUÍ: Si el plan se llama "Trial", lo ignoramos y no lo dibujamos
                if(p.nombre.toLowerCase() === 'trial') return;

                const costoFormateado = '$' + parseFloat(p.costo_mensual).toLocaleString('es-MX', {minimumFractionDigits: 2});
                const limiteTxt = p.limite_vehiculos >= 9999 ? 'Flotillas ilimitadas' : `Hasta ${p.limite_vehiculos} vehículos`;
                
                let featuresList = `<ul style="list-style: none; padding: 0; margin: 15px 0; text-align: left; font-size: 13px; color: var(--text-muted); line-height: 1.6;">`;
                featuresList += `<li>✅ ${limiteTxt}</li>`;
                featuresList += `<li>✅ Módulo Vehículos y Combustible</li>`;
                featuresList += `<li>${p.mod_diagnosticos == 1 ? '✅' : '❌'} Módulo de Diagnósticos</li>`;
                featuresList += `<li>${p.mod_mantenimiento == 1 ? '✅' : '❌'} Módulo de Mantenimiento</li>`;
                featuresList += `<li>${p.mod_tickets == 1 ? '✅' : '❌'} Soporte Premium</li>`;
                featuresList += `</ul>`;

                plansContainer.innerHTML += `
                    <div class="plan-card">
                        <h4>${p.nombre}</h4>
                        <p>${costoFormateado} / mes</p>
                        ${featuresList}
                        <button class="btn-secondary btn-seleccionar-plan" style="width: 100%; margin-top: auto;" 
                            data-id="${p.id}" data-nombre="${p.nombre}" data-precio="${p.costo_mensual}">
                            Seleccionar Plan
                        </button>
                    </div>
                `;
            });
            
            asignarEventosBotones();
        } catch (e) {
            plansContainer.innerHTML = '<p style="color:red;">Error al cargar los planes disponibles.</p>';
        }
    };

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
                document.getElementById('modal-pago').classList.add('active');
            });
        });
    };

    document.getElementById('btn-enviar-comprobante').addEventListener('click', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('comprobante-file');
        if(fileInput.files.length === 0) {
            alert("Por favor, sube el comprobante de pago (PDF o Imagen).");
            return;
        }

        const formData = new FormData(formPago);
        formData.append('id_plan', idPlanSeleccionado);
        formData.append('monto', montoPlanSeleccionado);

        const btnEnviar = document.getElementById('btn-enviar-comprobante');
        btnEnviar.innerText = "Enviando...";
        btnEnviar.disabled = true;

        try {
            const res = await fetch('/Back-end/cliente/suscripcion.php', { method: 'POST', body: formData });
            const result = await res.json();
            alert(result.message);
            if(result.success) document.getElementById('modal-pago').classList.remove('active');
        } catch (err) {
            alert("Error de conexión al enviar el comprobante.");
        } finally {
            btnEnviar.innerText = "Enviar Comprobante";
            btnEnviar.disabled = false;
        }
    });

    document.getElementById('btn-cerrar-modal').addEventListener('click', () => document.getElementById('modal-pago').classList.remove('active'));
    document.getElementById('btn-cancelar-modal').addEventListener('click', () => document.getElementById('modal-pago').classList.remove('active'));

    cargarMiPlan();
    cargarPlanes();
});