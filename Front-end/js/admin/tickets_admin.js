const modal = document.getElementById('modal-atencion');
let filaActual = null;

const cerrarAtencion = () => {
    modal.classList.remove('active');
    document.getElementById('admin-respuesta').value = ''; // Limpiar respuesta al cerrar
};

document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarAtencion);
document.getElementById('btn-cancelar-atencion').addEventListener('click', cerrarAtencion);

document.querySelectorAll('.data-table .actions button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        filaActual = e.target.closest('tr');
        const fecha = filaActual.cells[0].innerText;
        const empresa = filaActual.cells[1].innerText;
        const idTicket = filaActual.cells[2].innerText;
        const asunto = filaActual.cells[3].innerText;
        const estadoTabla = filaActual.cells[4].innerText.toLowerCase();

        document.getElementById('ticket-modal-title').innerText = `Atendiendo: ${idTicket}`;
        document.getElementById('ticket-modal-empresa').innerText = empresa;
        document.getElementById('ticket-modal-fecha').innerText = fecha;
        document.getElementById('ticket-modal-asunto').innerText = `"${asunto}"`;

        const selectEstado = document.getElementById('select-estado-ticket');
        if (estadoTabla.includes('pendiente')) selectEstado.value = 'pendiente';
        else if (estadoTabla.includes('proceso')) selectEstado.value = 'proceso';
        else selectEstado.value = 'resuelto';

        modal.classList.add('active');
    });
});

document.getElementById('btn-actualizar-estado').addEventListener('click', () => {
    if (!filaActual) return;
    const respuesta = document.getElementById('admin-respuesta').value.trim();

    if (respuesta === "") {
        alert("Por favor, escribe una respuesta para el cliente antes de actualizar.");
        return;
    }

    const nuevoEstado = document.getElementById('select-estado-ticket').value;
    const celdaEstado = filaActual.cells[4];

    if (nuevoEstado === 'pendiente') {
        celdaEstado.innerHTML = '<span class="badge danger">Pendiente</span>';
    } else if (nuevoEstado === 'proceso') {
        celdaEstado.innerHTML = '<span class="badge warning">En Proceso</span>';
    } else if (nuevoEstado === 'resuelto') {
        celdaEstado.innerHTML = '<span class="badge ok">Resuelto</span>';
    }

    cerrarAtencion();
    alert("Respuesta enviada al cliente. El estado del ticket ha sido actualizado.");
});
