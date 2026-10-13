'use strict';

/* Conexión con Supabase: la variable "sb" la usan todos los demás archivos */
const sb = window.supabase.createClient(OTR_CONFIG.SUPABASE_URL, OTR_CONFIG.SUPABASE_KEY);

/* Convierte texto en "texto seguro" para mostrar en pantalla */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Solo deja pasar direcciones http/https */
function urlSegura(u) {
  try {
    const x = new URL(u, location.href);
    return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
  } catch (e) { return ''; }
}

function fechaLarga(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const CATEGORIAS = {
  nota: 'Nota', cronica: 'Crónica', entrevista: 'Entrevista',
  investigacion: 'Investigación', infografia: 'Infografía'
};
