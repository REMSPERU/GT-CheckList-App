\set target_property_id 'ijs8w1sv9hdtffxv599v8ivv'
\set target_budget_id 'vqnkrywtop227pb8okrp3pnb'

\echo 'PRESUPUESTO'
SELECT
  id,
  property_id,
  budgeted_year,
  status,
  is_maintenance_budget_active,
  is_corrective_budget_active,
  is_capexbudget_active,
  is_exclusive_areas_budget_active,
  maintenance_budget_amount,
  maintenance_executed_amount,
  corrective_budget_amount,
  corrective_executed_amount,
  capex_budget_amount,
  capex_executed_amount,
  exclusive_budget_amount,
  exclusive_executed_amount,
  constructed_area,
  rentable_area
FROM sch_admin_module.property_budget
WHERE id = :'target_budget_id'
  AND property_id = :'target_property_id';

\echo 'POM HEADERS'
SELECT
  id,
  name,
  "order",
  active,
  budget_amount,
  executed_amount
FROM sch_admin_module.budget_pom_headers
WHERE budget_id = :'target_budget_id'
ORDER BY "order";

\echo 'POM PARTS'
SELECT
  p.id,
  p.header_id,
  h.name AS header_name,
  p.name,
  p."order",
  p.active,
  p.budget_amount,
  p.executed_amount
FROM sch_admin_module.budget_pom_parts p
JOIN sch_admin_module.budget_pom_headers h ON h.id = p.header_id
WHERE h.budget_id = :'target_budget_id'
ORDER BY h."order", p."order";

\echo 'PRECIO PARTS'
SELECT id, name, "order", active, budget_amount, executed_amount
FROM sch_admin_module.budget_preco_parts
WHERE budget_id = :'target_budget_id'
ORDER BY "order";

\echo 'CAPEX PARTS'
SELECT id, name, "order", active, budget_amount, executed_amount
FROM sch_admin_module.budget_capex_parts
WHERE budget_id = :'target_budget_id'
ORDER BY "order";

\echo 'EXCLUSIVE PARTS'
SELECT id, name, "order", active, budget_amount, executed_amount
FROM sch_admin_module.budget_exclusive_parts
WHERE budget_id = :'target_budget_id'
ORDER BY "order";

\echo 'MONTHLY TOTALS BY POM HEADER'
SELECT
  h.id AS header_id,
  h.name,
  c.month,
  SUM(c.budget_amount) AS budget_amount,
  SUM(c.executed_amount) AS executed_amount,
  COUNT(*) AS cell_count
FROM sch_admin_module.budget_pom_headers h
JOIN sch_admin_module.part_month_cells c
  ON c.pom_budget_header_id = h.id
WHERE h.budget_id = :'target_budget_id'
GROUP BY h.id, h.name, c.month
ORDER BY h."order", c.month;

\echo 'MONTHLY TOTALS BY POM PART'
SELECT
  p.id AS part_id,
  p.name,
  c.month,
  SUM(c.budget_amount) AS budget_amount,
  SUM(c.executed_amount) AS executed_amount,
  COUNT(*) AS cell_count
FROM sch_admin_module.budget_pom_parts p
JOIN sch_admin_module.part_month_cells c
  ON c.pom_budget_part_id = p.id
JOIN sch_admin_module.budget_pom_headers h ON h.id = p.header_id
WHERE h.budget_id = :'target_budget_id'
GROUP BY p.id, p.name, c.month
ORDER BY p."order", c.month;

\echo 'MONTHLY TOTALS BY OTHER BLOCKS'
SELECT
  'PRECIO' AS block,
  c.month,
  SUM(c.budget_amount) AS budget_amount,
  SUM(c.executed_amount) AS executed_amount,
  COUNT(*) AS cell_count
FROM sch_admin_module.budget_preco_parts p
JOIN sch_admin_module.part_month_cells c
  ON c.preco_budget_part_id = p.id
WHERE p.budget_id = :'target_budget_id'
GROUP BY c.month
UNION ALL
SELECT
  'CAPEX',
  c.month,
  SUM(c.budget_amount),
  SUM(c.executed_amount),
  COUNT(*)
FROM sch_admin_module.budget_capex_parts p
JOIN sch_admin_module.part_month_cells c
  ON c.capex_budget_part_id = p.id
WHERE p.budget_id = :'target_budget_id'
GROUP BY c.month
UNION ALL
SELECT
  'EXCLUSIVE',
  c.month,
  SUM(c.budget_amount),
  SUM(c.executed_amount),
  COUNT(*)
FROM sch_admin_module.budget_exclusive_parts p
JOIN sch_admin_module.part_month_cells c
  ON c.exclusive_budget_part_id = p.id
WHERE p.budget_id = :'target_budget_id'
GROUP BY c.month
ORDER BY block, month;
