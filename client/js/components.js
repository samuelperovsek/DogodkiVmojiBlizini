function pridobiToastContainer() {
  let el = document.querySelector('.toast-container');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

const TOAST_ICONS = {
  success: 'bi-check-circle-fill',
  danger:  'bi-exclamation-octagon-fill',
  warning: 'bi-exclamation-triangle-fill',
  info:    'bi-info-circle-fill',
};

export function pokaziToast(tip, sporocilo, naslov = null, trajanje = 4000) {
  const container = pridobiToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tip}`;
  toast.innerHTML = `
    <i class="bi ${TOAST_ICONS[tip] || TOAST_ICONS.info} toast-icon"></i>
    <div class="toast-body">
      ${naslov ? `<div class="toast-title">${naslov}</div>` : ''}
      <div>${sporocilo}</div>
    </div>
    <button type="button" class="toast-close" aria-label="Zapri">&times;</button>
  `;

  const odstrani = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', odstrani);
  if (trajanje > 0) setTimeout(odstrani, trajanje);

  container.appendChild(toast);
  return toast;
}

window.pokaziToast = pokaziToast;

export function potrdiAkcijo({ naslov = 'Potrdi dejanje', sporocilo = '', vnos = null, gumbPotrdi = 'Potrdi', gumbPreklic = 'Prekliči', tipGumba = 'btn-primary' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <h3>${naslov}</h3>
          <button type="button" class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
          ${sporocilo ? `<p class="mb-3">${sporocilo}</p>` : ''}
          ${vnos ? `
            <label class="form-label">${vnos.label || 'Razlog'}</label>
            <textarea class="form-control" rows="3" placeholder="${vnos.placeholder || ''}" data-confirm-input>${vnos.value || ''}</textarea>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-primary" data-close>${gumbPreklic}</button>
          <button type="button" class="btn ${tipGumba}" data-potrdi>${gumbPotrdi}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const zapri = (rezultat) => {
      overlay.classList.remove('show');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      setTimeout(() => overlay.remove(), 250);
      resolve(rezultat);
    };

    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => zapri(null)));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) zapri(null); });
    overlay.querySelector('[data-potrdi]').addEventListener('click', () => {
      const vnosEl = overlay.querySelector('[data-confirm-input]');
      zapri(vnos ? (vnosEl?.value || '') : true);
    });

    const input = overlay.querySelector('[data-confirm-input]');
    if (input) input.focus();
  });
}

window.potrdiAkcijo = potrdiAkcijo;

function ovijGesloVnos(input) {
  if (input.dataset.passwordWrapped === '1') return;
  if (input.type !== 'password') return;
  input.dataset.passwordWrapped = '1';

  const wrapper = document.createElement('div');
  wrapper.className = 'password-wrapper';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'password-toggle';
  btn.setAttribute('aria-label', 'Prikaži/skrij geslo');
  btn.innerHTML = '<i class="bi bi-eye"></i>';
  wrapper.appendChild(btn);

  btn.addEventListener('click', () => {
    const skrij = input.type === 'password';
    input.type = skrij ? 'text' : 'password';
    btn.innerHTML = skrij ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  });
}

function vsiliKonecPoZacetku() {
  const zacDatum = document.querySelector('input[type="date"][data-zacetni-datum]');
  const koncDatum = document.querySelector('input[type="date"][data-koncni-datum]');
  const zacUra = document.querySelector('input[type="time"][data-zacetna-ura]');
  const koncUra = document.querySelector('input[type="time"][data-koncna-ura]');

  const sync = () => {
    if (zacDatum && koncDatum && zacDatum.value) koncDatum.min = zacDatum.value;
    if (zacUra && koncUra && zacUra.value && (!koncDatum || !koncDatum.value || koncDatum.value === zacDatum?.value)) {
      koncUra.min = zacUra.value;
    } else if (koncUra) {
      koncUra.removeAttribute('min');
    }
  };

  [zacDatum, koncDatum, zacUra, koncUra].forEach(el => el && el.addEventListener('change', sync));
  sync();
}

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

  document.querySelectorAll('input[type="password"][data-toggle-password]').forEach(ovijGesloVnos);

  vsiliKonecPoZacetku();

  const sidebar = document.querySelector('.admin-sidebar');
  if (sidebar && !document.querySelector('.admin-sidebar-toggle')) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'admin-sidebar-toggle';
    toggle.setAttribute('aria-label', 'Odpri meni');
    toggle.innerHTML = '<i class="bi bi-list"></i>';

    const backdrop = document.createElement('div');
    backdrop.className = 'admin-sidebar-backdrop';

    document.body.append(toggle, backdrop);

    const zapri = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    };
    toggle.addEventListener('click', () => {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    });
    backdrop.addEventListener('click', zapri);
    sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', zapri));
  }
});
