'use strict';
/* Página de efemérides: separa las que ya pasaron este año, las de hoy y las que vienen */
(async function () {
  const cont = document.getElementById('efemerides');
  const hoy = hoyArgentina();

  const { data, error } = await sb
    .from('efemerides')
    .select('id, dia, mes, anio, titulo, descripcion, ambito, imagen, notas(slug)')
    .eq('publicada', true);

  if (error) {
    cont.innerHTML = '<p class="vacio">No pudimos cargar las efemérides. Probá de nuevo en un rato.</p>';
    console.error(error);
    return;
  }
  if (!data.length) {
    cont.innerHTML = '<p class="vacio">Todavía no hay efemérides cargadas. Volvé pronto.</p>';
    return;
  }

  const items = data.map(e => ({ ...e, dif: diasHasta(e.mes, e.dia, hoy) }));
  const porAnio = (a, b) => (a.anio || 0) - (b.anio || 0);
  const grupos = [
    { titulo: 'Hoy', sub: 'Lo que se conmemora en este día.',
      lista: items.filter(e => e.dif === 0).sort(porAnio) },
    { titulo: 'Próximas', sub: 'Las fechas que vienen, de la más cercana a la más lejana.',
      lista: items.filter(e => e.dif > 0).sort((a, b) => a.dif - b.dif || porAnio(a, b)) },
    { titulo: 'Ya pasaron este año', sub: 'Las fechas que ya se cumplieron, de la más reciente a la más antigua.',
      lista: items.filter(e => e.dif < 0).sort((a, b) => b.dif - a.dif || porAnio(a, b)) }
  ].filter(g => g.lista.length);

  function relativo(dif) {
    if (dif === 0) return 'Hoy';
    if (dif === 1) return 'Mañana';
    if (dif === -1) return 'Ayer';
    return dif > 0 ? 'En ' + dif + ' días' : 'Hace ' + (-dif) + ' días';
  }

  function htmlEfemeride(e) {
    const anios = e.anio ? hoy.anio - e.anio : null;
    const linea = e.anio
      ? e.anio + (anios > 1 ? ' · hace ' + anios + ' años' : anios === 1 ? ' · hace 1 año' : '')
      : '';
    const foto = urlSegura(e.imagen);
    return `
      <article class="efem${e.dif === 0 ? ' hoy' : ''}">
        <div class="efem-fecha"><span class="efem-dia">${esc(e.dia)}</span><span class="efem-mes">${esc(MESES[e.mes - 1].slice(0, 3))}</span></div>
        <div>
          <span class="categoria">${e.ambito === 'internacional' ? 'Internacional' : 'Nacional'} · ${esc(relativo(e.dif))}</span>
          <h3>${esc(e.titulo)}</h3>
          ${linea ? `<p class="anio">${esc(linea)}</p>` : ''}
          ${e.descripcion ? `<p>${esc(e.descripcion)}</p>` : ''}
          ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ''}
          ${e.notas && e.notas.slug ? `<a class="mas" href="nota.html?slug=${encodeURIComponent(e.notas.slug)}">Leer la nota →</a>` : ''}
        </div>
      </article>`;
  }

  cont.innerHTML = grupos.map(g => `
    <section class="efem-grupo">
      <h2>${esc(g.titulo)}</h2>
      <p class="sub">${esc(g.sub)}</p>
      ${g.lista.map(htmlEfemeride).join('')}
    </section>`).join('');
})();
