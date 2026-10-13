/* Datos de conexión con Supabase.
   La clave "publishable" es PÚBLICA por diseño: puede estar en la web.
   La seguridad real la ponen las reglas (RLS) que creamos en la base.
   NUNCA pongas acá la clave "secret" ni la contraseña de la base. */
window.OTR_CONFIG = {
  SUPABASE_URL: 'https://djoxtsbrzkpbrlhcnqbn.supabase.co',
  SUPABASE_KEY: 'sb_publishable_Y7GyvAakHF4WpL-nBgOfTQ_KcCKHRep'
};
