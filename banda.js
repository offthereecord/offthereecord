'use strict';
/* Ficha de una banda emergente (banda.html?slug=...) */
(async function () {
  const cont = document.getElementById('banda');
  const slug = new URLSearchParams(location.search).get('slug');
  const noEsta = () => { cont.innerHTML = '<p class="vacio">No encontramos esa banda.</p>'; };
  if (!slug) return noEsta();

  const { data: b, error } = await sb.from('bandas').select('*').eq('slug', slug).maybeSingle();
  if (error || !b) return noEsta();

  document.title = b.nombre + ' · Off The Reecord';
  const NOMBRES = { instagram: 'Instagram', spotify: 'Spotify', youtube: 'YouTube', bandcamp: 'Bandcamp', web: 'Sitio web' };
  const links = Object.keys(NOMBRES)
    .map(k => ({ nombre: NOMBRES[k], url: urlSegura((b.links || {})[k]) })).filter(l => l.url);
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
        ${links.length ? `<ul class="links-banda">${links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.nombre)}</a></li>`).join('')}</ul>` : ''}
        <p style="margin-top:22px"><a href="emergentes.html">← Volver a Emergentes</a></p>
      </div>
    </div>`;
})();
