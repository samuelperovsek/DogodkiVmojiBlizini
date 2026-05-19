(() => {
  const raw = sessionStorage.getItem('uporabnik') || localStorage.getItem('uporabnik');
  const u = JSON.parse(raw || 'null');
  if (!u) {
    location.replace('prijava.html?razlog=potrebna-prijava&povratek=dodaj-dogodek.html');
  } else if (u.vloga === 'admin') {
    location.replace('admin.html');
  } else if (u.vloga !== 'organizator') {
    location.replace('prijava.html?razlog=samo-organizator');
  }
})();
