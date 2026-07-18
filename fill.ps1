$ErrorActionPreference = "Stop"

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    # Modificar Puntos de Función
    $wb1 = $excel.Workbooks.Open("C:\Users\Rafota\Desktop\Proyectos\Optiflota\OptiFlota\Plantilla_Puntos_de_funcion.xls")
    
    $ws1 = $wb1.Sheets.Item("puntos de función sin ajustar")
    # Entradas Externas (EI) - Baja: 4, Media: 3, Alta: 1
    # Asumiendo estructura típica: filas para EI, y columnas para Baja, Media, Alta.
    # Como no conocemos la celda exacta, intentaremos buscar la celda que diga "Entradas" o "Baja"
    
} catch {
    Write-Output "Error: $($_.Exception.Message)"
} finally {
    if ($excel) {
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
}
