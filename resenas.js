'use strict';
/* Página de reseñas música (resenas.html): todas las tapas en grilla */
(async function () {
  const cont = document.getElementById('rejilla');

  const { data, error } = await sb
    .from('resenas')
    .select('titulo, artista, imagen, enlace_url, notas(slug)')
    .eq('publicada', true)
    .order('orden', { ascending: true })
    .order('creada_en', { ascending: false });

  if (error) {
    cont.innerHTML = '<p class="vacio">No pudimos cargar las reseñas. Probá de nuevo en un rato.</p>';
    console.error(error);
    return;
  }
  if (!data.length) {
    cont.innerHTML = '<p class="vacio">Todavía no hay reseñas publicadas. Volvé pronto.</p>';
    return;
  }
  cont.innerHTML = data.map(htmlResena).join('');
})();
