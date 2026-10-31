'use strict';
/* Panel de administración: "Quién soy" (foto y texto de presentación) */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);
  let fotoUrl = '';

  function mostrarFoto() {
    const hay = !!fotoUrl;
    $('pfMiniatura').hidden = !hay;
    $('btnPfQuitarFoto').hidden = !hay;
    if (hay) $('pfMiniatura').src = fotoUrl;
  }

  async function cargar() {
    A.mensaje($('msgPf'), '');
    const { data, error } = await sb.from('perfil').select('*').eq('id', 1).maybeSingle();
    if (error) {
      A.mensaje($('msgPf'), 'No pudimos cargar tus datos. ¿Ejecutaste el script 04-coberturas-y-perfil.sql en Supabase?', 'error');
      return;
    }
    $('pfNombre').value = (data && data.nombre) || '';
    $('pfSubtitulo').value = (data && data.subtitulo) || '';
    $('pfTexto').value = (data && data.texto) || '';
    fotoUrl = (data && data.foto) || '';
    mostrarFoto();
  }

  $('pfFotoArchivo').addEventListener('change', async () => {
    const archivo = $('pfFotoArchivo').files[0];
    if (!archivo) return;
    try {
      A.mensaje($('msgPf'), 'Subiendo foto…');
      fotoUrl = await A.subirImagen(archivo, 1000);
      mostrarFoto();
      A.mensaje($('msgPf'), 'Foto cargada. Recordá tocar Guardar.', 'ok');
    } catch (err) {
      A.mensaje($('msgPf'), A.textoError(err), 'error');
    }
    $('pfFotoArchivo').value = '';
  });

  $('btnPfQuitarFoto').addEventListener('click', () => { fotoUrl = ''; mostrarFoto(); });

  $('formPerfil').addEventListener('submit', async e => {
    e.preventDefault();
    const registro = {
      id: 1,
      nombre: $('pfNombre').value.trim() || null,
      subtitulo: $('pfSubtitulo').value.trim() || null,
      texto: $('pfTexto').value.trim() || null,
      foto: fotoUrl || null,
      actualizado_en: new Date().toISOString()
    };
    $('btnPfGuardar').disabled = true;
    A.mensaje($('msgPf'), 'Guardando…');
    const res = await sb.from('perfil').upsert(registro).select().single();
    $('btnPfGuardar').disabled = false;
    if (res.error) { A.mensaje($('msgPf'), A.textoError(res.error), 'error'); return; }
    A.mensaje($('msgPf'), 'Guardado ✓ Ya se ve en la página «¿Quién soy?».', 'ok');
  });

  document.addEventListener('otr:pestana', e => { if (e.detail === 'perfil') cargar(); });
})();
