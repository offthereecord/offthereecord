/* Genera una página fija por cada nota, banda y cobertura publicada (para que Google y WhatsApp las lean bien)
   y el sitemap.xml. Lo ejecuta GitHub solo, una vez por día o cuando vos lo pidas. No hace falta tocarlo. */
import fs from 'node:fs';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';

const BASE = 'https://offthereecord.github.io/offthereecord/';
const IMAGEN_BASE = BASE + 'og-imagen.jpg';
const config = fs.readFileSync('config.js', 'utf8');
const API = process.env.SUPABASE_URL_PRUEBA || config.match(/SUPABASE_URL:\s*'([^']+)'/)[1];
const CLAVE = config.match(/SUPABASE_KEY:\s*'([^']+)'/)[1];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CATEGORIAS = {};   // el nombre de la categoría se completa en el navegador
const slugify = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const seguro = u => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
const fechaIso = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toISOString(); };
const fechaLarga = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
const resumen = (html, n) => {
  const t = sanitizeHtml(String(html || ''), { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…';
};
const limpiar = html => sanitizeHtml(String(html || ''), {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'figure', 'figcaption', 'u', 's']),
  allowedAttributes: { a: ['href'], img: ['src', 'alt'] },
  allowedSchemes: ['http', 'https', 'mailto']
});

async function leer(tabla, columnas, orden) {
  const r = await fetch(`${API}/rest/v1/${tabla}?select=*&publicada=eq.true&order=${orden}`,
    { headers: { apikey: CLAVE, Authorization: 'Bearer ' + CLAVE } });
  if (!r.ok) throw new Error(`No se pudo leer ${tabla}: ${r.status} ${await r.text()}`);
  return r.json();
}

const plantilla = n => fs.readFileSync(n + '.html', 'utf8');

function armar(html, o) {
  const titulo = o.titulo + ' · Off The Reecord';
  const img = seguro(o.imagen) || IMAGEN_BASE;
  const cabeza = `  <base href="../">
  <meta name="description" content="${esc(o.descripcion)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE + o.ruta}">
  <meta property="og:type" content="${o.tipo}">
  <meta property="og:site_name" content="Off The Reecord">
  <meta property="og:locale" content="es_AR">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(o.descripcion)}">
  <meta property="og:image" content="${esc(img)}">
  <meta property="og:url" content="${BASE + o.ruta}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json" id="datos-estructurados">${JSON.stringify(o.jsonld).replace(/</g, '\\u003c')}</script>
`;
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/\s*<meta (?:name|property)="(?:description|og:[a-z_:]+|twitter:card|robots)"[^>]*>/g, '')
    .replace(/(<meta charset="[^"]*">)/i, `$1\n${cabeza}`);
  /* le dice a los scripts de la página qué nota/banda/cobertura es */
  html = html.replace(/<script src=/, `<script>${o.globales}</script>\n  <script src=`);
  /* el seo.js se carga antes que el de la página */
  if (!html.includes('seo.js')) html = html.replace(/(<script src="(?:nota|banda|cobertura)\.js)/, '<script src="seo.js?v=1"></script>\n  $1');
  if (!html.includes('Cargando…')) throw new Error('La plantilla no tiene el lugar para el contenido.');
  return html.replace('<p class="vacio">Cargando…</p>', o.contenido);
}

function guardar(carpeta, nombre, texto) {
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, nombre), texto);
}

/* ---------- Armado ---------- */
for (const c of ['notas', 'bandas', 'coberturas']) fs.rmSync(c, { recursive: true, force: true });
const urls = [];
const fijas = ['', 'notas.html', 'coberturas.html', 'emergentes.html', 'efemerides.html', 'quien-soy.html', 'contacto.html'];

const notas = await leer('notas', 'titulo,slug,bajada,contenido,imagen_portada,autor,fecha_publicacion,actualizada_en', 'fecha_publicacion.desc');
const tNota = plantilla('nota');
for (const n of notas) {
  const slug = slugify(n.slug);
  if (!slug || slug !== n.slug) { console.log('Nota salteada (slug raro):', n.slug); continue; }
  const ruta = `notas/${slug}.html`;
  const desc = n.bajada ? resumen(n.bajada, 160) : resumen(n.contenido, 160);
  const portada = seguro(n.imagen_portada);
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: n.titulo, description: desc,
    ...(portada ? { image: [portada] } : {}),
    datePublished: fechaIso(n.fecha_publicacion), dateModified: fechaIso(n.actualizada_en || n.fecha_publicacion),
    author: { '@type': 'Person', name: n.autor || 'Off The Reecord' },
    publisher: { '@type': 'Organization', name: 'Off The Reecord', url: BASE, logo: { '@type': 'ImageObject', url: BASE + 'favicon.svg' } },
    mainEntityOfPage: BASE + ruta, inLanguage: 'es-AR'
  };
  const contenido = `<h1>${esc(n.titulo)}</h1>
    <div class="meta">${esc([n.autor, fechaLarga(n.fecha_publicacion)].filter(Boolean).join(' · '))}</div>
    ${portada ? `<img class="portada-nota" src="${esc(portada)}" alt="${esc(n.titulo)}">` : ''}
    ${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
    <div class="contenido">${limpiar(n.contenido)}</div>`;
  guardar('notas', slug + '.html', armar(tNota, { titulo: n.titulo, descripcion: desc, imagen: portada, ruta, tipo: 'article', jsonld, contenido, globales: `window.OTR_SLUG=${JSON.stringify(slug)};window.OTR_PAGINA=${JSON.stringify('nota.html?slug=' + slug)};` }));
  urls.push([ruta, fechaIso(n.actualizada_en || n.fecha_publicacion).slice(0, 10)]);
}

