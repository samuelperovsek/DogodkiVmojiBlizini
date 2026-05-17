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

  const navbar = document.querySelector('.navbar.fixed-top');
  if (navbar) {
    const toggleScrolled = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 24);
    };
    toggleScrolled();
    window.addEventListener('scroll', toggleScrolled, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }
});
