# Analisis SQL del presupuesto Alexperto

Fecha de verificacion: 2026-08-25

## Inmueble consultado

| Campo | Valor |
| --- | --- |
| Inmueble | CENTRO EJECUTIVO CHACARILLA |
| `property_id` | `ijs8w1sv9hdtffxv599v8ivv` |
| Presupuesto | `vqnkrywtop227pb8okrp3pnb` |
| Año | 2026 |
| Área construida | 5689.00 |
| Área rentable | 4204.94 |
| Estado SQL | `IN_SETTING` |

La consulta se ejecutó directamente contra PostgreSQL usando `web/.env` y un
contenedor `postgres:16-alpine`. No se consultaron fuentes web.

## Tablas reales

El endpoint de presupuesto usa `sch_admin_module`, no las tablas anuales de
`sch_main`:

```text
property_budget
  -> budget_pom_headers
      -> budget_pom_parts
  -> budget_preco_parts
  -> budget_capex_parts
  -> budget_exclusive_parts
  -> part_month_cells
      -> part_month_cell_comments
```

Correspondencia funcional:

| Bloque del JSON | Tabla |
| --- | --- |
| Mantenimiento / POM | `budget_pom_headers`, `budget_pom_parts` |
| Correctivo / PRECIO | `budget_preco_parts` |
| CAPEX | `budget_capex_parts` |
| Exclusivas | `budget_exclusive_parts` |
| Meses | `part_month_cells` |
| Comentarios | `part_month_cell_comments` |

## Totales confirmados

Estos importes salen directamente de `sch_admin_module.property_budget` y
coinciden con los valores que compartiste:

| Bloque | Presupuesto | Ejecutado |
| --- | ---: | ---: |
| Mantenimiento / POM | 402832.33 | 138065.94 |
| Correctivo / PRECIO | 87081.49 | 1416.00 |
| CAPEX | 0.00 | 2915.31 |
| Exclusivas | 30508.36 | 2800.00 |

Las columnas fuente son:

```text
maintenance_budget_amount / maintenance_executed_amount
corrective_budget_amount / corrective_executed_amount
capex_budget_amount / capex_executed_amount
exclusive_budget_amount / exclusive_executed_amount
```

## Cómo se calculan

### Presupuesto

Los presupuestos se guardan en el registro principal y se desglosan en partidas:

```text
property_budget.maintenance_budget_amount
  = SUM(budget_pom_headers.budget_amount)
  = SUM(budget_pom_parts.budget_amount)

property_budget.corrective_budget_amount
  = SUM(budget_preco_parts.budget_amount)

property_budget.capex_budget_amount
  = SUM(budget_capex_parts.budget_amount)

property_budget.exclusive_budget_amount
  = SUM(budget_exclusive_parts.budget_amount)
```

Para Chacarilla, las sumas confirmadas son:

| Tabla | Partidas | Presupuesto | Ejecutado |
| --- | ---: | ---: | ---: |
| `budget_pom_headers` | 5 | 402832.33 | 138065.94 |
| `budget_pom_parts` | 107 | 402832.33 | 138065.94 |
| `budget_preco_parts` | 61 | 87081.49 | 1416.00 |
| `budget_capex_parts` | 63 | 0.00 | 2915.31 |
| `budget_exclusive_parts` | 15 | 30508.36 | 0.00 |

### Detalle mensual

`part_month_cells` contiene:

```text
month
budget_amount
executed_amount
is_marked
is_amount_highlighted
```

La respuesta transforma esos nombres a `monthCells`:

```text
budget_amount          -> budgetAmount
executed_amount        -> executedAmount
is_marked              -> isMarked
is_amount_highlighted  -> isAmountHighlighted
```

Las celdas se relacionan con un bloque mediante una de estas columnas:

```text
pom_budget_header_id
pom_budget_part_id
preco_budget_part_id
capex_budget_part_id
exclusive_budget_part_id
```

### Ejecutado

El control anual usa los campos consolidados de `property_budget` y de las
partidas (`executed_amount`). No se debe obtener automáticamente el ejecutado
anual sumando todas las celdas mensuales.

En Chacarilla se comprobó esta diferencia:

| Fuente | POM ejecutado |
| --- | ---: |
| `property_budget` | 138065.94 |
| `budget_pom_headers` / `budget_pom_parts` | 138065.94 |
| Suma de `part_month_cells` por partes | 390948.54 |

También hay diferencias en exclusivas: `property_budget` tiene `2800.00`, las
partidas tienen `0.00` y las celdas tienen distribución mensual. Por tanto, las
celdas son el detalle visual mensual, mientras que el registro principal y las
partidas contienen el consolidado que se muestra en los totales anuales.

## Control presupuestal

Con los valores consolidados, los cálculos son:

```text
saldo = presupuesto - ejecutado
porcentaje_ejecucion = ejecutado / presupuesto * 100
```

Ejemplo POM:

```text
saldo = 402832.33 - 138065.94
      = 264766.39

porcentaje = 138065.94 / 402832.33 * 100
           = 34.27%
```

Para CAPEX, el porcentaje no debe calcularse cuando el presupuesto es `0.00`;
debe mostrarse como no aplicable o como sobreejecución, según la regla visual
del módulo.

## Banderas de activación

En el registro 2026 se encontraron:

| Campo | Valor |
| --- | --- |
| `is_maintenance_budget_active` | `false` |
| `is_corrective_budget_active` | `true` |
| `is_capexbudget_active` | `false` |
| `is_exclusive_areas_budget_active` | `false` |

Estas banderas indican el estado habilitado del bloque. No reemplazan ni
modifican los importes almacenados.

## Archivos SQL

Las consultas legibles utilizadas quedan en:

- `docs/datos/04_alexperto_presupuesto_diagnostico.sql`
- `docs/datos/05_alexperto_presupuesto_resumen.sql`

El primer archivo devuelve el detalle de presupuesto, encabezados, partidas y
celdas. El segundo devuelve las sumas comparativas para detectar diferencias
entre consolidado anual y detalle mensual.
