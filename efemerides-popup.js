'use strict';
/* Cartel de efemérides: aparece la primera vez que alguien entra en el día,
   solo si hay efemérides cargadas para esa fecha.
   Para probarlo con otra fecha: agregá ?efemeride=MM-DD al final de la dirección
   (por ejemplo index.html?efemeride=10-23). */
(async function () {
  if (typeof abrirDialogoEfemerides !== 'function') return;

  const hoy = hoyArgentina();
  const param = new URLSearchParams(location.search).get('efemeride');
  let mes = hoy.mes, dia = hoy.dia, prueba = false;

  if (param) {
    prueba = true;                                   // modo prueba: ignora si ya lo viste hoy
    const m = /^(\d{1,2})-(\d{1,2})$/.exec(param);
    if (m) { mes = Number(m[1]); dia = Number(m[2]); }
  }

  const clave = hoy.anio + '-' + hoy.mes + '-' + hoy.dia;
  if (!prueba) {
    try { if (localStorage.getItem('otr_efem_visto') === clave) return; } catch (e) { /* sin problema */ }
  }

  const datos = await cargarEfemerides({ mes, dia });
  const lista = (datos || []).filter(e => e.mes === mes && e.dia === dia)
    .sort((a, b) => (a.anio || 0) - (b.anio || 0));
  if (!lista.length) return;

  abrirDialogoEfemerides(lista, {
    hoy,
    etiqueta: prueba && (mes !== hoy.mes || dia !== hoy.dia) ? 'Efemérides del día' : 'Un día como hoy',
    fechaTexto: dia + ' de ' + MESES[mes - 1]
  });

  if (!prueba) {
    try { localStorage.setItem('otr_efem_visto', clave); } catch (e) { /* sin problema */ }
  }
})();
