'use strict';
/* Página "Quién soy": muestra la foto y el texto que se cargan desde el panel.
   Si todavía no se cargó nada, queda el texto provisorio de la página. */
(async function () {
  const cont = document.getElementById('perfil');
  const { data, error } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle();
  if (error || !data || !(data.texto || data.foto || data.nombre)) return;

  const foto = urlSegura(data.foto);
  const parrafos = String(data.texto || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  cont.innerHTML = `
    <div class="perfil">
      ${foto ? `<img class="perfil-foto" src="${esc(foto)}" alt="Foto de ${esc(data.nombre || 'quien escribe')}">` : ''}
      <div class="texto-pagina">
        ${data.nombre ? `<h2 class="perfil-nombre">${esc(data.nombre)}</h2>` : ''}
        ${data.subtitulo ? `<p class="perfil-rol">${esc(data.subtitulo)}</p>` : ''}
        ${parrafos}
      </div>
    </div>`;
})();