const bandas = await leer('bandas', 'nombre,slug,genero,ciudad,bio,imagen', 'nombre.asc');
const tBanda = plantilla('banda');
for (const b of bandas) {
  const slug = slugify(b.slug);
  if (!slug || slug !== b.slug) { console.log('Banda salteada (slug raro):', b.slug); continue; }
  const ruta = `bandas/${slug}.html`;
  const detalle = [b.genero, b.ciudad].filter(Boolean).join(' · ');
  const desc = resumen([b.nombre, detalle, b.bio].filter(Boolean).join('. '), 160);
  const foto = seguro(b.imagen);
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'MusicGroup', name: b.nombre, description: resumen(b.bio, 300) || undefined,
    ...(foto ? { image: foto } : {}), ...(b.genero ? { genre: b.genero } : {}),
    ...(b.ciudad ? { foundingLocation: { '@type': 'Place', name: b.ciudad } } : {}), url: BASE + ruta
  };
  const parrafos = String(b.bio || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const contenido = `<div class="banda-pagina">${foto ? `<img class="banda-foto" src="${esc(foto)}" alt="${esc(b.nombre)}">` : ''}<div>
    <h1>${esc(b.nombre)}</h1>${detalle ? `<p class="sub">${esc(detalle)}</p>` : ''}<div class="texto-pagina">${parrafos}</div></div></div>`;
  guardar('bandas', slug + '.html', armar(tBanda, { titulo: b.nombre + (detalle ? ' · ' + detalle : ''), descripcion: desc, imagen: foto, ruta, tipo: 'profile', jsonld, contenido, globales: `window.OTR_SLUG=${JSON.stringify(slug)};window.OTR_PAGINA=${JSON.stringify('banda.html?slug=' + slug)};` }));
  urls.push([ruta, '']);
}

const cobs = await leer('coberturas', 'id,titulo,artista,lugar,fecha_evento,descripcion,fotos,portada,credito,actualizada_en', 'fecha_evento.desc');
const tCob = plantilla('cobertura');
for (const c of cobs) {
  const nombre = (slugify(c.titulo) || 'cobertura') + '-' + String(c.id).replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  const ruta = `coberturas/${nombre}.html`;
  const fotos = (Array.isArray(c.fotos) && c.fotos.length ? c.fotos : (c.portada ? [c.portada] : [])).map(seguro).filter(Boolean);
  const detalle = [c.artista, c.lugar, c.fecha_evento ? fechaLarga(c.fecha_evento) : ''].filter(Boolean).join(' · ');
  const desc = resumen([detalle, c.descripcion].filter(Boolean).join('. '), 160) || 'Galería de fotos de un recital.';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'ImageGallery', name: c.titulo, description: desc,
    ...(c.credito ? { creator: { '@type': 'Person', name: c.credito } } : {}),
    ...(c.fecha_evento ? { dateCreated: c.fecha_evento } : {}),
    image: fotos.slice(0, 10).map((u, i) => ({ '@type': 'ImageObject', contentUrl: u, name: `Foto ${i + 1} de ${c.titulo}`, ...(c.credito ? { creditText: c.credito } : {}) })),
    mainEntityOfPage: BASE + ruta
  };
  const contenido = `<h1>${esc(c.titulo)}</h1>${detalle ? `<p class="sub">${esc(detalle)}</p>` : ''}
    ${c.descripcion ? `<div class="texto-pagina">${String(c.descripcion).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
    ${c.credito ? `<p class="credito">Fotos: ${esc(c.credito)}</p>` : ''}
    <div class="galeria">${fotos.map((u, i) => `<img src="${esc(u)}" alt="${esc(`Foto ${i + 1} de ${c.titulo}${c.artista ? ' · ' + c.artista : ''}`)}" loading="lazy">`).join('')}</div>`;
  guardar('coberturas', nombre + '.html', armar(tCob, { titulo: c.titulo, descripcion: desc, imagen: fotos[0], ruta, tipo: 'article', jsonld, contenido, globales: `window.OTR_ID=${JSON.stringify(c.id)};window.OTR_PAGINA=${JSON.stringify('cobertura.html?id=' + c.id)};` }));
  urls.push([ruta, fechaIso(c.actualizada_en || c.fecha_evento).slice(0, 10)]);
}

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  fijas.map(p => `  <url><loc>${BASE}${p}</loc></url>`).join('\n') + '\n' +
  urls.map(([p, f]) => `  <url><loc>${BASE}${p}</loc>${f ? `<lastmod>${f}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync('sitemap.xml', sitemap);
console.log(`Listo: ${notas.length} notas, ${bandas.length} bandas, ${cobs.length} coberturas.`);
