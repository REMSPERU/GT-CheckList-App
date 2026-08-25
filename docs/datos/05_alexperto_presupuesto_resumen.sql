\set target_budget_id 'vqnkrywtop227pb8okrp3pnb'

SELECT
  'POM_HEADERS' AS block,
  COUNT(*) AS rows,
  SUM(budget_amount) AS budget_amount,
  SUM(executed_amount) AS executed_amount
FROM sch_admin_module.budget_pom_headers
WHERE budget_id = :'target_budget_id'
UNION ALL
SELECT
  'POM_PARTS',
  COUNT(*),
  SUM(p.budget_amount),
  SUM(p.executed_amount)
FROM sch_admin_module.budget_pom_parts p
JOIN sch_admin_module.budget_pom_headers h ON h.id = p.header_id
WHERE h.budget_id = :'target_budget_id'
UNION ALL
SELECT
  'PRECO_PARTS',
  COUNT(*),
  SUM(budget_amount),
  SUM(executed_amount)
FROM sch_admin_module.budget_preco_parts
WHERE budget_id = :'target_budget_id'
UNION ALL
SELECT
  'CAPEX_PARTS',
  COUNT(*),
  SUM(budget_amount),
  SUM(executed_amount)
FROM sch_admin_module.budget_capex_parts
WHERE budget_id = :'target_budget_id'
UNION ALL
SELECT
  'EXCLUSIVE_PARTS',
  COUNT(*),
  SUM(budget_amount),
  SUM(executed_amount)
FROM sch_admin_module.budget_exclusive_parts
WHERE budget_id = :'target_budget_id';

SELECT
  'POM_HEADER_CELLS' AS block,
  COUNT(*) AS rows,
  SUM(c.budget_amount) AS budget_amount,
  SUM(c.executed_amount) AS executed_amount
FROM sch_admin_module.part_month_cells c
JOIN sch_admin_module.budget_pom_headers h
  ON h.id = c.pom_budget_header_id
WHERE h.budget_id = :'target_budget_id'
UNION ALL
SELECT
  'POM_PART_CELLS',
  COUNT(*),
  SUM(c.budget_amount),
  SUM(c.executed_amount)
FROM sch_admin_module.part_month_cells c
JOIN sch_admin_module.budget_pom_parts p
  ON p.id = c.pom_budget_part_id
JOIN sch_admin_module.budget_pom_headers h ON h.id = p.header_id
WHERE h.budget_id = :'target_budget_id'
UNION ALL
SELECT
  'PRECO_CELLS',
  COUNT(*),
  SUM(c.budget_amount),
  SUM(c.executed_amount)
FROM sch_admin_module.part_month_cells c
JOIN sch_admin_module.budget_preco_parts p
  ON p.id = c.preco_budget_part_id
WHERE p.budget_id = :'target_budget_id'
UNION ALL
SELECT
  'CAPEX_CELLS',
  COUNT(*),
  SUM(c.budget_amount),
  SUM(c.executed_amount)
FROM sch_admin_module.part_month_cells c
JOIN sch_admin_module.budget_capex_parts p
  ON p.id = c.capex_budget_part_id
WHERE p.budget_id = :'target_budget_id'
UNION ALL
SELECT
  'EXCLUSIVE_CELLS',
  COUNT(*),
  SUM(c.budget_amount),
  SUM(c.executed_amount)
FROM sch_admin_module.part_month_cells c
JOIN sch_admin_module.budget_exclusive_parts p
  ON p.id = c.exclusive_budget_part_id
WHERE p.budget_id = :'target_budget_id';

SELECT
  c.month,
  SUM(c.budget_amount) FILTER (WHERE c.pom_budget_header_id IS NOT NULL
    OR c.pom_budget_part_id IS NOT NULL) AS pom_budget,
  SUM(c.executed_amount) FILTER (WHERE c.pom_budget_header_id IS NOT NULL
    OR c.pom_budget_part_id IS NOT NULL) AS pom_executed,
  SUM(c.budget_amount) FILTER (WHERE c.preco_budget_part_id IS NOT NULL) AS preco_budget,
  SUM(c.executed_amount) FILTER (WHERE c.preco_budget_part_id IS NOT NULL) AS preco_executed,
  SUM(c.budget_amount) FILTER (WHERE c.capex_budget_part_id IS NOT NULL) AS capex_budget,
  SUM(c.executed_amount) FILTER (WHERE c.capex_budget_part_id IS NOT NULL) AS capex_executed,
  SUM(c.budget_amount) FILTER (WHERE c.exclusive_budget_part_id IS NOT NULL) AS exclusive_budget,
  SUM(c.executed_amount) FILTER (WHERE c.exclusive_budget_part_id IS NOT NULL) AS exclusive_executed
FROM sch_admin_module.part_month_cells c
WHERE c.pom_budget_header_id IN (
    SELECT id FROM sch_admin_module.budget_pom_headers WHERE budget_id = :'target_budget_id'
  )
   OR c.pom_budget_part_id IN (
    SELECT p.id
    FROM sch_admin_module.budget_pom_parts p
    JOIN sch_admin_module.budget_pom_headers h ON h.id = p.header_id
    WHERE h.budget_id = :'target_budget_id'
  )
   OR c.preco_budget_part_id IN (
    SELECT id FROM sch_admin_module.budget_preco_parts WHERE budget_id = :'target_budget_id'
  )
   OR c.capex_budget_part_id IN (
    SELECT id FROM sch_admin_module.budget_capex_parts WHERE budget_id = :'target_budget_id'
  )
   OR c.exclusive_budget_part_id IN (
    SELECT id FROM sch_admin_module.budget_exclusive_parts WHERE budget_id = :'target_budget_id'
  )
GROUP BY c.month
ORDER BY c.month;
