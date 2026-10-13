'use strict';
/* Página de una sola nota (nota.html?slug=...) */
(async function () {
  const caja = document.getElementById('nota');
  const slug = new URLSearchParams(location.search).get('slug');

  if (!slug) { caja.innerHTML = '<p class="vacio">No encontramos esa nota.</p>'; return; }

  /* Las reglas de la base hacen que el público solo vea lo publicado;
     vos, logueado como admin, podés ver también tus borradores. */
  const { data: n, error } = await sb.from('notas').select('*').eq('slug', slug).maybeSingle();

  if (error || !n) { caja.innerHTML = '<p class="vacio">No encontramos esa nota.</p>'; return; }

  document.title = n.titulo + ' · Off The Reecord';
  const foto = urlSegura(n.imagen_portada);
  const meta = [n.autor, fechaLarga(n.fecha_publicacion)].filter(Boolean).join(' · ');

  caja.innerHTML = `
    ${n.publicada ? '' : '<p class="aviso">Borrador: solo vos podés ver esta nota.</p>'}
    <span class="categoria">${esc(CATEGORIAS[n.categoria] || n.categoria)}</span>
    <h1>${esc(n.titulo)}</h1>
    ${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
    ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
    ${foto ? `<img class="portada-nota" src="${esc(foto)}" alt="">` : ''}
    <div class="contenido">${DOMPurify.sanitize(n.contenido || '')}</div>`;
})();
