document.querySelectorAll('.data-table .actions button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const fila = e.target.closest('tr');
        if (e.target.innerText === 'Confirmar Pago') {
            if (confirm(`¿Validar el pago por ${fila.cells[2].innerText} de ${fila.cells[1].innerText}? Esto extenderá su suscripción en OptiFlota.`)) {
                fila.cells[4].innerHTML = '<span class="badge ok">Aprobado</span>';
                e.target.parentElement.innerHTML = '<span style="color:var(--text-muted); font-size: 12px;">Validado</span>';
            }
        }
    });
});

document.querySelectorAll('.btn-icon.adjunto').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('Abriendo comprobante de transferencia bancaria adjunto...');
    });
});
