(() => {
  try {
    const raw = localStorage.getItem('nastavitve');
    const tema = (raw && JSON.parse(raw).tema) || 'light';
    const dejansko = tema === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : tema;
    document.documentElement.setAttribute('data-tema', dejansko);
    document.documentElement.setAttribute('data-tema-nastavitev', tema);
  } catch {
    document.documentElement.setAttribute('data-tema', 'light');
  }
})();
