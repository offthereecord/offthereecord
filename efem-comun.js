'use strict';
/* Piezas compartidas de las efemérides: carga de datos, cuenta de años y ventana emergente.
   Las usan la página de efemérides y el cartel que aparece al entrar. */

var TIPOS_EFEMERIDE = {
  cumpleanos: 'Cumpleaños', lanzamiento: 'Lanzamiento', formacion: 'Formación',
  fallecimiento: 'Fallecimiento', otro: 'Efeméride'
};

/* "23 de octubre de 1951" */
function fechaTextoEfemeride(e) {
  return e.dia + ' de ' + MESES[e.mes - 1] + (e.anio ? ' de ' + e.anio : '');
}

/* La frase con la cuenta ya hecha. Ejemplos:
   Nació el 23 de octubre de 1951 · edad: 75 años
   Se publicó el 17 de octubre de 2003 · hoy se cumplen 23 años */
function lineaEfemeride(e, hoy) {
  if (!e.anio) return '';
  const n = hoy.anio - e.anio;
  const dif = diasHasta(e.mes, e.dia, hoy);
  const f = fechaTextoEfemeride(e);
  const anios = n === 1 ? '1 año' : n + ' años';

  if (e.tipo === 'cumpleanos') return n >= 0 ? 'Nació el ' + f + ' · edad: ' + anios : 'Nació el ' + f;

  const base = e.tipo === 'lanzamiento' ? 'Se publicó el ' + f
    : e.tipo === 'formacion' ? 'Se formó el ' + f
    : e.tipo === 'fallecimiento' ? 'Falleció el ' + f
    : f;
  if (n <= 0) return base;
  const cuando = dif > 0 ? 'se cumplen ' : dif === 0 ? 'hoy se cumplen ' : 'se cumplieron ';
  return base + ' · ' + cuando + anios;
}

/* Trae las efemérides publicadas. filtro opcional: { mes, dia }.
   Devuelve una lista, o null si hubo un error. */
async function cargarEfemerides(filtro) {
  async function pedir(campos) {
    let q = sb.from('efemerides').select(campos).eq('publicada', true);
    if (filtro && filtro.mes) q = q.eq('mes', filtro.mes);
    if (filtro && filtro.dia) q = q.eq('dia', filtro.dia);
    return q;
  }
  let res = await pedir('id, dia, mes, anio, titulo, descripcion, ambito, tipo, imagen, notas(slug)');
  if (res.error) res = await pedir('id, dia, mes, anio, titulo, descripcion, ambito, imagen, notas(slug)'); // por si todavía no existe la columna "tipo"
  if (res.error) { console.error(res.error); return null; }
  return res.data.map(e => Object.assign({ tipo: 'otro' }, e));
}

/* Una efeméride lista para mostrar */
function htmlItemEfemeride(e, hoy) {
  const foto = urlSegura(e.imagen);
  const linea = lineaEfemeride(e, hoy);
  return `
    <article class="efem-item">
      <span class="categoria">${esc(TIPOS_EFEMERIDE[e.tipo] || 'Efeméride')} · ${e.ambito === 'internacional' ? 'Internacional' : 'Nacional'}</span>
      <h3>${esc(e.titulo)}</h3>
      ${linea ? `<p class="efem-linea">${esc(linea)}</p>` : ''}
      ${e.descripcion ? `<p>${esc(e.descripcion)}</p>` : ''}
      ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ''}
      ${e.notas && e.notas.slug ? `<a class="mas" href="nota.html?slug=${encodeURIComponent(e.notas.slug)}">Leer la nota →</a>` : ''}
    </article>`;
}

/* Ventana emergente. opts: { etiqueta, fechaTexto, hoy } */
function abrirDialogoEfemerides(lista, opts) {
  opts = opts || {};
  const hoy = opts.hoy || hoyArgentina();
  const previo = document.querySelector('dialog.efem-popup');
  if (previo) previo.remove();

  const dlg = document.createElement('dialog');
  dlg.className = 'efem-popup';
  dlg.setAttribute('aria-label', 'Efemérides');
  const enCalendario = /efemerides\.html$/.test(location.pathname);
  dlg.innerHTML = `
    <div class="efem-cuerpo">
      <button type="button" class="efem-cerrar" aria-label="Cerrar">✕</button>
      <p class="efem-etiqueta">${esc(opts.etiqueta || 'Un día como hoy')}</p>
      <p class="efem-fecha-grande">${esc(opts.fechaTexto || '')}</p>
      <div class="efem-items">${lista.map(e => htmlItemEfemeride(e, hoy)).join('')}</div>
      <div class="efem-pie">
        ${enCalendario ? '' : '<a class="boton" href="efemerides.html">Ver el calendario</a>'}
        <button type="button" class="efem-ok">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  const cerrar = () => { if (typeof dlg.close === 'function' && dlg.open) dlg.close(); dlg.remove(); };
  dlg.querySelector('.efem-cerrar').addEventListener('click', cerrar);
  dlg.querySelector('.efem-ok').addEventListener('click', cerrar);
  dlg.addEventListener('click', ev => { if (ev.target === dlg) cerrar(); });   // clic en el fondo oscuro
  dlg.addEventListener('close', () => dlg.remove());

  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  dlg.querySelector('.efem-ok').focus();
  return dlg;
}
