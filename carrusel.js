'use strict';
/* Carrusel con flechas, puntitos y deslizamiento con el dedo.
   Uso: montarCarrusel(elementoConClase_carrusel) */
function montarCarrusel(raiz) {
  const pista = raiz.querySelector('.pista');
  const prev = raiz.querySelector('.prev');
  const next = raiz.querySelector('.next');
  const puntos = raiz.querySelector('.car-puntos');
  let pendiente = false;

  const maximo = () => pista.scrollWidth - pista.clientWidth;
  const paginas = () => Math.max(1, Math.ceil(pista.scrollWidth / pista.clientWidth - 0.05));

  function actualizar() {
    pendiente = false;
    const max = maximo();
    const hayScroll = max > 4;
    prev.hidden = next.hidden = puntos.hidden = !hayScroll;
    if (!hayScroll) return;

    prev.disabled = pista.scrollLeft <= 2;
    next.disabled = pista.scrollLeft >= max - 2;

    const n = paginas();
    if (puntos.children.length !== n) {
      puntos.innerHTML = Array.from({ length: n }, (_, i) =>
        `<button type="button" aria-label="Ir al grupo ${i + 1} de ${n}"></button>`).join('');
    }
    const idx = n > 1 ? Math.round(pista.scrollLeft / max * (n - 1)) : 0;
    Array.from(puntos.children).forEach((b, i) => b.classList.toggle('activo', i === idx));
  }

  function pedirActualizar() {
    if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
  }

  prev.addEventListener('click', () => pista.scrollBy({ left: -pista.clientWidth * 0.85, behavior: 'smooth' }));
  next.addEventListener('click', () => pista.scrollBy({ left: pista.clientWidth * 0.85, behavior: 'smooth' }));
  puntos.addEventListener('click', e => {
    const i = Array.from(puntos.children).indexOf(e.target.closest('button'));
    if (i < 0) return;
    const n = paginas();
    pista.scrollTo({ left: n > 1 ? maximo() * i / (n - 1) : 0, behavior: 'smooth' });
  });
  pista.addEventListener('scroll', pedirActualizar, { passive: true });
  window.addEventListener('resize', pedirActualizar);
  pedirActualizar();
}
