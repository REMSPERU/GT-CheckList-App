alter table public.audit_questions
  add column if not exists equipment_name text;

create index if not exists idx_audit_questions_section_equipment_order
  on public.audit_questions (section_id, equipment_name, order_index);

update public.audit_question_sections
set
  is_active = false,
  order_index = order_index + 100
where section_name not in (
  'SUB ESTACIÓN',
  'TABLEROS ELÉCTRICOS',
  'TABLERO DE TRANSFERENCIA',
  'GRUPO ELECTRÓGENO',
  'AIRE ACONDICIONADO',
  'SISTEMA CONTRA INCENDIOS',
  'VENTILACIÓN MECÁNICA',
  'SEGURIDAD ELECTRÓNICA',
  'ASCENSORES'
);

insert into public.audit_question_sections (section_name, order_index, is_active)
values
  ('SUB ESTACIÓN', 1, true),
  ('TABLEROS ELÉCTRICOS', 2, true),
  ('TABLERO DE TRANSFERENCIA', 3, true),
  ('GRUPO ELECTRÓGENO', 4, true),
  ('AIRE ACONDICIONADO', 5, true),
  ('SISTEMA CONTRA INCENDIOS', 6, true),
  ('VENTILACIÓN MECÁNICA', 7, true),
  ('SEGURIDAD ELECTRÓNICA', 8, true),
  ('ASCENSORES', 9, true)
on conflict (section_name)
do update set
  order_index = excluded.order_index,
  is_active = true,
  updated_at = timezone('utc', now());

update public.audit_questions
set order_index = order_index + 1000
where question_code not like 'AUD-ACT-%';

update public.audit_questions
set is_active = false;

