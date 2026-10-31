'use strict';
/* Panel de administración: estadísticas de tráfico */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);
  let cargando = false;

  const seg = s => s == null ? '—' : (s >= 60 ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s' : s + ' s');
  const num = n => Number(n || 0).toLocaleString('es-AR');
  const diaCorto = iso => { const p = String(iso).split('-'); return p[2] + '/' + p[1]; };

  function kpi(titulo, valor, nota) {
    return `<div class="kpi"><small>${esc(titulo)}</small><b>${esc(valor)}</b><span>${esc(nota)}</span></div>`;
  }

  function tabla(cols, filas, vacio) {
    if (!filas.length) return `<p class="vacio">${esc(vacio)}</p>`;
    return `<div class="tabla-scroll"><table class="tabla-est"><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table></div>`;
  }

  function pintar(d) {
    const r = d.resumen || {};
    $('estKpis').innerHTML =
      kpi('Visitantes', num(r.visitantes), 'navegadores distintos') +
      kpi('Visitas', num(r.sesiones), 'veces que alguien entró') +
      kpi('Páginas vistas', num(r.vistas), r.paginas_por_sesion ? r.paginas_por_sesion + ' por visita' : '') +
      kpi('Tiempo en cada página', seg(r.seg_prom), 'promedio') +
      kpi('Clics', num(r.clics), 'en enlaces y botones') +
      kpi('Se fueron sin seguir', r.rebote_pct == null ? '—' : r.rebote_pct + '%', 'visitas de una sola página') +
      kpi('Cuánto bajan', r.scroll_prom == null ? '—' : r.scroll_prom + '%', 'promedio de la página');

    /* gráfico por día */
    const dias = d.por_dia || [];
    const max = Math.max(1, ...dias.map(x => x.vistas));
    const cada = dias.length > 31 ? 7 : dias.length > 14 ? 3 : 1;
    $('estDias').innerHTML = dias.length
      ? dias.map((x, i) => `<div class="dia-col" title="${esc(diaCorto(x.dia) + ': ' + x.vistas + ' páginas vistas, ' + x.visitantes + ' visitantes')}">
          <div class="par"><div class="b1" style="height:${Math.round(x.vistas / max * 100)}%"></div><div class="b2" style="height:${Math.round(x.visitantes / max * 100)}%"></div></div>
          <small>${i % cada === 0 ? esc(diaCorto(x.dia)) : ''}</small></div>`).join('')
      : '<p class="vacio">Todavía no hay datos.</p>';

    $('estPaginas').innerHTML = tabla(
      [{ t: 'Página' }, { t: 'Vistas', num: 1 }, { t: 'Visitantes', num: 1 }, { t: 'Tiempo', num: 1 }, { t: 'Bajan', num: 1 }],
      (d.paginas || []).map(p => `<tr><td class="nom">${esc(p.nombre)}</td><td class="num">${num(p.vistas)}</td><td class="num">${num(p.visitantes)}</td><td class="num">${esc(seg(p.seg_prom))}</td><td class="num">${p.scroll_prom == null ? '—' : esc(p.scroll_prom + '%')}</td></tr>`),
      'Todavía no hay páginas vistas en este período.');

    $('estOrigenes').innerHTML = tabla(
      [{ t: 'Origen' }, { t: 'Visitas', num: 1 }],
      (d.origenes || []).map(o => `<tr><td class="nom">${esc(o.origen)}</td><td class="num">${num(o.sesiones)}</td></tr>`),
      'Sin datos todavía.');

    $('estDispositivos').innerHTML = tabla(
      [{ t: 'Dispositivo' }, { t: 'Visitas', num: 1 }],
      (d.dispositivos || []).map(o => `<tr><td class="nom">${esc(o.dispositivo)}</td><td class="num">${num(o.sesiones)}</td></tr>`),
      'Sin datos todavía.');

    $('estClics').innerHTML = tabla(
      [{ t: 'Dónde hicieron clic' }, { t: 'Clics', num: 1 }, { t: 'Personas', num: 1 }],
      (d.clics || []).map(c => `<tr><td class="nom">${esc(c.destino)}</td><td class="num">${num(c.clics)}</td><td class="num">${num(c.personas)}</td></tr>`),
      'Todavía no hay clics registrados en este período.');

    $('estContenido').hidden = false;
  }

  async function cargar() {
    if (cargando) return;
    cargando = true;
    A.mensaje($('msgEst'), 'Cargando…');
    const { data, error } = await sb.rpc('estadisticas', { dias: Number($('estRango').value) });
    cargando = false;
    if (error) {
      const falta = /estadisticas|function|schema cache|does not exist/i.test(error.message || '');
      A.mensaje($('msgEst'), falta
        ? 'Falta ejecutar el script 05-estadisticas.sql en Supabase (ver el ayuda memoria).'
        : A.textoError(error), 'error');
      $('estContenido').hidden = true;
      return;
    }
    A.mensaje($('msgEst'), '');
    pintar(data || {});
  }

  $('estRango').addEventListener('change', cargar);
  $('btnEstActualizar').addEventListener('click', cargar);
  document.addEventListener('otr:pestana', e => { if (e.detail === 'estadisticas') cargar(); });
})();
