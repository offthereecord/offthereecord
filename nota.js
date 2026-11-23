'use strict';
/* Página de una sola nota (nota.html?slug=...) */
(async function () {
  const caja = document.getElementById('nota');
  const slug = window.OTR_SLUG || new URLSearchParams(location.search).get('slug');

  if (!slug) { caja.innerHTML = '<p class="vacio">No encontramos esa nota.</p>'; return; }

  /* Las reglas de la base hacen que el público solo vea lo publicado;
     vos, logueado como admin, podés ver también tus borradores. */
  const { data: n, error } = await sb.from('notas').select('*').eq('slug', slug).maybeSingle();

  if (error || !n) { caja.innerHTML = '<p class="vacio">No encontramos esa nota.</p>'; return; }

  const desc = OTR_SEO.resumen(n.bajada || n.contenido, 160);
  OTR_SEO.aplicar({
    titulo: n.titulo, descripcion: desc, imagen: urlSegura(n.imagen_portada), tipo: 'article',
    ruta: 'notas/' + n.slug + '.html', estatica: 'notas/' + n.slug + '.html', noindex: !n.publicada,
    jsonld: n.publicada ? {
      '@context': 'https://schema.org', '@type': 'Article', headline: n.titulo, description: desc,
      ...(urlSegura(n.imagen_portada) ? { image: [urlSegura(n.imagen_portada)] } : {}),
      datePublished: n.fecha_publicacion, dateModified: n.actualizada_en || n.fecha_publicacion,
      author: { '@type': 'Person', name: n.autor || 'Off The Reecord' }, publisher: OTR_SEO.EDITOR,
      mainEntityOfPage: OTR_SEO.BASE + 'notas/' + n.slug + '.html', inLanguage: 'es-AR'
    } : null
  });
  const foto = urlSegura(n.imagen_portada);
  /* nombre de quien escribe + logos de sus redes + fecha */
  const redesAutor = OTR_REDES.iconos(n.redes_autor);
  const meta = [(n.autor ? esc(n.autor) : '') + redesAutor, esc(fechaLarga(n.fecha_publicacion))].filter(x => x && x.trim()).join(' · ');

  caja.innerHTML = `
    ${n.publicada ? '' : '<p class="aviso">Borrador: solo vos podés ver esta nota.</p>'}
    <span class="categoria">${esc(CATEGORIAS[n.categoria] || n.categoria)}</span>
    <h1>${esc(n.titulo)}</h1>
    ${meta ? `<div class="meta">${meta}</div>` : ''}
    ${foto ? `<img class="portada-nota" src="${esc(foto)}" alt="${esc(n.titulo)}">` : ''}
    ${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
    <div class="contenido">${DOMPurify.sanitize(n.contenido || '')}</div>
    ${OTR_REDES.bloque('Seguí a la banda', n.redes_banda)}`;
})();
