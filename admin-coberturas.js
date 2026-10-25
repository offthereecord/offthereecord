'use strict';
/* Panel de administración: coberturas (lista y editor con varias fotos) */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);

  let actual = null;   // cobertura que se está editando (null = nueva)
  let fotos = [];      // direcciones de las fotos, en orden
  let portada = '';    // la foto principal

  /* ---------- Fotos del editor ---------- */
  function pintarFotos() {
    if (portada && !fotos.includes(portada)) portada = '';
    if (!portada && fotos.length) portada = fotos[0];
    $('cbCantidad').textContent = fotos.length
      ? fotos.length + (fotos.length === 1 ? ' foto' : ' fotos') + ' · la marcada con ✓ es la portada'
      : 'Todavía no subiste fotos.';
    $('cbFotos').innerHTML = fotos.map((u, i) => `
      <div class="foto-adm">
        <img src="${esc(u)}" alt="Foto ${i + 1}">
        <div class="foto-botones">
          <button type="button" data-a="portada" data-i="${i}"${u === portada ? ' class="activa"' : ''}>${u === portada ? 'Portada ✓' : 'Hacer portada'}</button>
          <button type="button" data-a="izq" data-i="${i}" aria-label="Mover a la izquierda"${i === 0 ? ' disabled' : ''}>◀</button>
          <button type="button" data-a="der" data-i="${i}" aria-label="Mover a la derecha"${i === fotos.length - 1 ? ' disabled' : ''}>▶</button>
          <button type="button" class="peligro" data-a="quitar" data-i="${i}">Quitar</button>
        </div>
      </div>`).join('');
  }

  $('cbFotos').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.a === 'portada') portada = fotos[i];
    if (b.dataset.a === 'izq' && i > 0) [fotos[i - 1], fotos[i]] = [fotos[i], fotos[i - 1]];
    if (b.dataset.a === 'der' && i < fotos.length - 1) [fotos[i + 1], fotos[i]] = [fotos[i], fotos[i + 1]];
    if (b.dataset.a === 'quitar') fotos.splice(i, 1);
    pintarFotos();
  });

  $('cbSubir').addEventListener('change', async () => {
    const archivos = Array.from($('cbSubir').files);
    if (!archivos.length) return;
    let ok = 0, fallos = 0;
    for (let n = 0; n < archivos.length; n++) {
      A.mensaje($('msgCb'), 'Subiendo foto ' + (n + 1) + ' de ' + archivos.length + '…');
      try {
        fotos.push(await A.subirImagen(archivos[n], 1800));   // las fotos se achican a 1800 px de ancho
        ok++;
        pintarFotos();
      } catch (err) { fallos++; console.error(err); }
    }
    $('cbSubir').value = '';
    A.mensaje($('msgCb'), fallos
      ? ok + ' foto(s) subidas y ' + fallos + ' con error. Volvé a intentar con las que faltan.'
      : ok + (ok === 1 ? ' foto subida' : ' fotos subidas') + '. Recordá guardar la cobertura.', fallos ? 'error' : 'ok');
  });

  /* ---------- Lista ---------- */
  async function mostrarLista() {
    $('cbVistaEditor').hidden = true;
    $('cbVistaLista').hidden = false;
    A.mensaje($('msgCbLista'), '');
    const cont = $('cbItems');
    cont.innerHTML = '<p class="vacio">Cargando…</p>';

    const { data, error } = await sb.from('coberturas')
      .select('id, titulo, artista, lugar, fecha_evento, portada, publicada')
      .order('fecha_evento', { ascending: false, nullsFirst: false })
      .order('creada_en', { ascending: false });

    if (error) {
      cont.innerHTML = '<p class="vacio">No pudimos cargar las coberturas. ¿Ejecutaste el script 04-coberturas-y-perfil.sql en Supabase?</p>';
      return;
    }
    if (!data.length) {
      cont.innerHTML = '<p class="vacio">Todavía no cargaste ninguna cobertura. Tocá «Nueva cobertura».</p>';
      return;
    }
    cont.innerHTML = data.map(c => {
      const foto = urlSegura(c.portada);
      const detalle = [c.artista, c.lugar, c.fecha_evento ? fechaDia(c.fecha_evento) : ''].filter(Boolean).join(' · ');
      return `
      <div class="fila-nota">
        <div class="info">
          ${foto ? `<img class="mini" src="${esc(foto)}" alt="">` : '<div class="mini"></div>'}
          <div>
            <strong>${esc(c.titulo)}<span class="estado ${c.publicada ? 'pub' : ''}">${c.publicada ? 'Visible' : 'Oculta'}</span></strong>
            <small>${esc(detalle)}</small>
          </div>
        </div>
        <div class="acciones">
          <button type="button" data-accion="editar" data-id="${esc(c.id)}">Editar</button>
          <a class="boton" href="cobertura.html?id=${encodeURIComponent(c.id)}" target="_blank" rel="noopener">Ver</a>
          <button type="button" class="peligro" data-accion="borrar" data-id="${esc(c.id)}" data-titulo="${esc(c.titulo)}">Borrar</button>
        </div>
      </div>`;
    }).join('');
  }

  $('cbItems').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    if (btn.dataset.accion === 'editar') return abrirEditor(btn.dataset.id);
    if (btn.dataset.accion === 'borrar') {
      if (!confirm('¿Borrar la cobertura «' + btn.dataset.titulo + '»? No se puede deshacer.')) return;
      const { data, error } = await sb.from('coberturas').delete().eq('id', btn.dataset.id).select();
      if (error || !data.length) A.mensaje($('msgCbLista'), A.textoError(error) || 'No se pudo borrar la cobertura.', 'error');
      else A.mensaje($('msgCbLista'), 'Cobertura borrada.', 'ok');
      mostrarLista();
    }
  });

  /* ---------- Editor ---------- */
  async function cargarNotas(seleccionada) {
    const sel = $('cbNota');
    sel.innerHTML = '';
    sel.add(new Option('— Ninguna —', ''));
    const { data } = await sb.from('notas').select('id, titulo').eq('publicada', true).order('creada_en', { ascending: false });
    (data || []).forEach(n => sel.add(new Option(n.titulo, n.id)));
    sel.value = seleccionada || '';
  }

  async function abrirEditor(id) {
    actual = null;
    fotos = [];
    portada = '';
    $('formCb').reset();
    $('cbPublicada').checked = true;
    try { $('cbCredito').value = localStorage.getItem('otr_credito') || ''; } catch (e) { /* sin problema */ }
    A.mensaje($('msgCb'), '');
    $('cbTituloEditor').textContent = 'Nueva cobertura';
    let notaId = '';

    if (id) {
      const { data, error } = await sb.from('coberturas').select('*').eq('id', id).single();
      if (error) { A.mensaje($('msgCbLista'), A.textoError(error), 'error'); return; }
      actual = data;
      $('cbTituloEditor').textContent = 'Editar cobertura';
      $('cbTitulo').value = data.titulo || '';
      $('cbArtista').value = data.artista || '';
      $('cbLugar').value = data.lugar || '';
      $('cbFecha').value = data.fecha_evento || '';
      $('cbDescripcion').value = data.descripcion || '';
      $('cbCredito').value = data.credito || '';
      $('cbPublicada').checked = !!data.publicada;
      fotos = (data.fotos || []).slice();
      portada = data.portada || '';
      notaId = data.nota_id || '';
    }
    pintarFotos();
    await cargarNotas(notaId);
    $('cbVistaLista').hidden = true;
    $('cbVistaEditor').hidden = false;
    window.scrollTo(0, 0);
  }

  $('formCb').addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = $('cbTitulo').value.trim();
    if (!titulo) { A.mensaje($('msgCb'), 'Escribí un título.', 'error'); return; }

    const registro = {
      titulo,
      artista: $('cbArtista').value.trim() || null,
      lugar: $('cbLugar').value.trim() || null,
      fecha_evento: $('cbFecha').value || null,
      descripcion: $('cbDescripcion').value.trim() || null,
      credito: $('cbCredito').value.trim() || null,
      portada: portada || fotos[0] || null,
      fotos,
      nota_id: $('cbNota').value || null,
      publicada: $('cbPublicada').checked
    };

    $('btnCbGuardar').disabled = true;
    A.mensaje($('msgCb'), 'Guardando…');
    const res = actual
      ? await sb.from('coberturas').update(registro).eq('id', actual.id).select().single()
      : await sb.from('coberturas').insert(registro).select().single();
    $('btnCbGuardar').disabled = false;

    if (res.error) { A.mensaje($('msgCb'), A.textoError(res.error), 'error'); return; }
    actual = res.data;
    $('cbTituloEditor').textContent = 'Editar cobertura';
    try { if (registro.credito) localStorage.setItem('otr_credito', registro.credito); } catch (err) { /* sin problema */ }
    A.mensaje($('msgCb'), registro.publicada ? 'Guardado y visible en el sitio ✓' : 'Guardado como oculta ✓', 'ok');
  });

  $('btnNuevaCb').addEventListener('click', () => abrirEditor(null));
  $('btnCbVolver').addEventListener('click', mostrarLista);

  /* ---------- Conexión con el resto del panel ---------- */
  document.addEventListener('otr:pestana', e => { if (e.detail === 'coberturas') mostrarLista(); });
  document.addEventListener('otr:sesion', e => { $('btnNuevaCb').hidden = !e.detail.admin; });
})();
