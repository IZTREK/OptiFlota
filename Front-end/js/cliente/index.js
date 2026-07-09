document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('flotaChart');

    if (ctx) {
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Activos', 'En Taller', 'Inactivos'],
                datasets: [{
                    data: [35, 8, 2], // Datos de prueba: 35 Activos, 8 En Taller, 2 Inactivos
                    backgroundColor: [
                        '#10b981', // Verde para Activos (from --success)
                        '#f59e0b', // Naranja/Amarillo para En Taller (from --warning)
                        '#ef4444'  // Rojo para Inactivos (from --danger)
                    ],
                    borderColor: [
                        '#ffffff',
                        '#ffffff',
                        '#ffffff'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Permite que el gráfico se ajuste libremente
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#1f2937' // text-main color
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed + ' vehículos';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
});