with activity_catalog as (
  select *
  from (
    values
      ('AUD-ACT-001', 1, 'SUB ESTACIÓN', 'Sub Estación', 'Inspeccionar el estado de la sala (luces, limpieza, ventilación, elementos de seguridad).'),
      ('AUD-ACT-002', 2, 'SUB ESTACIÓN', 'Sub Estación', 'Inspeccionar el estado físico de los tableros y registros de las celdas.'),
      ('AUD-ACT-003', 3, 'SUB ESTACIÓN', 'Sub Estación', 'Inspección visual de la operatividad de los transformadores mixtos, niveles de aceite y presión de gas (si aplica).'),
      ('AUD-ACT-004', 4, 'TABLEROS ELÉCTRICOS', 'Tableros Eléctricos', 'Inspeccionar el estado físico de los tableros.'),
      ('AUD-ACT-005', 5, 'TABLEROS ELÉCTRICOS', 'Tableros Eléctricos', 'Inspección visual de la operatividad de los ventiladores de los tableros eléctricos.'),
      ('AUD-ACT-006', 6, 'TABLEROS ELÉCTRICOS', 'Tableros Eléctricos', 'Inspeccionar el estado de limpieza y presencia de humedad en tableros eléctricos.'),
      ('AUD-ACT-007', 7, 'TABLEROS ELÉCTRICOS', 'Tableros Eléctricos', 'Inspección visual de fugas de aceite en pozos de puesta a tierra.'),
      ('AUD-ACT-008', 8, 'TABLERO DE TRANSFERENCIA', 'Tablero de Transferencia', 'Inspeccionar el estado físico de los tableros.'),
      ('AUD-ACT-009', 9, 'TABLERO DE TRANSFERENCIA', 'Tablero de Transferencia', 'Inspección visual de los componentes de los tableros (disyuntores, contactores, relés de transferencia, luces indicadoras, etc.).'),
      ('AUD-ACT-010', 10, 'TABLERO DE TRANSFERENCIA', 'Tablero de Transferencia', 'Inspeccionar el funcionamiento de los medidores de energía.'),
      ('AUD-ACT-011', 11, 'GRUPO ELECTRÓGENO', 'Grupo Electrógeno', 'Inspeccionar el estado de la sala (luces, limpieza, ventilación, elementos de seguridad).'),
      ('AUD-ACT-012', 12, 'GRUPO ELECTRÓGENO', 'Grupo Electrógeno', 'Inspeccionar el nivel de refrigerante, aceite de motor y estado de baterías.'),
      ('AUD-ACT-013', 13, 'GRUPO ELECTRÓGENO', 'Grupo Electrógeno', 'Verificar que no existan fugas de líquidos (aceite, refrigerante, combustible).'),
      ('AUD-ACT-014', 14, 'GRUPO ELECTRÓGENO', 'Grupo Electrógeno', 'Inspeccionar el nivel de combustible en el tanque base y tanque diario.'),
      ('AUD-ACT-015', 15, 'GRUPO ELECTRÓGENO', 'Grupo Electrógeno', 'Inspeccionar el estado del sistema de escape y silenciador.'),
      ('AUD-ACT-016', 16, 'AIRE ACONDICIONADO', 'Planta de Agua Helada (CHILLER)', 'Inspeccionar condiciones de la sala (luces, limpieza, ventilación, seguridad).'),
      ('AUD-ACT-017', 17, 'AIRE ACONDICIONADO', 'Planta de Agua Helada (CHILLER)', 'Inspeccionar el estado físico de tableros eléctricos y componentes.'),
      ('AUD-ACT-018', 18, 'AIRE ACONDICIONADO', 'Planta de Agua Helada (CHILLER)', 'Inspeccionar niveles de presión de refrigerante, aceite, etc.'),
      ('AUD-ACT-019', 19, 'AIRE ACONDICIONADO', 'Planta de Agua Helada (CHILLER)', 'Inspeccionar estado y operatividad de bombas de agua (sellos, ruidos, vibraciones).'),
      ('AUD-ACT-020', 20, 'SISTEMA CONTRA INCENDIOS', 'Motobombas', 'Inspeccionar el estado de operatividad de las motobombas (diésel y eléctrica).'),
      ('AUD-ACT-021', 21, 'SISTEMA CONTRA INCENDIOS', 'Motobombas', 'Inspeccionar el nivel de aceite, combustible y refrigerante en bomba diésel.'),
      ('AUD-ACT-022', 22, 'SISTEMA CONTRA INCENDIOS', 'Motobombas', 'Verificar que las válvulas de seccionamiento estén en posición correcta.'),
      ('AUD-ACT-023', 23, 'SISTEMA CONTRA INCENDIOS', 'Motobombas', 'Inspeccionar el estado de las baterías de arranque.'),
      ('AUD-ACT-024', 24, 'VENTILACIÓN MECÁNICA', 'Presurización de Escaleras', 'Inspeccionar condiciones de la sala (limpieza, ventilación).'),
      ('AUD-ACT-025', 25, 'VENTILACIÓN MECÁNICA', 'Presurización de Escaleras', 'Inspeccionar el estado físico de tableros y ventiladores.'),
      ('AUD-ACT-026', 26, 'VENTILACIÓN MECÁNICA', 'Presurización de Escaleras', 'Verificar el funcionamiento de los sensores de presión diferencial.'),
      ('AUD-ACT-027', 27, 'SEGURIDAD ELECTRÓNICA', 'CCTV / Accesos', 'Inspeccionar el estado físico de las cámaras y grabadores (NVR/DVR).'),
      ('AUD-ACT-028', 28, 'SEGURIDAD ELECTRÓNICA', 'CCTV / Accesos', 'Verificar el funcionamiento de los sensores y lectoras de acceso.'),
      ('AUD-ACT-029', 29, 'SEGURIDAD ELECTRÓNICA', 'CCTV / Accesos', 'Inspeccionar el estado de las fuentes de poder y cableado visible.'),
      ('AUD-ACT-030', 30, 'ASCENSORES', 'Ascensores', 'Inspeccionar el estado de la cabina (iluminación, botonera, limpieza).'),
      ('AUD-ACT-031', 31, 'ASCENSORES', 'Ascensores', 'Inspeccionar el funcionamiento de puertas y sensores de seguridad.'),
      ('AUD-ACT-032', 32, 'ASCENSORES', 'Ascensores', 'Inspeccionar el estado de las guías y cables de tracción (desde cuarto de máquinas).')
  ) as t(question_code, order_index, system_name, equipment_name, activity_text)
)
insert into public.audit_questions (
  question_code,
  question_text,
  order_index,
  section_id,
  equipment_name,
  is_active
)
select
  catalog.question_code,
  catalog.activity_text,
  catalog.order_index,
  sections.id,
  catalog.equipment_name,
  true
from activity_catalog catalog
join public.audit_question_sections sections
  on sections.section_name = catalog.system_name
on conflict (question_code)
do update set
  question_text = excluded.question_text,
  order_index = excluded.order_index,
  section_id = excluded.section_id,
  equipment_name = excluded.equipment_name,
  is_active = true,
  updated_at = timezone('utc', now());
