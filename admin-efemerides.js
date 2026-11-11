'use strict';
/* Panel de administración: efemérides (lista y editor) */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);

  let actual = null;    // efeméride que se está editando (null = nueva)
  let imagenUrl = '';

  const TIPOS = { cumpleanos: 'Cumpleaños', lanzamiento: 'Lanzamiento', formacion: 'Formación', fallecimiento: 'Fallecimiento', otro: 'Otro hecho' };

  MESES.forEach((m, i) => $('efMes').add(new Option(m.charAt(0).toUpperCase() + m.slice(1), i + 1)));

  function mostrarImagen() {
    const hay = !!imagenUrl;
    $('efMiniatura').hidden = !hay;
    $('btnEfQuitarImagen').hidden = !hay;
    if (hay) $('efMiniatura').src = imagenUrl;
  }

  /* ---------- Lista: próxima fecha, buscador y solapas por mes ---------- */
  let todas = [];       // todas las efemérides cargadas
  let mesActivo = null; // mes (1-12) de la solapa abierta
  let busqueda = '';    // texto del buscador ('' = sin buscar)
  let soloOcultas = false; // filtro: ver solo las efemérides ocultas
  let duplicadas = {};  // id -> título de la efeméride con la que se parece

  const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);
  const sinTildes = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* Días que faltan para la próxima vez que cae esa fecha (0 = hoy) */
  function faltan(e, hoy) {
    const h = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);
    let f = Date.UTC(hoy.anio, e.mes - 1, e.dia);
    if (f < h) f = Date.UTC(hoy.anio + 1, e.mes - 1, e.dia);
    return Math.round((f - h) / 86400000);
  }

  function detalle(e, conFecha) {
    const fecha = conFecha ? e.dia + ' de ' + MESES[e.mes - 1] + (e.anio ? ' de ' + e.anio : '') : e.anio;
    return [fecha, TIPOS[e.tipo] || 'Otro hecho', e.ambito === 'internacional' ? 'Internacional' : 'Nacional'].filter(Boolean).join(' · ');
  }

  /* ---- Posibles duplicados: mismo día y mes, y además mismo año o título parecido ---- */
  const PALABRAS_COMUNES = ['para', 'nace', 'nacio', 'banda', 'lanzo', 'lanzamiento', 'publica', 'publico', 'cumpleanos', 'nacimiento',
    'fallecimiento', 'formacion', 'formo', 'disco', 'primer', 'primera', 'sale', 'salio', 'murio', 'fallecio', 'cumple', 'aniversario'];
  function palabras(t) {
    return sinTildes(t).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(p => p.length >= 4 && !PALABRAS_COMUNES.includes(p));
  }
  function parecidas(x, y) {
    const a = palabras(x.titulo), b = palabras(y.titulo);
    if (!a.length || !b.length) return false;
    const comunes = a.filter(p => b.includes(p)).length;
    return comunes / new Set([...a, ...b]).size >= 0.5;
  }
  function buscarDuplicadas() {
    duplicadas = {};
    for (let i = 0; i < todas.length; i++) {
      for (let j = i + 1; j < todas.length; j++) {
        const x = todas[i], y = todas[j];
        if (x.dia !== y.dia || x.mes !== y.mes) continue;
        if ((x.anio && x.anio === y.anio) || parecidas(x, y)) {
          duplicadas[x.id] = duplicadas[x.id] || y.titulo;
          duplicadas[y.id] = duplicadas[y.id] || x.titulo;
        }
      }
    }
  }

  function dibujarProxima() {
    const cont = $('efProxima');
    const hoy = hoyArgentina();
    const visibles = todas.filter(e => e.publicada).map(e => ({ e, d: faltan(e, hoy) }));
    if (!visibles.length) { cont.innerHTML = ''; return; }
    const min = Math.min(...visibles.map(x => x.d));
    const grupo = visibles.filter(x => x.d === min).map(x => x.e);
    const cuando = min === 0 ? 'Hoy' : min === 1 ? 'Mañana' : 'En ' + min + ' días';
    const f = grupo[0];
    cont.innerHTML = `
      <div class="caja ef-proxima">
        <span class="ef-proxima-et">Próxima fecha</span>
        <strong class="ef-proxima-cuando">${esc(cuando)} · ${esc(f.dia)} de ${esc(MESES[f.mes - 1])}</strong>
        ${grupo.map(e => `
          <div class="ef-proxima-item">
            <div><span class="ef-proxima-tit">${esc(e.titulo)}</span><small>${esc(detalle(e))}</small></div>
            <button type="button" data-accion="editar" data-id="${esc(e.id)}">Editar</button>
          </div>`).join('')}
      </div>`;
  }

  function dibujarMeses() {
    const hoy = hoyArgentina();
    const filtrando = !!busqueda || soloOcultas;
    $('efMeses').classList.toggle('buscando', filtrando);
    $('efMeses').innerHTML = MES_CORTO.map((m, i) => {
      const n = todas.filter(e => e.mes === i + 1).length;
      const clases = [n ? '' : 'sin-datos', hoy.mes === i + 1 ? 'actual' : ''].join(' ').trim();
      return `<button type="button" role="tab" data-mes="${i + 1}" aria-selected="${!filtrando && mesActivo === i + 1}" class="${clases}" title="${esc(mayus(MESES[i]))}">
        ${m}<span class="n">${n || '–'}</span></button>`;
    }).join('');
  }

  /* Marcas de "le falta algo": para ir completando de a poco */
  function faltas(e) {
    const f = [];
    if (!e.descripcion) f.push('sin descripción');
    if (!e.imagen) f.push('sin imagen');
    if (!e.nota_id) f.push('sin nota enlazada');
    return f.length ? '<small class="ef-faltas">' + f.map(t => '<span>' + t + '</span>').join('') + '</small>' : '';
  }

  function filaHtml(e, hoy, conFecha) {
    const esHoy = hoy.mes === e.mes && hoy.dia === e.dia;
    const dup = duplicadas[e.id];
    return `
      <div class="fila-nota ef-fila ${esHoy ? 'es-hoy' : ''}">
        <div class="info">
          <span class="ef-dia">${esc(e.dia)}${conFecha ? '<small>' + esc(MES_CORTO[e.mes - 1]) + '</small>' : ''}</span>
          <div>
            <strong>${esc(e.titulo)}${esHoy ? '<span class="estado hoy">Hoy</span>' : ''}<span class="estado ${e.publicada ? 'pub' : ''}">${e.publicada ? 'Visible' : 'Oculta'}</span>${dup ? '<span class="estado dup" title="Se parece a: ' + esc(dup) + '">Posible duplicado</span>' : ''}</strong>
            <small>${esc(detalle(e, false))}</small>
            ${faltas(e)}
          </div>
        </div>
        <div class="acciones">
          <button type="button" data-accion="editar" data-id="${esc(e.id)}">Editar</button>
          <button type="button" class="peligro" data-accion="borrar" data-id="${esc(e.id)}" data-titulo="${esc(e.titulo)}">Borrar</button>
        </div>
      </div>`;
  }

  /* Días del mes que todavía no tienen ninguna efeméride (tocá uno para cargarla) */
  function dibujarHuecos() {
    const cont = $('efHuecos');
    const total = new Date(2024, mesActivo, 0).getDate();   // 2024 es bisiesto: febrero muestra 29
    const ocupados = new Set(todas.filter(e => e.mes === mesActivo).map(e => e.dia));
    const libres = [];
    for (let d = 1; d <= total; d++) if (!ocupados.has(d)) libres.push(d);
    if (!libres.length) { cont.innerHTML = '<p class="ef-huecos-ok">Todos los días de ' + esc(MESES[mesActivo - 1]) + ' tienen efeméride ✓</p>'; return; }
    cont.innerHTML = `<details class="ef-huecos">
      <summary>Días sin efeméride en ${esc(MESES[mesActivo - 1])} (${libres.length} de ${total})</summary>
      <div class="ef-huecos-dias">${libres.map(d => `<button type="button" data-accion="nuevo-dia" data-dia="${d}" title="Cargar una efeméride el ${d} de ${esc(MESES[mesActivo - 1])}">${d}</button>`).join('')}</div>
    </details>`;
  }

  function dibujarMes() {
    const cont = $('efItems');
    const hoy = hoyArgentina();
    const aviso = $('efAviso');
    const nDup = Object.keys(duplicadas).length;
    aviso.hidden = !nDup;
    aviso.textContent = nDup ? 'Ojo: hay ' + nDup + ' efemérides que podrían estar duplicadas (están marcadas como «Posible duplicado»). Revisalas y borrá la que sobre.' : '';

    const ocultasTotal = todas.filter(e => !e.publicada).length;
    $('efOcultas').textContent = 'Solo ocultas (' + ocultasTotal + ')';
    $('efOcultas').setAttribute('aria-pressed', soloOcultas);
    $('efOcultas').disabled = !ocultasTotal && !soloOcultas;

    if (busqueda || soloOcultas) {
      $('efHuecos').innerHTML = '';
      const q = sinTildes(busqueda.trim());
      const res = todas.filter(e => (!soloOcultas || !e.publicada) &&
        (!q || sinTildes(e.titulo).includes(q) || sinTildes(e.descripcion).includes(q)));
      const que = [busqueda.trim() ? '«' + esc(busqueda.trim()) + '»' : '', soloOcultas ? 'ocultas' : ''].filter(Boolean).join(' · ');
      if (!res.length) { cont.innerHTML = '<p class="vacio">No encontramos efemérides' + (soloOcultas && !q ? ' ocultas.' : ' con ' + que + '.') + '</p>'; return; }
      cont.innerHTML = '<p class="ef-resultados">' + res.length + (res.length === 1 ? ' resultado' : ' resultados') + ' · ' + que + '</p>'
        + res.map(e => filaHtml(e, hoy, true)).join('');
      return;
    }

    dibujarHuecos();
    const lista = todas.filter(e => e.mes === mesActivo);
    if (!lista.length) {
      cont.innerHTML = '<p class="vacio">No hay efemérides en ' + esc(MESES[mesActivo - 1]) + '. Tocá «Nueva efeméride» para cargar una.</p>';
      return;
    }
    cont.innerHTML = lista.map(e => filaHtml(e, hoy, false)).join('');
  }

  function dibujarTodo() { dibujarProxima(); dibujarMeses(); dibujarMes(); }

  $('efMeses').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-mes]');
    if (!b) return;
    mesActivo = parseInt(b.dataset.mes, 10);
    busqueda = '';
    soloOcultas = false;
    $('efBuscar').value = '';
    dibujarMeses();
    dibujarMes();
  });

  $('efOcultas').addEventListener('click', () => {
    soloOcultas = !soloOcultas;
    dibujarMeses();
    dibujarMes();
  });

  $('efBuscar').addEventListener('input', () => {
    busqueda = $('efBuscar').value;
    dibujarMeses();
    dibujarMes();
  });

  /* ---------- Lista ---------- */
  async function mostrarLista() {
    $('efVistaEditor').hidden = true;
    $('efVistaLista').hidden = false;
    A.mensaje($('msgEfLista'), '');
    const cont = $('efItems');
    cont.innerHTML = '<p class="vacio">Cargando…</p>';

    const pedir = campos => sb.from('efemerides').select(campos)
      .order('mes', { ascending: true }).order('dia', { ascending: true }).order('anio', { ascending: true });
    let { data, error } = await pedir('id, dia, mes, anio, titulo, descripcion, imagen, nota_id, ambito, tipo, publicada');
    if (error) ({ data, error } = await pedir('id, dia, mes, anio, titulo, descripcion, imagen, nota_id, ambito, publicada'));   // por si falta la columna "tipo"

    if (error) { cont.innerHTML = '<p class="vacio">No pudimos cargar las efemérides.</p>'; return; }
    todas = data;
    buscarDuplicadas();
    if (mesActivo === null) mesActivo = hoyArgentina().mes;   // la primera vez abre el mes actual
    dibujarTodo();
  }

  async function alClickear(ev) {
    const btn = ev.target.closest('button[data-accion]');
    if (!btn) return;
    if (btn.dataset.accion === 'editar') return abrirEditor(btn.dataset.id);
    if (btn.dataset.accion === 'nuevo-dia') return abrirEditor(null, { dia: btn.dataset.dia });
    if (btn.dataset.accion === 'borrar') {
      if (!confirm('¿Borrar la efeméride «' + btn.dataset.titulo + '»? No se puede deshacer.')) return;
      const { data, error } = await sb.from('efemerides').delete().eq('id', btn.dataset.id).select();
      if (error || !data.length) A.mensaje($('msgEfLista'), A.textoError(error) || 'No se pudo borrar la efeméride.', 'error');
      else A.mensaje($('msgEfLista'), 'Efeméride borrada.', 'ok');
      mostrarLista();
    }
  }
  $('efItems').addEventListener('click', alClickear);
  $('efProxima').addEventListener('click', alClickear);
  $('efHuecos').addEventListener('click', alClickear);

  /* ---------- Editor ---------- */
  async function cargarNotas(seleccionada) {
    const sel = $('efNota');
    sel.innerHTML = '';
    sel.add(new Option('— Ninguna —', ''));
    const { data } = await sb.from('notas').select('id, titulo').eq('publicada', true).order('creada_en', { ascending: false });
    (data || []).forEach(n => sel.add(new Option(n.titulo, n.id)));
    sel.value = seleccionada || '';
  }

  async function abrirEditor(id, previo) {
    actual = null;
    imagenUrl = '';
    $('formEf').reset();
    $('efPublicada').checked = true;
    $('efTipo').value = 'cumpleanos';
    if (mesActivo) $('efMes').value = mesActivo;
    if (previo && previo.dia) $('efDia').value = previo.dia;
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
      $('efTipo').value = data.tipo || 'otro';
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
      tipo: $('efTipo').value,
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

    if (res.error) {
      const falta = /tipo/i.test(res.error.message || '');
      A.mensaje($('msgEf'), falta ? 'Falta ejecutar el script 03-efemerides-tipo.sql en Supabase (ver el ayuda memoria).' : A.textoError(res.error), 'error');
      return;
    }
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
