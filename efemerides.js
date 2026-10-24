'use strict';
/* Página de efemérides: calendario de los 12 meses con las fechas marcadas */
(async function () {
  const cont = document.getElementById('efemerides');
  const hoy = hoyArgentina();

  const datos = await cargarEfemerides();
  if (datos === null) {
    cont.innerHTML = '<p class="vacio">No pudimos cargar las efemérides. Probá de nuevo en un rato.</p>';
    return;
  }

  /* Agrupa por día: "10-23" → [efemérides de ese día] */
  const porAnio = (a, b) => (a.anio || 0) - (b.anio || 0);
  const mapa = {};
  datos.forEach(e => { (mapa[e.mes + '-' + e.dia] = mapa[e.mes + '-' + e.dia] || []).push(e); });
  Object.keys(mapa).forEach(k => mapa[k].sort(porAnio));

  const bisiesto = (hoy.anio % 4 === 0 && hoy.anio % 100 !== 0) || hoy.anio % 400 === 0;
  const diasDelMes = m => [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

  function htmlMes(m) {
    const primero = (new Date(Date.UTC(hoy.anio, m - 1, 1)).getUTCDay() + 6) % 7;   // semana desde el lunes
    let celdas = '<span class="vacia"></span>'.repeat(primero);
    for (let d = 1; d <= diasDelMes(m); d++) {
      const lista = mapa[m + '-' + d];
      const esHoy = m === hoy.mes && d === hoy.dia;
      if (!lista) { celdas += `<span class="dia${esHoy ? ' hoy' : ''}">${d}</span>`; continue; }
      const nac = lista.some(e => e.ambito !== 'internacional');
      const int = lista.some(e => e.ambito === 'internacional');
      const clases = ['dia', 'marcado', nac ? 'nac' : '', int ? 'int' : '', esHoy ? 'hoy' : ''].filter(Boolean).join(' ');
      const etiqueta = d + ' de ' + MESES[m - 1] + ': ' + lista.length + (lista.length === 1 ? ' efeméride' : ' efemérides');
      celdas += `<button type="button" class="${clases}" data-m="${m}" data-d="${d}" aria-label="${esc(etiqueta)}">${d}</button>`;
    }
    const dow = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span class="dow" aria-hidden="true">${x}</span>`).join('');
    return `<section class="mes"><h3>${MESES[m - 1]}</h3><div class="cal">${dow}${celdas}</div></section>`;
  }

  /* Próximas: hoy y las que vienen (si se acaba el año, sigue con enero) */
  const hoyUTC = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);
  function faltan(e) {
    let dif = diasHasta(e.mes, e.dia, hoy);
    if (dif < 0) dif = Math.round((Date.UTC(hoy.anio + 1, e.mes - 1, e.dia) - hoyUTC) / 86400000);
    return dif;
  }
  const proximas = datos.map(e => ({ e, falta: faltan(e) }))
    .sort((a, b) => a.falta - b.falta || porAnio(a.e, b.e)).slice(0, 5);

  function textoFalta(n) { return n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : 'En ' + n + ' días'; }

  cont.innerHTML = `
    <div class="leyenda" aria-label="Referencias">
      <span><i style="background:var(--cal-nac)"></i>Nacional</span>
      <span><i style="background:var(--cal-int)"></i>Internacional</span>
      <span>Tocá un día marcado para ver de qué se trata.</span>
    </div>
    <h2 class="anio-cal">${hoy.anio}</h2>
    <div class="calendario">${Array.from({ length: 12 }, (_, i) => htmlMes(i + 1)).join('')}</div>
    ${datos.length ? '' : '<p class="vacio">Todavía no hay efemérides cargadas. Volvé pronto.</p>'}
    ${proximas.length ? `
    <section class="efem-grupo">
      <h2>Hoy y próximas</h2>
      ${proximas.map(({ e, falta }) => `
        <article class="efem${falta === 0 ? ' hoy' : ''}">
          <div class="efem-fecha"><span class="efem-dia">${esc(e.dia)}</span><span class="efem-mes">${esc(MESES[e.mes - 1].slice(0, 3))}</span></div>
          <div><span class="efem-cuando">${esc(textoFalta(falta))}</span>${htmlItemEfemeride(e, hoy)}</div>
        </article>`).join('')}
    </section>` : ''}`;

  /* Tocar un día marcado abre la ventana con los detalles */
  cont.addEventListener('click', ev => {
    const b = ev.target.closest('button.marcado');
    if (!b) return;
    const m = Number(b.dataset.m), d = Number(b.dataset.d);
    abrirDialogoEfemerides(mapa[m + '-' + d], {
      hoy,
      etiqueta: m === hoy.mes && d === hoy.dia ? 'Un día como hoy' : 'Efemérides del día',
      fechaTexto: d + ' de ' + MESES[m - 1]
    });
  });
})();
