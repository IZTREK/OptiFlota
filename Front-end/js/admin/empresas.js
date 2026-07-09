const modalEmpresa = document.getElementById('modal-empresa');
const cerrarModal = () => modalEmpresa.classList.remove('active');

document.getElementById('btn-abrir-modal').addEventListener('click', () => {
    document.querySelector('.modal-header h2').innerText = 'Dar de alta un nuevo cliente';
    document.getElementById('form-empresa').reset();
    modalEmpresa.classList.add('active');
});

document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-guardar-empresa').addEventListener('click', cerrarModal);

document.querySelectorAll('.data-table .btn-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const button = e.currentTarget;
        const fila = button.closest('tr');
        if (button.dataset.action === 'block') {
            if (confirm(`¿Suspender acceso a la empresa ${fila.cells[0].innerText}?`)) {
                fila.cells[4].innerHTML = '<span class="badge danger">Suspendida</span>';
                button.dataset.action = 'reactivate';
                button.title = 'Reactivar';
                button.setAttribute('aria-label', 'Reactivar');
                button.classList.add('ok');
                button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
            }
        }
        else if (button.dataset.action === 'reactivate') {
            if (confirm(`¿Reactivar cuenta de ${fila.cells[0].innerText}?`)) {
                fila.cells[4].innerHTML = '<span class="badge ok">Activa</span>';
                button.dataset.action = 'block';
                button.title = 'Bloquear Acceso';
                button.setAttribute('aria-label', 'Bloquear Acceso');
                button.classList.remove('ok');
                button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 8 8 8"></path></svg>';
            }
        }
        else if (button.dataset.action === 'edit') {
            document.querySelector('.modal-header h2').innerText = `Editar Cliente: ${fila.cells[0].innerText}`;
            modalEmpresa.classList.add('active');
        }
    });
});
