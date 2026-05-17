document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-dropdown-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = btn.closest('.dropdown');
      const menu = parent?.querySelector('.dropdown-menu');
      if (!menu) return;

      document.querySelectorAll('.dropdown-menu.show').forEach(m => {
        if (m !== menu) m.classList.remove('show');
      });
      menu.classList.toggle('show');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    }
  });
});
