(() => {
  const raw = sessionStorage.getItem('uporabnik') || localStorage.getItem('uporabnik');
  const u = JSON.parse(raw || 'null');
  if (u && u.vloga === 'admin') location.replace('admin.html');
})();
