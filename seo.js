'use strict';
/* Datos para buscadores (Google) y para cuando alguien comparte un link.
   Completa título, descripción, imagen, dirección "oficial" y datos estructurados de cada página. */
const OTR_SEO = (function () {
  const BASE = 'https://offthereecord.github.io/offthereecord/';
  const IMAGEN_BASE = BASE + 'og-imagen.jpg';

  function poner(atributo, nombre, valor) {
    let m = document.head.querySelector('meta[' + atributo + '="' + nombre + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute(atributo, nombre); document.head.appendChild(m); }
    m.setAttribute('content', valor);
  }

  /* Saca las etiquetas de un texto con formato y lo corta sin partir palabras */
  function resumen(html, largo) {
    const t = (new DOMParser().parseFromString(String(html || ''), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length <= largo) return t;
    return t.slice(0, largo).replace(/\s+\S*$/, '') + '…';
  }

  /* o = { titulo, descripcion, imagen, ruta, tipo, jsonld, noindex } */
  function aplicar(o) {
    const titulo = o.titulo + ' · Off The Reecord';
    const desc = o.descripcion || 'Rock under argentino, efemérides, crónicas de recitales y coberturas fotográficas.';
    const img = o.imagen && /^https?:\/\//i.test(o.imagen) ? o.imagen : IMAGEN_BASE;
    const url = BASE + o.ruta;
    document.title = titulo;
    poner('name', 'description', desc);
    poner('property', 'og:type', o.tipo || 'website');
    poner('property', 'og:title', titulo);
    poner('property', 'og:description', desc);
    poner('property', 'og:image', img);
    poner('property', 'og:url', url);
    poner('name', 'twitter:card', 'summary_large_image');
    poner('name', 'robots', o.noindex ? 'noindex' : 'index, follow');

    /* dirección oficial: si ya existe la página estática de esta nota, apunta a ella; si no, a sí misma */
    let can = document.head.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement('link'); can.rel = 'canonical'; document.head.appendChild(can); }
    can.href = url;
    if (o.estatica && !o.noindex) {
      fetch(BASE + o.estatica, { method: 'HEAD' }).then(r => { if (r.ok) can.href = BASE + o.estatica; }).catch(() => {});
    }

    let s = document.getElementById('datos-estructurados');
    if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'datos-estructurados'; document.head.appendChild(s); }
    s.textContent = o.jsonld ? JSON.stringify(o.jsonld).replace(/</g, '\\u003c') : '';
  }

  const EDITOR = { '@type': 'Organization', name: 'Off The Reecord', url: BASE, logo: BASE + 'favicon.svg' };

  return { BASE, EDITOR, resumen, aplicar };
})();
