# Requerimiento de exportacion de presupuesto 2026

## Estado

Este documento consolida la conversacion y deja definido el trabajo pendiente.
Los ocho archivos Excel generados durante la prueba fueron eliminados. No se
deben conservar archivos `.xlsx` de prueba en el repositorio.

## Fuente de datos

La extraccion debe hacerse exclusivamente mediante SQL en PostgreSQL de
Alexperto usando las variables privadas de `web/.env`. No se deben consultar
fuentes web ni exponer credenciales.

El esquema correcto es `sch_admin_module`:

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

## Inmueble de referencia

La estructura y los calculos fueron comprobados con:

```text
Inmueble: CENTRO EJECUTIVO CHACARILLA
property_id: ijs8w1sv9hdtffxv599v8ivv
budget_id: vqnkrywtop227pb8okrp3pnb
budgeted_year: 2026
```

Totales confirmados:

| Bloque | Presupuesto | Ejecutado |
| --- | ---: | ---: |
| POM / mantenimiento | 402832.33 | 138065.94 |
| PRECIO / correctivo | 87081.49 | 1416.00 |
| CAPEX | 0.00 | 2915.31 |
| Areas exclusivas | 30508.36 | 2800.00 |

## Formato solicitado actualmente

La solicitud inicial fue generar ocho archivos en dos carpetas, con hojas por
inmueble. Posteriormente se cambió el formato: el resultado final debe ser **un
solo archivo Excel con ocho hojas**.

El archivo final tendrá estas ocho hojas:

1. `Presupuesto POM`
2. `Presupuesto PRECIO`
3. `Presupuesto CAPEX`
4. `Presupuesto Areas Exclusivas`
5. `Control POM`
6. `Control PRECIO`
7. `Control CAPEX`
8. `Control Areas Exclusivas`

Cada hoja debe contener todos los inmuebles del año 2026 en filas, con filtros
por inmueble y partida. No se crearán hojas separadas por inmueble en este
formato final.

## Contenido de las hojas de presupuesto

Cada hoja de presupuesto debe incluir:

- Inmueble y código.
- Año y estado del presupuesto.
- Área construida y área rentable.
- Encabezado POM cuando corresponda.
- Nombre de la partida.
- Estado/activo de la partida.
- Presupuesto anual.
- Presupuesto de enero a diciembre.
- Comentarios mensuales.
- Marcas mensuales e indicador de resaltado.

## Contenido de las hojas de control

Cada hoja de control debe incluir:

- Inmueble y partida.
- Presupuesto anual.
- Ejecutado anual.
- Saldo anual.
- Porcentaje de ejecución anual.
- Presupuesto mensual.
- Ejecutado mensual.
- Saldo mensual.
- Porcentaje de ejecución mensual.
- Comentarios, marcas y resaltados mensuales.

Las fórmulas son:

```text
saldo = presupuesto - ejecutado
porcentaje_ejecucion = ejecutado / presupuesto * 100
```

Cuando el presupuesto sea `0.00`, el porcentaje debe mostrarse como `N/A` o
vacío para evitar una división inválida.

## Filtro de importes cero

Solo se deben excluir filas donde tanto el presupuesto como el ejecutado sean
`0.00`. Se deben conservar filas con presupuesto `0.00` pero ejecutado distinto
de cero, porque representan casos reales de control, como el CAPEX ejecutado de
Chacarilla.

El alcance es únicamente el año 2026.

## Regla de consolidado y meses

Los totales anuales deben tomarse de `property_budget` y de los campos
`budget_amount`/`executed_amount` de las partidas. `part_month_cells` se usa
para el detalle mensual y sus comentarios.

No se debe sumar automáticamente todo `part_month_cells.executed_amount` para
reemplazar el ejecutado anual, porque en Chacarilla esa suma no coincide con el
consolidado anual almacenado por Alexperto.

## Archivos de consulta existentes

- `docs/datos/04_alexperto_presupuesto_diagnostico.sql`
- `docs/datos/05_alexperto_presupuesto_resumen.sql`
- `docs/ANALISIS_PRESUPUESTO_ALEXPERTO_SQL.md`

No se conserva un script de exportacion ejecutable porque el script de prueba
anterior generaba ocho archivos y quedo obsoleto al cambiarse el requerimiento.
El nuevo script debe crearse cuando se implemente el archivo unico de ocho
hojas.

## Pendiente

Crear un archivo único, por ejemplo:

```text
exportaciones/2026/presupuesto_control_2026.xlsx
```

con las ocho hojas indicadas y sin dejar archivos Excel intermedios o antiguos.
