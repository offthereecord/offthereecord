'use strict';
/* Medición ANÓNIMA de visitas.
   Anota: qué página se abrió, cuánto tiempo estuvo en pantalla, hasta dónde se bajó y en qué se hizo clic.
   NO guarda nombres, mails ni direcciones IP; solo un código al azar que identifica al navegador.
   No cuenta: tus propias visitas desde el navegador donde entrás al panel, robots, ni a quien
   tenga activado "No rastrear". Los datos se ven en el panel, pestaña «Estadísticas». */
(function () {
  const cfg = window.OTR_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) return;
  try { if (localStorage.getItem('otr_no_contar') === '1') return; } catch (e) { /* sin problema */ }
  if (navigator.webdriver || /bot|crawl|spider|headless|lighthouse|facebookexternalhit/i.test(navigator.userAgent || '')) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  if (window.__otrAnalitica) return;
  window.__otrAnalitica = true;

  function azar() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  function guardado(nombre, clave) {          // un código que se recuerda en este navegador
    try {
      const alm = window[nombre];
      let v = alm.getItem(clave);
      if (!v) { v = azar(); alm.setItem(clave, v); }
      return v;
    } catch (e) { return azar(); }
  }
  const visitante = guardado('localStorage', 'otr_vid');    // el mismo navegador = el mismo visitante
  const sesion = guardado('sessionStorage', 'otr_sid');     // una visita (se reinicia al cerrar la pestaña)
  const paginaId = azar().replace(/-/g, '').slice(0, 20);   // esta apertura de página

  /* Página: archivo + (si corresponde) la nota, cobertura o banda abierta */
  const archivo = location.pathname.split('/').pop() || 'index.html';
  const params = new URLSearchParams(location.search);
  const claveExtra = (archivo === 'nota.html' || archivo === 'banda.html') ? 'slug' : archivo === 'cobertura.html' ? 'id' : '';
  const RUTA = (archivo + (claveExtra && params.get(claveExtra) ? '?' + claveExtra + '=' + params.get(claveExtra) : '')).slice(0, 200);

  function dispositivo() {
    const w = window.innerWidth || 1024;
    return w < 768 ? 'celular' : w < 1100 ? 'tablet' : 'escritorio';
  }

  /* De dónde llegó: solo se anota en la primera página de cada visita */
  function origen() {
    try {
      if (sessionStorage.getItem('otr_o')) return null;
      sessionStorage.setItem('otr_o', '1');
    } catch (e) { /* sin problema */ }
    const utm = (params.get('utm_source') || '').trim().toLowerCase();
    if (utm) return utm.slice(0, 80);
    let host = '';
    try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { /* sin referencia */ }
    if (!host) return 'Directo / app';
    if (host === location.hostname) return null;
    const mapa = [
      [/instagram\./, 'Instagram'], [/facebook\.|fb\.com|fb\.me/, 'Facebook'],
      [/(^|\.)t\.co$|twitter\.|(^|\.)x\.com$/, 'X (Twitter)'], [/google\./, 'Google'],
      [/youtube\.|youtu\.be/, 'YouTube'], [/whatsapp\.|wa\.me/, 'WhatsApp'],
      [/tiktok\./, 'TikTok'], [/bing\.|duckduckgo\.|yahoo\./, 'Buscador']
    ];
    for (const par of mapa) if (par[0].test(host)) return par[1];
    return host.slice(0, 80);
  }

  function enviar(datos) {
    const cuerpo = JSON.stringify(Object.assign({ visitante: visitante, sesion: sesion, pagina_id: paginaId, ruta: RUTA }, datos));
    try {
      fetch(cfg.SUPABASE_URL + '/rest/v1/analitica', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY, Prefer: 'return=minimal' },
        body: cuerpo
      }).catch(function () { /* si falla, no pasa nada */ });
    } catch (e) { /* sin problema */ }
  }

  /* 1) Entrada */
  enviar({ tipo: 'vista', dispositivo: dispositivo(), origen: origen() });

  /* 2) Tiempo en pantalla y hasta dónde se bajó */
  let desde = document.visibilityState === 'hidden' ? null : Date.now();
  let acumuladoMs = 0, enviadosSeg = 0, maxScroll = 0;

  function medirScroll() {
    const el = document.documentElement;
    const alto = Math.max(el.scrollHeight, 1);
    const pct = Math.round(Math.min(1, ((window.scrollY || window.pageYOffset || 0) + (window.innerHeight || 0)) / alto) * 100);
    if (pct > maxScroll) maxScroll = pct;
  }
  window.addEventListener('scroll', medirScroll, { passive: true });
  medirScroll();

  function enviarSalida() {
    if (desde !== null) { acumuladoMs += Date.now() - desde; desde = null; }
    const total = Math.min(Math.round(acumuladoMs / 1000), 1800);      // tope de 30 min por página
    const nuevos = total - enviadosSeg;
    if (nuevos <= 0) return;
    enviadosSeg = total;
    enviar({ tipo: 'salida', segundos: nuevos, scroll: maxScroll });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') enviarSalida();
    else if (desde === null) desde = Date.now();
  });
  window.addEventListener('pagehide', enviarSalida);

  /* 3) Clics en enlaces y botones */
  let clics = 0;
  function describir(el) {
    if (el.tagName === 'A') {
      let u;
      try { u = new URL(el.href, location.href); } catch (e) { return null; }
      if (u.protocol === 'mailto:') return 'mail de contacto';
      if (u.hostname === location.hostname) {
        const a = u.pathname.split('/').pop() || 'index.html';
        const p = u.searchParams;
        const extra = (a === 'nota.html' || a === 'banda.html') ? p.get('slug') : a === 'cobertura.html' ? p.get('id') : '';
        return 'ir a: ' + a + (extra ? '?' + extra : '');
      }
      return 'externo: ' + u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.slice(0, 60) : '');
    }
    const etiqueta = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
    return etiqueta ? 'botón: ' + etiqueta : null;
  }
  document.addEventListener('click', function (ev) {
    if (clics >= 60) return;
    const el = ev.target && ev.target.closest ? ev.target.closest('a, button') : null;
    if (!el) return;
    const destino = describir(el);
    if (!destino) return;
    clics++;
    enviar({ tipo: 'clic', destino: destino.slice(0, 160) });
  }, true);
})();
