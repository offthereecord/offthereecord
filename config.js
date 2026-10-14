/* Datos de conexión con Supabase.
   La clave "publishable" es PÚBLICA por diseño: puede estar en la web.
   La seguridad real la ponen las reglas (RLS) que creamos en la base.
   NUNCA pongas acá la clave "secret" ni la contraseña de la base. */
window.OTR_CONFIG = {
  SUPABASE_URL: 'https://djoxtsbrzkpbrlhcnqbn.supabase.co',
  SUPABASE_KEY: 'sb_publishable_Y7GyvAakHF4WpL-nBgOfTQ_KcCKHRep',

  /* ---------- Pie de página: redes y contacto ----------
     Pegá entre las comillas la dirección completa de cada red
     (por ejemplo 'https://www.instagram.com/tu_usuario').
     Si dejás unas comillas vacías '', esa red NO se muestra. */
  REDES: {
    instagram: '',
    tiktok: '',
    youtube: '',
    x: '',
    facebook: '',
    spotify: '',
    whatsapp: ''     // ejemplo: 'https://wa.me/5491112345678'
  },
  CONTACTO: {
    email: ''        // ejemplo: 'hola@tudominio.com'
  }
};
