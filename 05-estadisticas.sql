-- ============================================================
-- OFF THE REECORD - Paso 5: estadísticas de tráfico (anónimas)
-- Se pega UNA sola vez en Supabase > SQL Editor > Run.
-- ============================================================

-- 1) Tabla donde la página anota las visitas.
--    No guarda IP, nombre, mail ni cookies: solo un código al azar por navegador.
create table if not exists public.analitica (
  id bigint generated always as identity primary key,
  creado_en timestamptz not null default now(),
  tipo text not null check (tipo in ('vista', 'salida', 'clic')),   -- entrada a una página / salida (tiempo) / clic
  visitante text not null check (char_length(visitante) between 8 and 64),   -- código al azar del navegador
  sesion text not null check (char_length(sesion) between 8 and 64),         -- código al azar de la visita
  pagina_id text check (char_length(pagina_id) <= 32),                       -- une la entrada con la salida
  ruta text not null check (char_length(ruta) between 1 and 200),            -- página, ej.: notas.html
  dispositivo text check (dispositivo in ('celular', 'tablet', 'escritorio')),
  origen text check (char_length(origen) <= 80),                             -- de dónde llegó (Instagram, Google...)
  destino text check (char_length(destino) <= 160),                          -- en qué se hizo clic
  segundos integer check (segundos between 0 and 14400),                     -- tiempo en pantalla
  scroll integer check (scroll between 0 and 100)                            -- hasta dónde bajó (en %)
);

create index if not exists analitica_fecha_idx on public.analitica (creado_en desc);
create index if not exists analitica_tipo_ruta_idx on public.analitica (tipo, ruta);

alter table public.analitica enable row level security;

-- Cualquier visitante puede ANOTAR una visita, pero nadie puede LEER la tabla,
-- salvo vos (administrador).
create policy "cualquiera registra" on public.analitica
  for insert to anon, authenticated with check (true);

create policy "admin lee" on public.analitica
  for select using (public.es_admin());

-- 2) Función que arma todos los números para el panel (solo administradores).
--    dias: 1 = hoy, 7, 30, 90 = últimos N días, 0 = todo el historial.
create or replace function public.estadisticas(dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tz constant text := 'America/Argentina/Buenos_Aires';
  hoy_ar date := (now() at time zone tz)::date;
  desde timestamptz;
  resultado jsonb;
begin
  if not public.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if dias is null or dias <= 0 then
    desde := '-infinity';
  else
    desde := ((hoy_ar - (dias - 1))::timestamp) at time zone tz;   -- desde las 00:00 de Argentina
  end if;

  with e as (
    select * from analitica where creado_en >= desde
  ),
  -- una fila por página vista (une la entrada con su salida)
  pv as (
    select pagina_id,
           min(ruta) as ruta,
           min(visitante) as visitante,
           min(sesion) as sesion,
           min(creado_en) filter (where tipo = 'vista') as cuando,
           coalesce(sum(segundos) filter (where tipo = 'salida'), 0) as seg,
           max(scroll) filter (where tipo = 'salida') as sc
    from e
    where tipo in ('vista', 'salida') and pagina_id is not null
    group by pagina_id
    having bool_or(tipo = 'vista')
  ),
  ses as (
    select sesion, count(*) as vistas from pv group by sesion
  ),
  paginas as (
    select ruta,
           case
             when ruta like 'nota.html?slug=%' then coalesce((select 'Nota: ' || n.titulo from notas n where n.slug = substring(ruta from 'slug=(.*)$') limit 1), ruta)
             when ruta like 'cobertura.html?id=%' then coalesce((select 'Cobertura: ' || c.titulo from coberturas c where c.id::text = substring(ruta from 'id=(.*)$') limit 1), ruta)
             when ruta like 'banda.html?slug=%' then coalesce((select 'Banda: ' || b.nombre from bandas b where b.slug = substring(ruta from 'slug=(.*)$') limit 1), ruta)
             when ruta = 'index.html' then 'Inicio'
             when ruta = 'notas.html' then 'Solapa: Notas'
             when ruta = 'coberturas.html' then 'Solapa: Coberturas'
             when ruta = 'emergentes.html' then 'Solapa: Emergentes'
             when ruta = 'efemerides.html' then 'Solapa: Efemérides'
             when ruta = 'quien-soy.html' then 'Solapa: ¿Quién soy?'
             when ruta = 'contacto.html' then 'Solapa: Contacto'
             else ruta
           end as nombre,
           count(*) as vistas,
           count(distinct visitante) as visitantes,
           round(avg(seg) filter (where seg > 0))::int as seg_prom,
           round(avg(sc))::int as scroll_prom
    from pv
    group by ruta
  ),
  dias_serie as (
    select d::date as dia
    from generate_series(
      case when dias is null or dias <= 0
           then coalesce((select min((creado_en at time zone tz)::date) from analitica), hoy_ar)
           else hoy_ar - (dias - 1) end,
      hoy_ar, interval '1 day') d
  ),
  por_dia as (
    select s.dia, count(pv.pagina_id) as vistas, count(distinct pv.visitante) as visitantes
    from dias_serie s
    left join pv on (pv.cuando at time zone tz)::date = s.dia
    group by s.dia
  )
  select jsonb_build_object(
    'resumen', jsonb_build_object(
      'visitantes', (select count(distinct visitante) from pv),
      'sesiones', (select count(*) from ses),
      'vistas', (select count(*) from pv),
      'clics', (select count(*) from e where tipo = 'clic'),
      'seg_prom', (select round(avg(seg) filter (where seg > 0))::int from pv),
      'paginas_por_sesion', (select round(avg(vistas), 1) from ses),
      'rebote_pct', (select round(100.0 * count(*) filter (where vistas = 1) / nullif(count(*), 0))::int from ses),
      'scroll_prom', (select round(avg(sc))::int from pv)
    ),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'vistas', vistas, 'visitantes', visitantes) order by dia) from por_dia), '[]'::jsonb),
    'paginas', coalesce((select jsonb_agg(to_jsonb(p) order by p.vistas desc, p.nombre) from (select nombre, ruta, vistas, visitantes, seg_prom, scroll_prom from paginas order by vistas desc limit 25) p), '[]'::jsonb),
    'origenes', coalesce((select jsonb_agg(to_jsonb(o) order by o.sesiones desc, o.origen) from (select origen, count(distinct sesion) as sesiones from e where tipo = 'vista' and origen is not null group by origen order by 2 desc limit 15) o), '[]'::jsonb),
    'dispositivos', coalesce((select jsonb_agg(to_jsonb(x) order by x.sesiones desc) from (select dispositivo, count(distinct sesion) as sesiones from e where tipo = 'vista' and dispositivo is not null group by dispositivo) x), '[]'::jsonb),
    'clics', coalesce((select jsonb_agg(to_jsonb(c) order by c.clics desc, c.destino) from (select destino, count(*) as clics, count(distinct visitante) as personas from e where tipo = 'clic' and destino is not null group by destino order by 2 desc limit 25) c), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.estadisticas(integer) from public, anon;
grant execute on function public.estadisticas(integer) to authenticated;
