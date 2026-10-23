'use strict';
/* Sección Emergentes: muestra las notas publicadas que tengan la etiqueta "emergentes" */
(async function () {
  const lista = document.getElementById('lista');

  const { data, error } = await sb
    .from('notas')
    .select('titulo, slug, bajada, imagen_portada, categoria, fecha_publicacion')
    .eq('publicada', true)
    .contains('etiquetas', ['emergentes'])
    .order('fecha_publicacion', { ascending: false });

  if (error) {
    lista.innerHTML = '<p class="vacio">No pudimos cargar las notas. Probá de nuevo en un rato.</p>';
    console.error(error);
    return;
  }
  if (!data.length) {
    lista.innerHTML = '<p class="vacio">Todavía no hay notas sobre bandas emergentes. Volvé pronto.</p>';
    return;
  }
  lista.innerHTML = data.map(htmlTarjetaNota).join('');
})();
