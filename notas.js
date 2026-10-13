'use strict';
/* Listado público de notas (notas.html) */
(async function () {
  const lista = document.getElementById('lista');

  const { data, error } = await sb
    .from('notas')
    .select('titulo, slug, bajada, imagen_portada, categoria, fecha_publicacion')
    .eq('publicada', true)
    .order('fecha_publicacion', { ascending: false });

  if (error) {
    lista.innerHTML = '<p class="vacio">No pudimos cargar las notas. Probá de nuevo en un rato.</p>';
    console.error(error);
    return;
  }
  if (!data.length) {
    lista.innerHTML = '<p class="vacio">Todavía no hay notas publicadas. Volvé pronto.</p>';
    return;
  }

  lista.innerHTML = data.map(n => {
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
  }).join('');
})();
