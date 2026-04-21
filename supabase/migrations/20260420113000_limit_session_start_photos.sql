-- Enforce max 2 session start photos per maintenance session

CREATE INDEX IF NOT EXISTS idx_sesion_mantenimiento_fotos_id_sesion
  ON public.sesion_mantenimiento_fotos (id_sesion);

CREATE OR REPLACE FUNCTION public.enforce_max_two_session_start_photos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_count integer;
BEGIN
  IF COALESCE(NEW.tipo, 'inicio') <> 'inicio' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.sesion_mantenimiento_fotos
  WHERE id_sesion = NEW.id_sesion
    AND COALESCE(tipo, 'inicio') = 'inicio';

  IF v_existing_count >= 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'No se permiten mas de 2 fotos de inicio por sesion de mantenimiento.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_two_session_start_photos
  ON public.sesion_mantenimiento_fotos;

CREATE TRIGGER trg_enforce_max_two_session_start_photos
BEFORE INSERT ON public.sesion_mantenimiento_fotos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_two_session_start_photos();
