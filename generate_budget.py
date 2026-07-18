import pandas as pd

# Crear un DataFrame para Puntos de Función
fpa_data = {
    'Módulo / Funcionalidad': [
        'Usuarios/Roles', 'Login/Autenticación', 'Gestión de Permisos',
        'Vehículo/Estado', 'Registro de Diagnóstico', 'Consulta de Estado',
        'Calendario/Recordatorios', 'Crear Tarea Mantenimiento', 'Alertas automáticas',
        'Consumo/Cargas', 'Registro de Carga', 'Gráficas de Rendimiento',
        'Siniestro', 'Reporte de Incidente', 'Seguimiento de Siniestro',
        'Dashboard Principal', 'Exportación PDF/Excel',
        'Ticket', 'Crear Ticket', 'Actualizar Estado Ticket', 'Vista Tablero Tickets'
    ],
    'Tipo': ['ILF', 'EI', 'EI', 'ILF', 'EI', 'EQ', 'ILF', 'EI', 'EO', 'ILF', 'EI', 'EO', 'ILF', 'EI', 'EQ', 'EO', 'EO', 'ILF', 'EI', 'EI', 'EQ'],
    'Complejidad': ['Media', 'Baja', 'Media', 'Alta', 'Media', 'Baja', 'Media', 'Media', 'Media', 'Media', 'Baja', 'Alta', 'Media', 'Alta', 'Media', 'Alta', 'Media', 'Baja', 'Baja', 'Baja', 'Media'],
    'Puntos (Peso)': [10, 3, 4, 15, 4, 3, 10, 4, 5, 10, 3, 7, 10, 6, 4, 7, 5, 7, 3, 3, 4]
}
df_fpa = pd.DataFrame(fpa_data)
total_ufp = df_fpa['Puntos (Peso)'].sum()

# DataFrame de Ajuste VAF
vaf_data = {
    'Factor': ['Comunicación', 'Proc. Distribuido', 'Rendimiento', 'Configuración', 'Transacciones', 'Entrada en línea', 'Eficiencia', 'Actualización en línea', 'Complejidad Lógica', 'Reusabilidad', 'Instalación', 'Operación', 'Múltiples sitios', 'Flexibilidad'],
    'Valor (0-5)': [3, 2, 4, 2, 3, 5, 4, 5, 3, 4, 3, 4, 2, 4]
}
df_vaf = pd.DataFrame(vaf_data)
tdi = df_vaf['Valor (0-5)'].sum()
vaf = 0.65 + (0.01 * tdi)
afp = total_ufp * vaf

# DataFrame de COCOMO y Costos
kloc = (afp * 50) / 1000
esfuerzo = 3.0 * (kloc ** 1.12)
tiempo = 2.5 * (esfuerzo ** 0.35)
personal = esfuerzo / tiempo
costo_mensual = 3000
costo_total = esfuerzo * costo_mensual

cocomo_data = {
    'Métrica': [
        'Total Puntos Función Sin Ajustar (UFP)', 
        'Suma de Factores (TDI)', 
        'Factor de Ajuste (VAF)', 
        'Puntos de Función Ajustados (AFP)',
        'Líneas de Código (KLOC)',
        'Esfuerzo (Personas-Mes)',
        'Tiempo de Desarrollo (Meses)',
        'Personal Recomendado',
        'Costo Promedio Mensual ($)',
        'Costo Total Estimado ($)'
    ],
    'Valor': [
        total_ufp, tdi, round(vaf, 2), round(afp, 2), round(kloc, 2), 
        round(esfuerzo, 2), round(tiempo, 2), round(personal, 2), 
        costo_mensual, round(costo_total, 2)
    ]
}
df_cocomo = pd.DataFrame(cocomo_data)

# Guardar en un nuevo archivo Excel
output_path = r'C:\Users\Rafota\Desktop\Proyectos\Optiflota\OptiFlota\Presupuesto_Optiflota_Calculado.xlsx'
with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
    df_fpa.to_excel(writer, sheet_name='Detalle Puntos de Función', index=False)
    df_vaf.to_excel(writer, sheet_name='Factores de Ajuste (VAF)', index=False)
    df_cocomo.to_excel(writer, sheet_name='Resumen COCOMO y Costos', index=False)

print("Archivo generado exitosamente.")
