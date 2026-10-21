'use strict';
/* Panel de administración: efemérides (lista y editor) */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);

  let actual = null;    // efeméride que se está editando (null = nueva)
  let imagenUrl = '';

  MESES.forEach((m, i) => $('efMes').add(new Option(m.charAt(0).toUpperCase() + m.slice(1), i + 1)));

  function mostrarImagen() {
    const hay = !!imagenUrl;
    $('efMiniatura').hidden = !hay;
    $('btnEfQuitarImagen').hidden = !hay;
    if (hay) $('efMiniatura').src = imagenUrl;
  }

  /* ---------- Lista ---------- */
  async function mostrarLista() {
    $('efVistaEditor').hidden = true;
    $('efVistaLista').hidden = false;
    A.mensaje($('msgEfLista'), '');
    const cont = $('efItems');
    cont.innerHTML = '<p class="vacio">Cargando…</p>';

    const { data, error } = await sb.from('efemerides')
      .select('id, dia, mes, anio, titulo, ambito, publicada')
      .order('mes', { ascending: true }).order('dia', { ascending: true }).order('anio', { ascending: true });

    if (error) { cont.innerHTML = '<p class="vacio">No pudimos cargar las efemérides.</p>'; return; }
    if (!data.length) {
      cont.innerHTML = '<p class="vacio">Todavía no cargaste ninguna efeméride. Tocá «Nueva efeméride».</p>';
      return;
    }
    cont.innerHTML = data.map(e => `
      <div class="fila-nota">
        <div class="info">
          <div>
            <strong>${esc(e.dia)} de ${esc(MESES[e.mes - 1])}${e.anio ? ' de ' + esc(e.anio) : ''} — ${esc(e.titulo)}<span class="estado ${e.publicada ? 'pub' : ''}">${e.publicada ? 'Visible' : 'Oculta'}</span></strong>
            <small>${e.ambito === 'internacional' ? 'Internacional' : 'Nacional'}</small>
          </div>
        </div>
        <div class="acciones">
          <button type="button" data-accion="editar" data-id="${esc(e.id)}">Editar</button>
          <button type="button" class="peligro" data-accion="borrar" data-id="${esc(e.id)}" data-titulo="${esc(e.titulo)}">Borrar</button>
        </div>
      </div>`).join('');
  }

  $('efItems').addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-accion]');
    if (!btn) return;
    if (btn.dataset.accion === 'editar') return abrirEditor(btn.dataset.id);
    if (btn.dataset.accion === 'borrar') {
      if (!confirm('¿Borrar la efeméride «' + btn.dataset.titulo + '»? No se puede deshacer.')) return;
      const { data, error } = await sb.from('efemerides').delete().eq('id', btn.dataset.id).select();
      if (error || !data.length) A.mensaje($('msgEfLista'), A.textoError(error) || 'No se pudo borrar la efeméride.', 'error');
      else A.mensaje($('msgEfLista'), 'Efeméride borrada.', 'ok');
      mostrarLista();
    }
  });

  /* ---------- Editor ---------- */
  async function cargarNotas(seleccionada) {
    const sel = $('efNota');
    sel.innerHTML = '';
    sel.add(new Option('— Ninguna —', ''));
    const { data } = await sb.from('notas').select('id, titulo').eq('publicada', true).order('creada_en', { ascending: false });
    (data || []).forEach(n => sel.add(new Option(n.titulo, n.id)));
    sel.value = seleccionada || '';
  }

  async function abrirEditor(id) {
    actual = null;
    imagenUrl = '';
    $('formEf').reset();
    $('efPublicada').checked = true;
    A.mensaje($('msgEf'), '');
    $('efTituloEditor').textContent = 'Nueva efeméride';
    let notaId = '';

    if (id) {
      const { data, error } = await sb.from('efemerides').select('*').eq('id', id).single();
      if (error) { A.mensaje($('msgEfLista'), A.textoError(error), 'error'); return; }
      actual = data;
      $('efTituloEditor').textContent = 'Editar efeméride';
      $('efDia').value = data.dia;
      $('efMes').value = data.mes;
      $('efAnio').value = data.anio || '';
      $('efTitulo').value = data.titulo || '';
      $('efDescripcion').value = data.descripcion || '';
      $('efAmbito').value = data.ambito;
      $('efPublicada').checked = !!data.publicada;
      imagenUrl = data.imagen || '';
      notaId = data.nota_id || '';
    }
    mostrarImagen();
    await cargarNotas(notaId);
    $('efVistaLista').hidden = true;
    $('efVistaEditor').hidden = false;
    window.scrollTo(0, 0);
  }

  $('efImagen').addEventListener('change', async () => {
    const archivo = $('efImagen').files[0];
    if (!archivo) return;
    try {
      A.mensaje($('msgEf'), 'Subiendo imagen…');
      imagenUrl = await A.subirImagen(archivo, 1200);
      mostrarImagen();
      A.mensaje($('msgEf'), 'Imagen cargada. Recordá guardar la efeméride.', 'ok');
    } catch (err) {
      A.mensaje($('msgEf'), A.textoError(err), 'error');
    }
    $('efImagen').value = '';
  });
  $('btnEfQuitarImagen').addEventListener('click', () => { imagenUrl = ''; mostrarImagen(); });

  $('formEf').addEventListener('submit', async ev => {
    ev.preventDefault();
    const dia = parseInt($('efDia').value, 10);
    const mes = parseInt($('efMes').value, 10);
    const anioTxt = $('efAnio').value.trim();
    const titulo = $('efTitulo').value.trim();

    if (!titulo) { A.mensaje($('msgEf'), 'Escribí un título.', 'error'); return; }
    if (!(dia >= 1 && dia <= 31) || new Date(2024, mes - 1, dia).getMonth() !== mes - 1) {
      A.mensaje($('msgEf'), 'Ese día no existe en ese mes.', 'error'); return;
    }
    const anio = anioTxt ? parseInt(anioTxt, 10) : null;
    if (anioTxt && !(anio >= 1000 && anio <= 2100)) { A.mensaje($('msgEf'), 'El año no es válido.', 'error'); return; }

    const registro = {
      dia, mes, anio, titulo,
      descripcion: $('efDescripcion').value.trim() || null,
      ambito: $('efAmbito').value,
      imagen: imagenUrl || null,
      nota_id: $('efNota').value || null,
      publicada: $('efPublicada').checked
    };

    $('btnEfGuardar').disabled = true;
    A.mensaje($('msgEf'), 'Guardando…');
    const res = actual
      ? await sb.from('efemerides').update(registro).eq('id', actual.id).select().single()
      : await sb.from('efemerides').insert(registro).select().single();
    $('btnEfGuardar').disabled = false;

    if (res.error) { A.mensaje($('msgEf'), A.textoError(res.error), 'error'); return; }
    actual = res.data;
    $('efTituloEditor').textContent = 'Editar efeméride';
    A.mensaje($('msgEf'), registro.publicada ? 'Guardado y visible en el sitio ✓' : 'Guardado como oculta ✓', 'ok');
  });

  $('btnNuevaEf').addEventListener('click', () => abrirEditor(null));
  $('btnEfVolver').addEventListener('click', mostrarLista);

  /* ---------- Conexión con el resto del panel ---------- */
  document.addEventListener('otr:pestana', e => { if (e.detail === 'efemerides') mostrarLista(); });
  document.addEventListener('otr:sesion', e => { $('btnNuevaEf').hidden = !e.detail.admin; });
})();
