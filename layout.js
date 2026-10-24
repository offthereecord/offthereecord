'use strict';
/* Barra de navegación (arriba) y pie de página (abajo).
   Se arman acá UNA sola vez y aparecen en todas las páginas.
   Para sumar una sección nueva al menú, se agrega una línea en SECCIONES. */
(function () {
  const cfg = window.OTR_CONFIG || {};
  const SECCIONES = [
    { clave: 'inicio',      href: 'index.html',      texto: 'Inicio' },
    { clave: 'notas',       href: 'notas.html',      texto: 'Notas' },
    { clave: 'resenas',     href: 'resenas.html',    texto: 'Reseñas' },
    { clave: 'emergentes',  href: 'emergentes.html', texto: 'Emergentes' },
    { clave: 'efemerides',  href: 'efemerides.html', texto: 'Efemérides' },
    { clave: 'playlist',    href: urlSegura(cfg.PLAYLIST_URL), texto: 'Playlist', externo: true },   // YouTube Music
    { clave: 'quien-soy',   href: 'quien-soy.html',  texto: 'Quién soy' },
    { clave: 'contacto',    href: 'contacto.html',   texto: 'Contacto' }
  ].filter(s => s.href);   // si no hay link de playlist, esa opción no se muestra
  const REDES = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', facebook: 'Facebook', spotify: 'Spotify', whatsapp: 'WhatsApp' };
  const actual = document.body.dataset.seccion || '';

  /* ---------- Barra de navegación ---------- */
  const cab = document.getElementById('cabecera');
  if (cab) {
    cab.outerHTML = `
      <header class="barra-sitio" id="barraSitio">
        <div class="barra-in">
          <a class="marca" href="index.html"><img src="logo-simple.svg" alt="" width="38" height="38"><span>Off The Reecord</span></a>
          <button type="button" class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menuPrincipal" aria-label="Abrir el menú">
            <span></span><span></span><span></span>
          </button>
          <nav class="menu" id="menuPrincipal" aria-label="Secciones del sitio">
            ${SECCIONES.map(s => `<a href="${esc(s.href)}"${s.externo ? ' target="_blank" rel="noopener noreferrer"' : ''}${s.clave === actual ? ' aria-current="page"' : ''}>${s.texto}${s.externo ? ' ↗' : ''}</a>`).join('')}
          </nav>
        </div>
      </header>`;

    const barra = document.getElementById('barraSitio');
    const btn = document.getElementById('menuBtn');
    const menu = document.getElementById('menuPrincipal');

    function cerrar() { menu.classList.remove('abierto'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir el menú'); }
    btn.addEventListener('click', () => {
      const abrir = !menu.classList.contains('abierto');
      menu.classList.toggle('abierto', abrir);
      btn.setAttribute('aria-expanded', String(abrir));
      btn.setAttribute('aria-label', abrir ? 'Cerrar el menú' : 'Abrir el menú');
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) cerrar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
    document.addEventListener('click', e => { if (!barra.contains(e.target)) cerrar(); });
    window.addEventListener('scroll', () => barra.classList.toggle('con-sombra', window.scrollY > 4), { passive: true });
  }

  /* ---------- Pie de página ---------- */
  const pie = document.getElementById('pie');
  if (pie) {
    const redes = Object.keys(REDES)
      .map(k => ({ nombre: REDES[k], url: urlSegura((cfg.REDES || {})[k] || '') }))
      .filter(r => r.url);
    const email = ((cfg.CONTACTO || {}).email || '').trim();

    pie.outerHTML = `
      <footer class="pie-sitio">
        <div class="pie-in">
          <div class="pie-marca">
            <img src="logo-simple.svg" alt="" width="44" height="44">
            <div><strong>Off The Reecord</strong><span>Rock under argentino, crónicas y reseñas.</span></div>
          </div>
          ${redes.length ? `
          <div>
            <h2>Seguinos</h2>
            <ul>${redes.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.nombre)}</a></li>`).join('')}</ul>
          </div>` : '<div></div>'}
          ${email ? `
          <div>
            <h2>Contacto</h2>
            <ul><li><a href="mailto:${esc(email)}">${esc(email)}</a></li></ul>
          </div>` : '<div></div>'}
          <p class="pie-copy">© ${new Date().getFullYear()} Off The Reecord</p>
        </div>
      </footer>`;
  }

  /* ---------- Efemérides: estilos, piezas comunes y cartel del día ---------- */
  const V = '?v=7';
  if (!document.querySelector('link[href^="efem.css"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'efem.css' + V;
    document.head.appendChild(l);
  }
  function cargarScript(src) {
    return new Promise((ok, fallo) => {
      const s = document.createElement('script');
      s.src = src + V; s.onload = ok; s.onerror = fallo;
      document.body.appendChild(s);
    });
  }
  (async () => {
    try {
      if (typeof abrirDialogoEfemerides !== 'function') await cargarScript('efem-comun.js');
      await cargarScript('efemerides-popup.js');
    } catch (e) { console.error('No se pudo cargar el cartel de efemérides', e); }
  })();
})();
