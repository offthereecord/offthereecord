'use strict';
/* Portada: última nota publicada, reseñas música y más notas */
(async function () {
  const destacada = document.getElementById('destacada');

  const [notas, resenas] = await Promise.all([
    sb.from('notas')
      .select('titulo, slug, bajada, imagen_portada, categoria, fecha_publicacion')
      .eq('publicada', true)
      .order('fecha_publicacion', { ascending: false })
      .limit(4),
    sb.from('resenas')
      .select('titulo, artista, imagen, enlace_url, notas(slug)')
      .eq('publicada', true)
      .order('orden', { ascending: true })
      .order('creada_en', { ascending: false })
      .limit(12)
  ]);

  /* ---------- 1) Última nota ---------- */
  if (notas.error) {
    console.error(notas.error);
    destacada.innerHTML = '<p class="vacio">No pudimos cargar las notas. Probá de nuevo en un rato.</p>';
  } else if (!notas.data.length) {
    destacada.innerHTML = `
      <div class="intro">
        <img src="logo-claro.svg" alt="">
        <h1>Off The Reecord</h1>
        <p>Rock under argentino, efemérides y crónicas de recitales. Muy pronto.</p>
      </div>`;
  } else {
    const n = notas.data[0];
    const foto = urlSegura(n.imagen_portada);
    destacada.innerHTML = `
      <a class="destacada-card" href="nota.html?slug=${encodeURIComponent(n.slug)}">
        ${foto ? `<img class="foto" src="${esc(foto)}" alt="">` : ''}
        <div>
          <span class="categoria">Última nota · ${esc(CATEGORIAS[n.categoria] || n.categoria)}</span>
          <h1>${esc(n.titulo)}</h1>
          ${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
          <span class="fecha">${esc(fechaLarga(n.fecha_publicacion))}</span>
          <span class="boton">Leer la nota</span>
        </div>
      </a>`;
  }

  /* ---------- 2) Reseñas música (si hay) ---------- */
  if (!resenas.error && resenas.data && resenas.data.length) {
    document.getElementById('carruselResenas').innerHTML = `
      <div class="carrusel" role="region" aria-roledescription="carrusel" aria-label="Reseñas música">
        <button type="button" class="car-flecha prev" aria-label="Anteriores">‹</button>
        <div class="pista">${resenas.data.map(htmlResena).join('')}</div>
        <button type="button" class="car-flecha next" aria-label="Siguientes">›</button>
        <div class="car-puntos"></div>
      </div>`;
    document.getElementById('seccionResenas').hidden = false;
    montarCarrusel(document.querySelector('#carruselResenas .carrusel'));
  }

  /* ---------- 3) Más notas (si hay) ---------- */
  if (!notas.error && notas.data.length > 1) {
    document.getElementById('listaMas').innerHTML = notas.data.slice(1).map(htmlTarjetaNota).join('');
    document.getElementById('masNotas').hidden = false;
  }
})();
