'use strict';
/* Panel de administración: reseñas música (lista y editor) */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);

  let actual = null;   // reseña que se está editando (null = nueva)
  let tapaUrl = '';    // dirección de la tapa

  function mostrarTapa() {
    const hay = !!tapaUrl;
    $('rsMiniatura').hidden = !hay;
    $('btnRsQuitarTapa').hidden = !hay;
    if (hay) $('rsMiniatura').src = tapaUrl;
  }

  /* ---------- Lista ---------- */
  async function mostrarLista() {
    $('rsVistaEditor').hidden = true;
    $('rsVistaLista').hidden = false;
    A.mensaje($('msgRsLista'), '');
    const cont = $('rsItems');
    cont.innerHTML = '<p class="vacio">Cargando…</p>';

    const { data, error } = await sb.from('resenas')
      .select('id, titulo, artista, imagen, publicada, orden')
      .order('orden', { ascending: true })
      .order('creada_en', { ascending: false });

    if (error) {
      cont.innerHTML = '<p class="vacio">No pudimos cargar las reseñas. ¿Ejecutaste el script 02-resenas.sql en Supabase?</p>';
      return;
    }
    if (!data.length) {
      cont.innerHTML = '<p class="vacio">Todavía no cargaste ninguna reseña. Tocá «Nueva reseña».</p>';
      return;
    }
    cont.innerHTML = data.map(r => {
      const tapa = urlSegura(r.imagen);
      return `
      <div class="fila-nota">
        <div class="info">
          ${tapa ? `<img class="mini" src="${esc(tapa)}" alt="">` : '<div class="mini"></div>'}
          <div>
            <strong>${esc(r.titulo)}<span class="estado ${r.publicada ? 'pub' : ''}">${r.publicada ? 'Visible' : 'Oculta'}</span></strong>
            <small>${esc(r.artista)} · orden ${esc(r.orden)}</small>
          </div>
        </div>
        <div class="acciones">
          <button type="button" data-accion="editar" data-id="${esc(r.id)}">Editar</button>
          <button type="button" class="peligro" data-accion="borrar" data-id="${esc(r.id)}" data-titulo="${esc(r.titulo)}">Borrar</button>
        </div>
      </div>`;
    }).join('');
  }

  $('rsItems').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    if (btn.dataset.accion === 'editar') return abrirEditor(btn.dataset.id);
    if (btn.dataset.accion === 'borrar') {
      if (!confirm('¿Borrar la reseña «' + btn.dataset.titulo + '»? No se puede deshacer.')) return;
      const { data, error } = await sb.from('resenas').delete().eq('id', btn.dataset.id).select();
      if (error || !data.length) A.mensaje($('msgRsLista'), A.textoError(error) || 'No se pudo borrar la reseña.', 'error');
      else A.mensaje($('msgRsLista'), 'Reseña borrada.', 'ok');
      mostrarLista();
    }
  });

  /* ---------- Editor ---------- */
  async function cargarNotas(seleccionada) {
    const sel = $('rsNota');
    sel.innerHTML = '';
    sel.add(new Option('— Ninguna —', ''));
    const { data } = await sb.from('notas').select('id, titulo').eq('publicada', true).order('creada_en', { ascending: false });
    (data || []).forEach(n => sel.add(new Option(n.titulo, n.id)));
    sel.value = seleccionada || '';
  }

  async function abrirEditor(id) {
    actual = null;
    tapaUrl = '';
    $('formRs').reset();
    $('rsOrden').value = 0;
    $('rsPublicada').checked = true;
    A.mensaje($('msgRs'), '');
    $('rsTituloEditor').textContent = 'Nueva reseña';
    let notaId = '';

    if (id) {
      const { data, error } = await sb.from('resenas').select('*').eq('id', id).single();
      if (error) { A.mensaje($('msgRsLista'), A.textoError(error), 'error'); return; }
      actual = data;
      $('rsTituloEditor').textContent = 'Editar reseña';
      $('rsTitulo').value = data.titulo || '';
      $('rsArtista').value = data.artista || '';
      $('rsResumen').value = data.resumen || '';
      $('rsEnlace').value = data.enlace_url || '';
      $('rsOrden').value = data.orden ?? 0;
      $('rsPublicada').checked = !!data.publicada;
      tapaUrl = data.imagen || '';
      notaId = data.nota_id || '';
    }
    mostrarTapa();
    await cargarNotas(notaId);
    $('rsVistaLista').hidden = true;
    $('rsVistaEditor').hidden = false;
    window.scrollTo(0, 0);
  }

  $('rsTapa').addEventListener('change', async () => {
    const archivo = $('rsTapa').files[0];
    if (!archivo) return;
    try {
      A.mensaje($('msgRs'), 'Subiendo tapa…');
      tapaUrl = await A.subirImagen(archivo, 800);   // las tapas se achican a 800 px
      mostrarTapa();
      A.mensaje($('msgRs'), 'Tapa cargada. Recordá guardar la reseña.', 'ok');
    } catch (err) {
      A.mensaje($('msgRs'), A.textoError(err), 'error');
    }
    $('rsTapa').value = '';
  });

  $('btnRsQuitarTapa').addEventListener('click', () => { tapaUrl = ''; mostrarTapa(); });

  $('formRs').addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = $('rsTitulo').value.trim();
    const artista = $('rsArtista').value.trim();
    if (!titulo || !artista) { A.mensaje($('msgRs'), 'Completá el título y el artista.', 'error'); return; }

    const enlaceTxt = $('rsEnlace').value.trim();
    if (enlaceTxt && !urlSegura(enlaceTxt)) {
      A.mensaje($('msgRs'), 'El link no es válido: tiene que empezar con https://', 'error');
      return;
    }
    const registro = {
      titulo,
      artista,
      resumen: $('rsResumen').value.trim() || null,
      imagen: tapaUrl || null,
      enlace_url: enlaceTxt ? urlSegura(enlaceTxt) : null,
      nota_id: $('rsNota').value || null,
      orden: parseInt($('rsOrden').value, 10) || 0,
      publicada: $('rsPublicada').checked
    };

    $('btnRsGuardar').disabled = true;
    A.mensaje($('msgRs'), 'Guardando…');
    const res = actual
      ? await sb.from('resenas').update(registro).eq('id', actual.id).select().single()
      : await sb.from('resenas').insert(registro).select().single();
    $('btnRsGuardar').disabled = false;

    if (res.error) { A.mensaje($('msgRs'), A.textoError(res.error), 'error'); return; }
    actual = res.data;
    $('rsTituloEditor').textContent = 'Editar reseña';
    A.mensaje($('msgRs'), registro.publicada ? 'Guardado y visible en el sitio ✓' : 'Guardado como oculta ✓', 'ok');
  });

  $('btnNuevaRs').addEventListener('click', () => abrirEditor(null));
  $('btnRsVolver').addEventListener('click', mostrarLista);

  /* ---------- Conexión con el resto del panel ---------- */
  document.addEventListener('otr:pestana', e => { if (e.detail === 'resenas') mostrarLista(); });
  document.addEventListener('otr:sesion', e => { $('btnNuevaRs').hidden = !e.detail.admin; });
})();
