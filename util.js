'use strict';

/* Conexión con Supabase: la variable "sb" la usan todos los demás archivos */
const sb = window.supabase.createClient(OTR_CONFIG.SUPABASE_URL, OTR_CONFIG.SUPABASE_KEY);

/* Convierte texto en "texto seguro" para mostrar en pantalla */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Solo deja pasar direcciones completas http/https.
   Si el dato está vacío o no es una dirección válida, devuelve '' (nada). */
function urlSegura(u) {
  try {
    const x = new URL(String(u ?? '').trim());   // sin "base": una dirección vacía o relativa da error
    return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
  } catch (e) { return ''; }
}

function fechaLarga(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const CATEGORIAS = {
  nota: 'Nota', cronica: 'Crónica', entrevista: 'Entrevista',
  investigacion: 'Investigación', infografia: 'Infografía'
};

/* ---------- Piezas que se repiten en varias páginas ---------- */

/* Tarjeta de una nota (listado de notas y home) */
function htmlTarjetaNota(n) {
  const foto = urlSegura(n.imagen_portada);
  return `
    <a class="tarjeta" href="nota.html?slug=${encodeURIComponent(n.slug)}">
      ${foto ? `<img class="foto" src="${esc(foto)}" alt="" loading="lazy">` : ''}
      <div class="cuerpo">
        <span class="categoria">${esc(CATEGORIAS[n.categoria] || n.categoria)}</span>
        <h2>${esc(n.titulo)}</h2>
        ${n.bajada ? `<p>${esc(n.bajada)}</p>` : ''}
        <span class="fecha">${esc(fechaLarga(n.fecha_publicacion))}</span>
      </div>
    </a>`;
}

/* Tapa de una reseña: si tiene nota escrita lleva a la nota;
   si no, al link de la playlist o disco (se abre en otra pestaña). */
function htmlResena(r) {
  const tapa = urlSegura(r.imagen);
  const img = tapa
    ? `<img class="tapa" src="${esc(tapa)}" alt="Tapa de ${esc(r.titulo)}, de ${esc(r.artista)}" loading="lazy">`
    : '<div class="tapa sin-tapa" aria-hidden="true">♪</div>';
  const cuerpo = `${img}<strong>${esc(r.titulo)}</strong><span>${esc(r.artista)}</span>`;

  let destino = null;
  if (r.notas && r.notas.slug) {
    destino = { href: 'nota.html?slug=' + encodeURIComponent(r.notas.slug), externo: false };
  } else {
    const u = urlSegura(r.enlace_url);
    if (u) destino = { href: u, externo: true };
  }
  if (!destino) return `<div class="resena">${cuerpo}</div>`;
  return `<a class="resena" href="${esc(destino.href)}"${destino.externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>${cuerpo}</a>`;
}

/* ---------- Fechas (para las efemérides) ---------- */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* Fecha de hoy según la hora de Argentina, sin importar dónde esté quien visita */
function hoyArgentina() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const n = tipo => Number(partes.find(p => p.type === tipo).value);
  return { anio: n('year'), mes: n('month'), dia: n('day') };
}

/* Días que faltan (positivo) o pasaron (negativo) hasta el día/mes de este año */
function diasHasta(mes, dia, hoy) {
  const h = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);
  const f = Date.UTC(hoy.anio, mes - 1, dia);
  return Math.round((f - h) / 86400000);
}
