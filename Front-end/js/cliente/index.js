document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('flotaChart');
    let chartInstance = null;

    const inputMes = document.getElementById('filtro-mes');
    const btnFiltrar = document.getElementById('btn-filtrar-dashboard');
    const colorSidebarInput = document.getElementById('color-sidebar'); 

    // --- LÓGICA DE PERSONALIZACIÓN DEL MENÚ POR EMPRESA ---
    if (colorSidebarInput) {
        // Pedimos los datos de la sesión para saber en qué empresa estamos
        fetch('/Back-end/cliente/check_session.php')
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    // Creamos una llave única usando el nombre de la empresa sin espacios
                    const nombreEmpresa = result.data.empresa.replace(/\s+/g, '_');
                    const storageKey = 'sidebarColor_' + nombreEmpresa;

                    // Mostrar en el input el color que ya estaba guardado para esta empresa
                    const colorGuardado = localStorage.getItem(storageKey);
                    if (colorGuardado) {
                        colorSidebarInput.value = colorGuardado;
                    } else {
                        colorSidebarInput.value = '#0f172a'; // Valor por defecto
                    }

                    // Evento que cambia el color en tiempo real al usar el selector
                    colorSidebarInput.addEventListener('input', (e) => {
                        const nuevoColor = e.target.value;
                        document.documentElement.style.setProperty('--sidebar-bg', nuevoColor);
                        localStorage.setItem(storageKey, nuevoColor); // Se guarda bajo el nombre de la empresa
                    });
                }
            });
    }
    // ----------------------------------------------------------------------

    const fechaActual = new Date();
    const mesActual = fechaActual.getFullYear() + '-' + String(fechaActual.getMonth() + 1).padStart(2, '0');
    if(inputMes) inputMes.value = mesActual;

    const cargarDashboard = async () => {
        const mes = inputMes ? inputMes.value : '';
        try {
            const res = await fetch(`/Back-end/cliente/dashboard.php?mes=${mes}`);
            const data = await res.json();

            if(data.success) {
                document.getElementById('kpi-vehiculos').innerText = data.kpis.vehiculos;
                document.getElementById('kpi-gasto').innerText = '$' + parseFloat(data.kpis.gasto).toLocaleString('es-MX', {minimumFractionDigits: 2});
                document.getElementById('kpi-mant').innerText = data.kpis.mantenimientos;

                if (chartInstance) chartInstance.destroy();
                if (ctx) {
                    chartInstance = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: ['Activos', 'En Taller', 'Inactivos'],
                            datasets: [{
                                data: data.grafica,
                                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                                borderWidth: 2
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }

                const contenedorMovimientos = document.getElementById('lista-movimientos');
                if(contenedorMovimientos) {
                    if(data.movimientos.length === 0) {
                        contenedorMovimientos.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding-top: 40px;">No hay movimientos en este mes.</p>';
                    } else {
                        let htmlMov = '<ul style="list-style: none; padding: 0;">';
                        data.movimientos.forEach(m => {
                            htmlMov += `<li style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                                <div><strong style="color: var(--text-main);">${m.placas}</strong><br><small style="color: var(--text-muted);">${m.fecha}</small></div>
                                <span style="color: var(--danger); font-weight: bold;">-$${parseFloat(m.costo_total).toLocaleString('es-MX')}</span>
                            </li>`;
                        });
                        htmlMov += '</ul>';
                        contenedorMovimientos.innerHTML = htmlMov;
                    }
                }
            }
        } catch(e) {
            console.error("Error al cargar dashboard", e);
        }
    };

    if(btnFiltrar) {
        btnFiltrar.addEventListener('click', cargarDashboard);
    }

    cargarDashboard();
});