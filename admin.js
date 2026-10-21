'use strict';
/* Panel de administración: ingreso, lista de notas y editor */
(function () {
  const $ = id => document.getElementById(id);

  let quill = null;        // el editor de texto
  let notaActual = null;   // la nota que se está editando (null = nota nueva)
  let portadaUrl = '';     // dirección de la imagen de portada
  let usuarioId = null;    // para no reiniciar el panel sin necesidad
  let iniciado = false;
  let esAdminFlag = false; // ¿el usuario logueado es administrador?

  /* ---------- Utilidades ---------- */
  function mensaje(el, texto, tipo) {
    el.textContent = texto || '';
    el.className = 'mensaje' + (tipo ? ' ' + tipo : '');
  }

  /* "Crónica del sábado en Niceto" -> "cronica-del-sabado-en-niceto" */
  function slugify(t) {
    return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'nota';
  }

  function textoError(error) {
    if (!error) return '';
    if (error.code === '42501' || /row-level security/i.test(error.message || ''))
      return 'Tu usuario no tiene permiso para guardar. ¿Estás en la lista de administradores?';
    return 'No se pudo completar: ' + (error.message || 'error desconocido');
  }

  /* ---------- Imágenes ---------- */
  const EXTENSIONES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

  /* Achica las fotos grandes antes de subirlas (ahorra espacio y carga más rápido) */
  function reducirImagen(file, maxAncho = 1600) {
    return new Promise(resolve => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const escala = Math.min(1, maxAncho / img.width);
        if (escala === 1 && file.size < 1.5 * 1024 * 1024) return resolve(file);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const tipo = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        c.toBlob(b => resolve(b && b.size < file.size ? new File([b], file.name, { type: tipo }) : file), tipo, 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function subirImagen(archivo, maxAncho) {
    if (!EXTENSIONES[archivo.type]) throw new Error('Formato no permitido. Usá JPG, PNG, WEBP o GIF.');
    const file = await reducirImagen(archivo, maxAncho || 1600);
    const ext = EXTENSIONES[file.type] || EXTENSIONES[archivo.type];
    const ruta = new Date().getFullYear() + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const { error } = await sb.storage.from('imagenes').upload(ruta, file, {
      cacheControl: '31536000', upsert: false, contentType: file.type
    });
    if (error) throw error;
    return sb.storage.from('imagenes').getPublicUrl(ruta).data.publicUrl;
  }

  /* ---------- Ingreso / sesión ---------- */
  async function mostrarSegunSesion(session) {
    const id = session ? session.user.id : null;
    if (iniciado && id === usuarioId) return;       // misma sesión: no hacemos nada
    iniciado = true;
    usuarioId = id;

    $('login').hidden = !!session;
    $('panel').hidden = !session;
    if (!session) return;

    $('usuario').textContent = session.user.email;
    const { data } = await sb.rpc('es_admin');       // ¿está este usuario en la tabla admins?
    esAdminFlag = data === true;
    $('avisoAdmin').hidden = esAdminFlag;
    $('btnNueva').hidden = !esAdminFlag;
    document.dispatchEvent(new CustomEvent('otr:sesion', { detail: { admin: esAdminFlag } }));
    mostrarLista();
  }

  $('formLogin').addEventListener('submit', async e => {
    e.preventDefault();
    $('btnLogin').disabled = true;
    mensaje($('msgLogin'), 'Entrando…');
    const { error } = await sb.auth.signInWithPassword({
      email: $('email').value.trim(), password: $('clave').value
    });
    $('btnLogin').disabled = false;
    if (error) {
      mensaje($('msgLogin'), 'No pudimos entrar. Revisá el mail y la contraseña.', 'error');
    } else {
      $('clave').value = '';
      mensaje($('msgLogin'), '');
    }
  });

  $('btnSalir').addEventListener('click', () => sb.auth.signOut());

  /* ---------- Lista de notas ---------- */
  async function mostrarLista() {
    $('vistaEditor').hidden = true;
    $('vistaLista').hidden = false;
    mensaje($('msgLista'), '');
    const cont = $('listaNotas');
    cont.innerHTML = '<p class="vacio">Cargando…</p>';

    const { data, error } = await sb.from('notas')
      .select('id, titulo, slug, categoria, publicada, actualizada_en')
      .order('creada_en', { ascending: false });

    if (error) { cont.innerHTML = '<p class="vacio">No pudimos cargar las notas.</p>'; return; }
    if (!data.length) {
      cont.innerHTML = '<p class="vacio">Todavía no escribiste ninguna nota. Tocá «Nueva nota».</p>';
      return;
    }
    cont.innerHTML = data.map(n => `
      <div class="fila-nota">
        <div class="info">
          <strong>${esc(n.titulo)}<span class="estado ${n.publicada ? 'pub' : ''}">${n.publicada ? 'Publicada' : 'Borrador'}</span></strong>
          <small>${esc(CATEGORIAS[n.categoria] || n.categoria)} · editada ${esc(fechaLarga(n.actualizada_en))}</small>
        </div>
        <div class="acciones">
          <button type="button" data-accion="editar" data-id="${esc(n.id)}">Editar</button>
          <a class="boton" href="nota.html?slug=${encodeURIComponent(n.slug)}" target="_blank" rel="noopener">Ver</a>
          <button type="button" class="peligro" data-accion="borrar" data-id="${esc(n.id)}" data-titulo="${esc(n.titulo)}">Borrar</button>
        </div>
      </div>`).join('');
  }

  $('listaNotas').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    if (btn.dataset.accion === 'editar') return abrirEditor(btn.dataset.id);
    if (btn.dataset.accion === 'borrar') {
      if (!confirm('¿Borrar «' + btn.dataset.titulo + '»? No se puede deshacer.')) return;
      const { data, error } = await sb.from('notas').delete().eq('id', btn.dataset.id).select();
      if (error || !data.length) mensaje($('msgLista'), textoError(error) || 'No se pudo borrar la nota.', 'error');
      else mensaje($('msgLista'), 'Nota borrada.', 'ok');
      mostrarLista();
    }
  });

  $('btnNueva').addEventListener('click', () => abrirEditor(null));
  $('btnVolver').addEventListener('click', mostrarLista);

  /* ---------- Editor ---------- */
  function crearEditor() {
    if (quill) return;
    quill = new Quill('#editor', {
      theme: 'snow',
      placeholder: 'Escribí la nota acá…',
      modules: {
        toolbar: {
          container: [
            [{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], ['blockquote'],
            [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']
          ],
          handlers: { image: elegirImagenParaTexto }   // el botón de imagen sube a Supabase
        }
      }
    });
  }

  function elegirImagenParaTexto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = async () => {
      const archivo = input.files[0];
      if (!archivo) return;
      const rango = quill.getSelection(true);
      try {
        mensaje($('msgNota'), 'Subiendo imagen…');
        const url = await subirImagen(archivo);
        quill.insertEmbed(rango.index, 'image', url, 'user');
        quill.setSelection(rango.index + 1);
        mensaje($('msgNota'), '');
      } catch (err) {
        mensaje($('msgNota'), textoError(err), 'error');
      }
    };
    input.click();
  }

  function mostrarPortada() {
    const hay = !!portadaUrl;
    $('miniatura').hidden = !hay;
    $('btnQuitarPortada').hidden = !hay;
    if (hay) $('miniatura').src = portadaUrl;
  }

  $('portada').addEventListener('change', async () => {
    const archivo = $('portada').files[0];
    if (!archivo) return;
    try {
      mensaje($('msgNota'), 'Subiendo portada…');
      portadaUrl = await subirImagen(archivo);
      mostrarPortada();
      mensaje($('msgNota'), 'Portada cargada. Recordá guardar la nota.', 'ok');
    } catch (err) {
      mensaje($('msgNota'), textoError(err), 'error');
    }
    $('portada').value = '';
  });

  $('btnQuitarPortada').addEventListener('click', () => { portadaUrl = ''; mostrarPortada(); });

  async function abrirEditor(id) {
    crearEditor();
    notaActual = null;
    portadaUrl = '';
    $('formNota').reset();
    quill.setContents([]);
    mensaje($('msgNota'), '');
    $('categoria').value = 'nota';
    try { $('autor').value = localStorage.getItem('otr_autor') || ''; } catch (e) { /* sin problema */ }
    $('tituloEditor').textContent = 'Nueva nota';

    if (id) {
      const { data, error } = await sb.from('notas').select('*').eq('id', id).single();
      if (error) { mensaje($('msgLista'), textoError(error), 'error'); return; }
      notaActual = data;
      $('tituloEditor').textContent = 'Editar nota';
      $('titulo').value = data.titulo || '';
      $('bajada').value = data.bajada || '';
      $('categoria').value = data.categoria;
      $('autor').value = data.autor || '';
      $('etiquetas').value = (data.etiquetas || []).join(', ');
      $('publicada').checked = !!data.publicada;
      portadaUrl = data.imagen_portada || '';
      quill.clipboard.dangerouslyPasteHTML(data.contenido || '');
    }
    mostrarPortada();
    $('vistaLista').hidden = true;
    $('vistaEditor').hidden = false;
    window.scrollTo(0, 0);
  }

  async function insertarConSlug(registro) {
    let slug = slugify(registro.titulo);
    for (let i = 0; i < 3; i++) {
      const res = await sb.from('notas').insert({ ...registro, slug }).select().single();
      if (!res.error || res.error.code !== '23505') return res;      // 23505 = esa dirección ya existe
      slug = slugify(registro.titulo) + '-' + Math.random().toString(36).slice(2, 6);
    }
    return { error: { message: 'No se pudo generar una dirección única para la nota.' } };
  }

  $('formNota').addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = $('titulo').value.trim();
    if (!titulo) { mensaje($('msgNota'), 'Escribí un título.', 'error'); return; }

    const publicada = $('publicada').checked;
    const sinTexto = !quill.getText().trim() && !quill.root.querySelector('img');
    const registro = {
      titulo,
      bajada: $('bajada').value.trim() || null,
      categoria: $('categoria').value,
      autor: $('autor').value.trim() || null,
      etiquetas: $('etiquetas').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      imagen_portada: portadaUrl || null,
      contenido: sinTexto ? '' : quill.root.innerHTML,
      publicada
    };
    // La fecha de publicación se fija la primera vez que se publica
    if (publicada && !(notaActual && notaActual.fecha_publicacion)) {
      registro.fecha_publicacion = new Date().toISOString();
    }

    $('btnGuardar').disabled = true;
    mensaje($('msgNota'), 'Guardando…');
    const res = notaActual
      ? await sb.from('notas').update(registro).eq('id', notaActual.id).select().single()
      : await insertarConSlug(registro);
    $('btnGuardar').disabled = false;

    if (res.error) { mensaje($('msgNota'), textoError(res.error), 'error'); return; }
    notaActual = res.data;
    $('tituloEditor').textContent = 'Editar nota';
    try { if (registro.autor) localStorage.setItem('otr_autor', registro.autor); } catch (err) { /* sin problema */ }
    mensaje($('msgNota'), publicada ? 'Guardado y publicado ✓' : 'Guardado como borrador ✓', 'ok');
  });

  /* ---------- Pestañas (Notas / Reseñas) ---------- */
  document.querySelectorAll('[data-tab]').forEach(boton => {
    boton.addEventListener('click', () => {
      const tab = boton.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('activa', b === boton));
      document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab; });
      document.dispatchEvent(new CustomEvent('otr:pestana', { detail: tab }));
    });
  });

  /* Herramientas que usan también los otros archivos del panel */
  window.OTR_ADMIN = { subirImagen, textoError, mensaje, esAdmin: () => esAdminFlag };

  /* ---------- Arranque ---------- */
  Object.entries(CATEGORIAS).forEach(([valor, nombre]) => {
    $('categoria').add(new Option(nombre, valor));
  });

  sb.auth.onAuthStateChange((_evento, session) => {
    setTimeout(() => mostrarSegunSesion(session), 0);   // recomendado por Supabase
  });
  sb.auth.getSession().then(({ data }) => mostrarSegunSesion(data.session));
})();
