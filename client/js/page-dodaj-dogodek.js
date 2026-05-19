(() => {
  const zac = document.querySelector('[data-zacetni-datum]');
  if (zac) zac.min = new Date().toISOString().split('T')[0];
})();
