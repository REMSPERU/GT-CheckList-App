create function public.get_gema_property_hvac_operability()
returns table (
  property_id uuid,
  percent numeric,
  assessed_assets integer,
  hvac_assets integer
)
language sql stable security invoker set search_path = ''
as $$
  with latest as (
    select e.id_property, response.summary
    from public.equipos e
    join public.properties p on p.id = e.id_property
    join public.equipamentos t on t.id = e.id_equipamento
    join public.sistemas s on s.id = t.id_sistema
    left join lateral (
      select r.respuestas_json::jsonb -> 'resumen' as summary
      from public.checklist_response r
      where r.equipo_id = e.id and r.equipamento_id = e.id_equipamento
      order by r.submitted_at desc nulls last, r.id desc
      limit 1
    ) response on true
    where e.estatus is distinct from 'INACTIVO'
      and upper(translate(btrim(s.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
        in ('CLIMATIZACION', 'CLIMATIZACION Y HVAC', 'HVAC')
  ), amounts as (
    select id_property, summary ->> 'estado_operatividad' as state,
      case when jsonb_typeof(summary -> 'puntaje_obtenido') = 'number'
        then (summary ->> 'puntaje_obtenido')::numeric end as earned,
      case when jsonb_typeof(summary -> 'ponderado_total') = 'number'
        then (summary ->> 'ponderado_total')::numeric end as possible
    from latest
  ), asset_scores as (
    select id_property, case
      when state = 'stand_by' then null
      when state = 'inoperativo' then 0
      when possible > 0 and earned between 0 and possible then 100 * earned / possible
    end as score
    from amounts
  )
  select id_property, round(avg(score), 1), count(score)::integer, count(*)::integer
  from asset_scores
  group by id_property;
$$;

revoke execute on function public.get_gema_property_hvac_operability() from public;
grant execute on function public.get_gema_property_hvac_operability() to authenticated;
