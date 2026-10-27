'use strict';
/* Sección Emergentes: fichas de bandas (cargadas desde el panel) y notas con la etiqueta "emergentes" */
(async function () {
  const [bandas, notas] = await Promise.all([
    sb.from('bandas')
      .select('nombre, slug, genero, ciudad, imagen, destacada')
      .eq('publicada', true)
      .order('destacada', { ascending: false })
      .order('nombre', { ascending: true }),
    sb.from('notas')
      .select('titulo, slug, bajada, imagen_portada, categoria, fecha_publicacion')
      .eq('publicada', true)
      .contains('etiquetas', ['emergentes'])
      .order('fecha_publicacion', { ascending: false })
  ]);

  const hayBandas = !bandas.error && bandas.data && bandas.data.length > 0;
  const hayNotas = !notas.error && notas.data && notas.data.length > 0;

  if (hayBandas) {
    document.getElementById('bandas').innerHTML = bandas.data.map(b => {
      const foto = urlSegura(b.imagen);
      const detalle = [b.genero, b.ciudad].filter(Boolean).join(' · ');
      return `
        <a class="banda" href="banda.html?slug=${encodeURIComponent(b.slug)}">
          ${foto ? `<img class="foto" src="${esc(foto)}" alt="${esc(b.nombre)}" loading="lazy">` : '<div class="foto sin-foto" aria-hidden="true">Sin foto</div>'}
          <strong>${esc(b.nombre)}</strong>
          ${detalle ? `<span>${esc(detalle)}</span>` : ''}
        </a>`;
    }).join('');
    document.getElementById('seccionBandas').hidden = false;
  }
  if (hayNotas) {
    document.getElementById('lista').innerHTML = notas.data.map(htmlTarjetaNota).join('');
    document.getElementById('seccionNotasEm').hidden = false;
  }

  const vacio = document.getElementById('vacioEm');
  if (hayBandas || hayNotas) vacio.hidden = true;
  else vacio.textContent = (bandas.error && notas.error)
    ? 'No pudimos cargar esta sección. Probá de nuevo en un rato.'
    : 'Todavía no hay bandas ni notas sobre emergentes. Volvé pronto.';
})();
