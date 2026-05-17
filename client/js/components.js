document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSel = btn.getAttribute('data-bs-target') || btn.getAttribute('href');
      const target = document.querySelector(targetSel);
      if (target) target.classList.toggle('show');
    });
  });

  document.querySelectorAll('[data-bs-toggle="pill"], [data-bs-toggle="tab"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSel = btn.getAttribute('data-bs-target') || btn.getAttribute('href');
      const target = document.querySelector(targetSel);
      if (!target) return;

      const tabContent = target.parentElement;
      const navContainer = btn.closest('.nav');

      if (navContainer) {
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        btn.classList.add('active');
      }
      if (tabContent) {
        tabContent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active', 'show'));
        target.classList.add('active', 'show');
      }
    });
  });
});
