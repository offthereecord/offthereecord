'use strict';
/* Página de efemérides: calendario del mes en curso, con flechas para ver otros meses.
   El mes y el día de hoy se detectan solos (hora de Argentina): no hay que cargar nada a mano. */
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
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

  /* "sábado 24 de octubre de 2026", según la hora de Argentina */
  const hoyLargo = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date()).replace(',', '');

  let mesVista = hoy.mes;   // arranca en el mes en curso

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
    return `<div class="mes"><div class="cal">${dow}${celdas}</div></div>`;
  }

  function textoRelativo(m, d) {
    const n = diasHasta(m, d, hoy);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    if (n === -1) return 'Ayer';
    return n > 0 ? 'En ' + n + ' días' : 'Hace ' + (-n) + ' días';
  }

  function pintar() {
    const delMes = datos.filter(e => e.mes === mesVista)
      .sort((a, b) => a.dia - b.dia || porAnio(a, b));

    cont.innerHTML = `
      <div class="efem-columna">
        <p class="hoy-texto">Hoy es ${esc(hoyLargo)}</p>
        <div class="leyenda" aria-label="Referencias">
          <span><i style="background:var(--cal-nac)"></i>Nacional</span>
          <span><i style="background:var(--cal-int)"></i>Internacional</span>
          <span>Tocá un día marcado para ver de qué se trata.</span>
        </div>

        <div class="cal-nav">
          <button type="button" class="cal-flecha" id="calPrev" aria-label="Mes anterior"${mesVista === 1 ? ' disabled' : ''}>‹</button>
          <h2 class="cal-titulo" aria-live="polite">${esc(MESES[mesVista - 1])} ${hoy.anio}</h2>
          <button type="button" class="cal-flecha" id="calNext" aria-label="Mes siguiente"${mesVista === 12 ? ' disabled' : ''}>›</button>
        </div>
        <div class="cal-acciones">${mesVista === hoy.mes ? '' : '<button type="button" id="calHoy">Volver a hoy</button>'}</div>

        <div class="calendario-uno">${htmlMes(mesVista)}</div>

        <section class="efem-grupo">
          <h2>Efemérides de ${esc(MESES[mesVista - 1])}</h2>
          ${delMes.length ? delMes.map(e => `
            <article class="efem${mesVista === hoy.mes && e.dia === hoy.dia ? ' hoy' : ''}">
              <div class="efem-fecha"><span class="efem-dia">${esc(e.dia)}</span><span class="efem-mes">${esc(MESES[e.mes - 1].slice(0, 3))}</span></div>
              <div><span class="efem-cuando">${esc(textoRelativo(e.mes, e.dia))}</span>${htmlItemEfemeride(e, hoy)}</div>
            </article>`).join('')
            : `<p class="vacio">Todavía no hay efemérides cargadas para ${esc(MESES[mesVista - 1])}.</p>`}
        </section>
      </div>`;
  }

  /* Flechas, "Volver a hoy" y tocar un día marcado */
  cont.addEventListener('click', ev => {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.id === 'calPrev' && mesVista > 1) { mesVista--; pintar(); document.getElementById('calPrev').focus(); return; }
    if (t.id === 'calNext' && mesVista < 12) { mesVista++; pintar(); document.getElementById('calNext').focus(); return; }
    if (t.id === 'calHoy') { mesVista = hoy.mes; pintar(); return; }
    if (t.classList.contains('marcado')) {
      const m = Number(t.dataset.m), d = Number(t.dataset.d);
      abrirDialogoEfemerides(mapa[m + '-' + d], {
        hoy,
        etiqueta: m === hoy.mes && d === hoy.dia ? 'Un día como hoy' : 'Efemérides del día',
        fechaTexto: d + ' de ' + MESES[m - 1]
      });
    }
  });

  pintar();
})();
