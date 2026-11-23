'use strict';
/* Ficha de una banda emergente (banda.html?slug=...) */
(async function () {
  const cont = document.getElementById('banda');
  const slug = window.OTR_SLUG || new URLSearchParams(location.search).get('slug');
  const noEsta = () => { cont.innerHTML = '<p class="vacio">No encontramos esa banda.</p>'; };
  if (!slug) return noEsta();

  const { data: b, error } = await sb.from('bandas').select('*').eq('slug', slug).maybeSingle();
  if (error || !b) return noEsta();

  const detalleSeo = [b.genero, b.ciudad].filter(Boolean).join(' · ');
  const descSeo = OTR_SEO.resumen([b.nombre, detalleSeo, b.bio].filter(Boolean).join('. '), 160);
  OTR_SEO.aplicar({
    titulo: b.nombre + (detalleSeo ? ' · ' + detalleSeo : ''), descripcion: descSeo, imagen: urlSegura(b.imagen), tipo: 'profile',
    ruta: 'bandas/' + b.slug + '.html', estatica: 'bandas/' + b.slug + '.html', noindex: !b.publicada,
    jsonld: b.publicada ? {
      '@context': 'https://schema.org', '@type': 'MusicGroup', name: b.nombre, description: OTR_SEO.resumen(b.bio, 300) || undefined,
      ...(urlSegura(b.imagen) ? { image: urlSegura(b.imagen) } : {}), ...(b.genero ? { genre: b.genero } : {}),
      ...(b.ciudad ? { foundingLocation: { '@type': 'Place', name: b.ciudad } } : {}), url: OTR_SEO.BASE + 'bandas/' + b.slug + '.html'
    } : null
  });
  const redes = (b.redes && b.redes.length) ? b.redes : OTR_REDES.desdeLinks(b.links);   // fichas viejas: usan los campos fijos
  const foto = urlSegura(b.imagen);
  const detalle = [b.genero, b.ciudad].filter(Boolean).join(' · ');
  const parrafos = String(b.bio || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  cont.innerHTML = `
    ${b.publicada ? '' : '<p class="aviso">Borrador: solo vos podés ver esta ficha.</p>'}
    <div class="banda-pagina">
      ${foto ? `<img class="banda-foto" src="${esc(foto)}" alt="${esc(b.nombre)}">` : ''}
      <div>
        <span class="categoria">Banda emergente</span>
        <h1>${esc(b.nombre)}</h1>
        ${detalle ? `<p class="sub">${esc(detalle)}</p>` : ''}
        <div class="texto-pagina">${parrafos}</div>
        ${OTR_REDES.bloque('Redes de la banda', redes)}
        <p style="margin-top:22px"><a href="emergentes.html">← Volver a Emergentes</a></p>
      </div>
    </div>`;
})();
