'use strict';
/* Panel de administración: bandas emergentes (lista y ficha) */
(function () {
  const A = window.OTR_ADMIN;
  const $ = id => document.getElementById(id);
  const LINKS = { instagram: 'emInstagram', spotify: 'emSpotify', youtube: 'emYoutube', bandcamp: 'emBandcamp', web: 'emWeb' };

  let actual = null;   // banda que se está editando (null = nueva)
  let fotoUrl = '';

  /* "Los Ñandúes" → "los-nandues" (es la dirección de la ficha) */
  function slugify(t) {
    return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'banda';
  }

  function mostrarFoto() {
    const hay = !!fotoUrl;
    $('emMiniatura').hidden = !hay;
    $('btnEmQuitarFoto').hidden = !hay;
    if (hay) $('emMiniatura').src = fotoUrl;
  }

  /* ---------- Lista ---------- */
  async function mostrarLista() {
    $('emVistaEditor').hidden = true;
    $('emVistaLista').hidden = false;
    A.mensaje($('msgEmLista'), '');
    const cont = $('emItems');
    cont.innerHTML = '<p class="vacio">Cargando…</p>';

    const { data, error } = await sb.from('bandas')
      .select('id, nombre, slug, genero, ciudad, imagen, destacada, publicada')
      .order('creada_en', { ascending: false });

    if (error) { cont.innerHTML = '<p class="vacio">No pudimos cargar las bandas.</p>'; return; }
    if (!data.length) {
      cont.innerHTML = '<p class="vacio">Todavía no cargaste ninguna banda. Tocá «Nueva banda».</p>';
      return;
    }
    cont.innerHTML = data.map(b => {
      const foto = urlSegura(b.imagen);
      const detalle = [b.genero, b.ciudad].filter(Boolean).join(' · ');
      return `
      <div class="fila-nota">
        <div class="info">
          ${foto ? `<img class="mini" src="${esc(foto)}" alt="">` : '<div class="mini"></div>'}
          <div>
            <strong>${esc(b.nombre)}<span class="estado ${b.publicada ? 'pub' : ''}">${b.publicada ? 'Visible' : 'Oculta'}</span>${b.destacada ? '<span class="estado">Destacada</span>' : ''}</strong>
            <small>${esc(detalle)}</small>
          </div>
        </div>
        <div class="acciones">
          <button type="button" data-accion="editar" data-id="${esc(b.id)}">Editar</button>
          <a class="boton" href="banda.html?slug=${encodeURIComponent(b.slug)}" target="_blank" rel="noopener">Ver</a>
          <button type="button" class="peligro" data-accion="borrar" data-id="${esc(b.id)}" data-titulo="${esc(b.nombre)}">Borrar</button>
        </div>
      </div>`;
    }).join('');
  }

  $('emItems').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    if (btn.dataset.accion === 'editar') return abrirEditor(btn.dataset.id);
    if (btn.dataset.accion === 'borrar') {
      if (!confirm('¿Borrar la banda «' + btn.dataset.titulo + '»? No se puede deshacer.')) return;
      const { data, error } = await sb.from('bandas').delete().eq('id', btn.dataset.id).select();
      if (error || !data.length) A.mensaje($('msgEmLista'), A.textoError(error) || 'No se pudo borrar la banda.', 'error');
      else A.mensaje($('msgEmLista'), 'Banda borrada.', 'ok');
      mostrarLista();
    }
  });

  /* ---------- Editor ---------- */
  async function abrirEditor(id) {
    actual = null;
    fotoUrl = '';
    $('formEm').reset();
    $('emPublicada').checked = true;
    A.mensaje($('msgEm'), '');
    $('emTituloEditor').textContent = 'Nueva banda';

    if (id) {
      const { data, error } = await sb.from('bandas').select('*').eq('id', id).single();
      if (error) { A.mensaje($('msgEmLista'), A.textoError(error), 'error'); return; }
      actual = data;
      $('emTituloEditor').textContent = 'Editar banda';
      $('emNombre').value = data.nombre || '';
      $('emGenero').value = data.genero || '';
      $('emCiudad').value = data.ciudad || '';
      $('emBio').value = data.bio || '';
      $('emDestacada').checked = !!data.destacada;
      $('emPublicada').checked = !!data.publicada;
      fotoUrl = data.imagen || '';
      Object.keys(LINKS).forEach(k => { $(LINKS[k]).value = (data.links || {})[k] || ''; });
    }
    mostrarFoto();
    $('emVistaLista').hidden = true;
    $('emVistaEditor').hidden = false;
    window.scrollTo(0, 0);
  }

  $('emFotoArchivo').addEventListener('change', async () => {
    const archivo = $('emFotoArchivo').files[0];
    if (!archivo) return;
    try {
      A.mensaje($('msgEm'), 'Subiendo foto…');
      fotoUrl = await A.subirImagen(archivo, 1200);
      mostrarFoto();
      A.mensaje($('msgEm'), 'Foto cargada. Recordá guardar la banda.', 'ok');
    } catch (err) {
      A.mensaje($('msgEm'), A.textoError(err), 'error');
    }
    $('emFotoArchivo').value = '';
  });
  $('btnEmQuitarFoto').addEventListener('click', () => { fotoUrl = ''; mostrarFoto(); });

  async function insertarConSlug(registro) {
    let slug = slugify(registro.nombre);
    for (let i = 0; i < 3; i++) {
      const res = await sb.from('bandas').insert({ ...registro, slug }).select().single();
      if (!res.error || res.error.code !== '23505') return res;      // 23505 = esa dirección ya existe
      slug = slugify(registro.nombre) + '-' + Math.random().toString(36).slice(2, 6);
    }
    return { error: { message: 'No se pudo generar una dirección única para la banda.' } };
  }

  $('formEm').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('emNombre').value.trim();
    if (!nombre) { A.mensaje($('msgEm'), 'Escribí el nombre de la banda.', 'error'); return; }

    const links = {};
    for (const k of Object.keys(LINKS)) {
      const txt = $(LINKS[k]).value.trim();
      if (!txt) continue;
      if (!urlSegura(txt)) { A.mensaje($('msgEm'), 'El link de ' + k + ' no es válido: tiene que empezar con https://', 'error'); return; }
      links[k] = urlSegura(txt);
    }
    const registro = {
      nombre,
      genero: $('emGenero').value.trim() || null,
      ciudad: $('emCiudad').value.trim() || null,
      bio: $('emBio').value.trim() || null,
      imagen: fotoUrl || null,
      links,
      destacada: $('emDestacada').checked,
      publicada: $('emPublicada').checked
    };

    $('btnEmGuardar').disabled = true;
    A.mensaje($('msgEm'), 'Guardando…');
    const res = actual
      ? await sb.from('bandas').update(registro).eq('id', actual.id).select().single()
      : await insertarConSlug(registro);
    $('btnEmGuardar').disabled = false;

    if (res.error) { A.mensaje($('msgEm'), A.textoError(res.error), 'error'); return; }
    actual = res.data;
    $('emTituloEditor').textContent = 'Editar banda';
    A.mensaje($('msgEm'), registro.publicada ? 'Guardado y visible en Emergentes ✓' : 'Guardado como oculta ✓', 'ok');
  });

  $('btnNuevaEm').addEventListener('click', () => abrirEditor(null));
  $('btnEmVolver').addEventListener('click', mostrarLista);

  document.addEventListener('otr:pestana', e => { if (e.detail === 'emergentes') mostrarLista(); });
  document.addEventListener('otr:sesion', e => { $('btnNuevaEm').hidden = !e.detail.admin; });
})();
