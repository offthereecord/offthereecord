'use strict';
/* Página de contacto: arma las tarjetas con los datos de config.js */
(function () {
  const cfg = window.OTR_CONFIG || {};
  const NOMBRES = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', facebook: 'Facebook', spotify: 'Spotify', whatsapp: 'WhatsApp' };
  const tarjetas = [];

  const email = ((cfg.CONTACTO || {}).email || '').trim();
  if (email) tarjetas.push({ tipo: 'Mail', titulo: email, detalle: 'Escribinos un mail', href: 'mailto:' + email, externo: false });

  Object.keys(NOMBRES).forEach(k => {
    const url = urlSegura((cfg.REDES || {})[k]);
    if (!url) return;
    let usuario = '';
    try { usuario = new URL(url).pathname.split('/').filter(Boolean).pop() || ''; } catch (e) { /* sin problema */ }
    tarjetas.push({
      tipo: NOMBRES[k], titulo: usuario ? '@' + usuario.replace(/^@/, '') : NOMBRES[k],
      detalle: 'Seguinos y escribinos', href: url, externo: true
    });
  });

  const cont = document.getElementById('contacto');
  cont.innerHTML = tarjetas.length
    ? tarjetas.map(t => `
        <a class="contacto-card" href="${esc(t.href)}"${t.externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          <span class="categoria">${esc(t.tipo)}</span>
          <strong>${esc(t.titulo)}</strong>
          <span class="det">${esc(t.detalle)}</span>
        </a>`).join('')
    : '<p class="vacio">Pronto vamos a sumar nuestros medios de contacto.</p>';
})();
