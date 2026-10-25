'use strict';
/* Una cobertura (cobertura.html?id=...): datos del evento y galería con visor de fotos */
(async function () {
  const cont = document.getElementById('cobertura');
  const id = new URLSearchParams(location.search).get('id');
  const noEsta = () => { cont.innerHTML = '<p class="vacio">No encontramos esa cobertura.</p>'; };
  if (!id) return noEsta();

  const { data: c, error } = await sb.from('coberturas').select('*, notas(slug)').eq('id', id).maybeSingle();
  if (error || !c) return noEsta();

  document.title = c.titulo + ' · Off The Reecord';
  const fotos = (c.fotos && c.fotos.length ? c.fotos : (c.portada ? [c.portada] : [])).map(urlSegura).filter(Boolean);
  const detalle = [c.artista, c.lugar, c.fecha_evento ? fechaDia(c.fecha_evento) : ''].filter(Boolean).join(' · ');
  const parrafos = String(c.descripcion || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  cont.innerHTML = `
    ${c.publicada ? '' : '<p class="aviso">Borrador: solo vos podés ver esta cobertura.</p>'}
    <span class="categoria">Cobertura</span>
    <h1>${esc(c.titulo)}</h1>
    ${detalle ? `<p class="sub">${esc(detalle)}</p>` : ''}
    ${parrafos ? `<div class="texto-pagina">${parrafos}</div>` : ''}
    ${c.credito ? `<p class="credito">Fotos: ${esc(c.credito)}</p>` : ''}
    ${c.notas && c.notas.slug ? `<p><a class="boton" href="nota.html?slug=${encodeURIComponent(c.notas.slug)}">Leer la crónica</a></p>` : ''}
    ${fotos.length ? `<div class="galeria">${fotos.map((u, i) => `
      <button type="button" class="g-item" data-i="${i}" aria-label="Ver la foto ${i + 1} de ${fotos.length}">
        <img src="${esc(u)}" alt="Foto ${i + 1} de ${esc(c.titulo)}" loading="lazy">
      </button>`).join('')}</div>` : '<p class="vacio">Todavía no hay fotos en esta cobertura.</p>'}`;

  /* ---------- Visor de fotos (pantalla completa) ---------- */
  let actual = 0, dlg = null;

  function mostrar() {
    dlg.querySelector('.lb-img').src = fotos[actual];
    dlg.querySelector('.lb-img').alt = 'Foto ' + (actual + 1) + ' de ' + c.titulo;
    dlg.querySelector('.lb-pie').textContent = (actual + 1) + ' / ' + fotos.length + (c.credito ? ' · Foto: ' + c.credito : '');
    dlg.querySelector('.lb-prev').hidden = dlg.querySelector('.lb-next').hidden = fotos.length < 2;
  }
  function mover(delta) { actual = (actual + delta + fotos.length) % fotos.length; mostrar(); }
  function cerrar() { if (typeof dlg.close === 'function' && dlg.open) dlg.close(); }

  function abrir(i) {
    actual = i;
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'lightbox';
      dlg.setAttribute('aria-label', 'Galería de fotos');
      dlg.innerHTML = `
        <button type="button" class="lb-cerrar" aria-label="Cerrar">✕</button>
        <button type="button" class="lb-flecha lb-prev" aria-label="Foto anterior">‹</button>
        <figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-pie"></figcaption></figure>
        <button type="button" class="lb-flecha lb-next" aria-label="Foto siguiente">›</button>`;
      document.body.appendChild(dlg);
      dlg.querySelector('.lb-cerrar').addEventListener('click', cerrar);
      dlg.querySelector('.lb-prev').addEventListener('click', () => mover(-1));
      dlg.querySelector('.lb-next').addEventListener('click', () => mover(1));
      dlg.addEventListener('click', e => { if (e.target === dlg) cerrar(); });
      dlg.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') mover(-1);
        if (e.key === 'ArrowRight') mover(1);
      });
      let x0 = null;                                   // deslizar con el dedo
      dlg.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      dlg.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
        x0 = null;
      });
    }
    mostrar();
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }

  cont.addEventListener('click', e => {
    const b = e.target.closest('.g-item');
    if (b) abrir(Number(b.dataset.i));
  });
})();
