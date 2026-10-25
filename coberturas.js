'use strict';
/* Listado de coberturas (coberturas.html): todas las galerías, de la más nueva a la más vieja */
(async function () {
  const lista = document.getElementById('lista');

  const { data, error } = await sb
    .from('coberturas')
    .select('id, titulo, artista, lugar, fecha_evento, portada')
    .eq('publicada', true)
    .order('fecha_evento', { ascending: false, nullsFirst: false })
    .order('creada_en', { ascending: false });

  if (error) {
    lista.innerHTML = '<p class="vacio">No pudimos cargar las coberturas. Probá de nuevo en un rato.</p>';
    console.error(error);
    return;
  }
  if (!data.length) {
    lista.innerHTML = '<p class="vacio">Todavía no hay coberturas publicadas. Volvé pronto.</p>';
    return;
  }
  lista.innerHTML = data.map(htmlCobertura).join('');
})();
