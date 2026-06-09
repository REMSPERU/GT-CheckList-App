# Guía de Visualización y Estructura de Pantallas (Para Recrear UI con IA)

Este documento describe cómo se deben **recrear visualmente las pantallas** del inventario de equipos y cómo se relaciona el modelo de datos migrado de Supabase con la información técnica del origen (MySQL) para renderizar la interfaz de usuario de forma correcta.

---

## 1. Estructura de Datos de la Base de Datos Migrada (Supabase)

La base de datos destino en Supabase contiene una tabla centralizadora llamada `equipos`. Para pintar cualquier pantalla, la IA debe leer de esta tabla y resolver sus relaciones:

1.  **Cabecera del Equipo (Datos Generales)**:
    *   **Código de Inventario (`codigo`)**: Se muestra como etiqueta principal destacada (ej. `AZC-CHILLA-001`).
    *   **Propiedad (`id_property` $\rightarrow$ `properties.name`)**: Nombre del inmueble al que pertenece el equipo.
    *   **Tipo de Equipo (`id_equipamento` $\rightarrow$ `equipamentos.nombre`)**: Nombre descriptivo de la categoría (ej. "Chiller Aire").
    *   **Ubicación (`ubicacion`)**: Valor interno de ubicación (ej. `AZOTEA`, `1`, `-S2`).
        *   *Regla de traducción para la UI*:
            *   Si es `AZOTEA` o `SEMISOTANO`, mostrar el texto tal cual.
            *   Si es un número positivo (ej. `3`), mostrar: `Piso 3`.
            *   Si empieza con `-S` (ej. `-S2`), mostrar: `Sótano 2`.
    *   **Estatus (`estatus`)**: Estado operativo del equipo. En la UI se debe renderizar como un Badge de color (verde para `ACTIVO`, rojo para `INACTIVO`).
    *   **Detalle de Ubicación (`detalle_ubicacion`)**: Texto libre aclaratorio (opcional).

2.  **Detalles Técnicos (`equipment_detail` JSONB)**:
    *   Contiene el puntero para realizar el `JOIN` o la consulta de datos específicos del equipo:
        *   `source_table`: Nombre de la tabla de especificaciones técnicas en el backend (ej. `chiller`, `Bombas`, `ablandador`, `split`, etc.).
        *   `source_id`: Clave primaria del registro de especificaciones técnicas (ej. `idChiller`, `id_bomba`, etc.).
        *   `numero_unidad`: Número secuencial interno del equipo en la propiedad (ej. "Equipo 1").

---

## 2. Patrones de Diseño Visual (Layouts de Pantalla)

Para recrear las pantallas, la IA debe agrupar los 12 equipos en **3 patrones de interfaz visual**:

### Patrón A: Grilla Tabular de Especificaciones (Tabular Grid)
*Aplica a: Chillers, Splits, Fan Coils y UMAs.*

*   **Representación Visual**: Una sección principal con los datos del Inmueble y una grilla o tabla limpia. Cada fila representa una unidad del equipo seleccionado.
*   **Elementos en Pantalla**:
    *   Título de sección con icono de copo de nieve o ventilador.
    *   Tabla con columnas específicas para cada variable técnica.
    *   Botón de "Eliminar" en la última columna de cada fila.

```
+------------------------------------------------------------------------------------+
|  [Icon] DETALLE DE CHILLER DE AGUA HELADA                                          |
|  Inmueble: Torre A / Cantidad de Equipos: 2                                        |
+------------------------------------------------------------------------------------+
| Unidad   | Ubicación | Marca     | Modelo  | Capacidad | Refrigerante | Voltaje | Acc. |
|----------|-----------|-----------|---------|-----------|--------------|---------|------|
| Equipo 1 | Azotea    | Daikin    | DK-120  | 150 TR    | R134A        | 380 V   | [Del]|
| Equipo 2 | Sótano 1  | Carrier   | CR-90   | 100 TR    | R410A        | 440 V   | [Del]|
+------------------------------------------------------------------------------------+
```

### Patrón B: Tarjeta Detallada con Elementos Anidados (Master-Detail Cards)
*Aplica a: Torres de Enfriamiento y Ablandadores de Agua.*

*   **Representación Visual**: Un contenedor por cada equipo principal renderizado como una "Tarjeta (Card)". Dentro de la tarjeta se muestran sus especificaciones base en formato clave-valor y, abajo, una sub-tabla o lista que contiene los elementos hijos que dependen de él.
*   **Elementos en Pantalla**:
    *   Tarjeta principal con borde de color diferenciado.
    *   Sección 1: Datos técnicos principales del equipo (Ubicación, Marca, Modelo, Año).
    *   Sección 2: Detalle de VDF (si aplica) o Sub-equipos (como bombas de reposición).

```
+-----------------------------------------------------------------------------+
|  ABLANDADOR DE AGUA 1                                                       |
|  -------------------------------------------------------------------------  |
|  Ubicación: Sótano 2  |  Marca: Pentair  |  Modelo: WS-200  |  Año: 2018    |
|  Capacidad: 50 m3     |  Tanque Salmuera: 200 L                             |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  | [Icon] Sistema de Reposición de Agua (Bombas Asociadas)               |  |
|  |-----------------------------------------------------------------------|  |
|  | Bomba | Ubicación | Marca   | Modelo   | Motor (HP) | Salmuera        |  |
|  |-------|-----------|---------|----------|------------|-----------------|  |
|  | #1    | Sótano 2  | Pedrollo| PKm60    | 0.5 HP     | 50 L            |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
```

### Patrón C: Listado Agrupado por Categorías (Grouped Columns)
*Aplica a: Bombas de Agua (Primarias, Secundarias, Condensadas y de Data Center).*

*   **Representación Visual**: División de la pantalla en secciones o pestañas (Tabs) según el tipo de bomba (`id_tipo_bomba`), mostrando una grilla específica con las bombas registradas en esa subcategoría.
*   **Elementos en Pantalla**:
    *   Pestañas para alternar entre: `Primarias`, `Secundarias`, `Condensado` y `Data Center`.
    *   Tabla con columnas de características mecánicas y un bloque dedicado al variador de frecuencia (VDF).

---

## 3. Especificación Visual y de Datos por Equipo (Los 12 Orígenes)

Esta guía le dice a la IA qué campos específicos pintar en la UI y qué nombres de columna lee de la base de datos para los 12 equipos migrados.

### 2.1 y 2.2 Chillers (Aire / Agua)
*   **Visualización**: Patrón A (Grilla Tabular).
*   **Especificaciones Técnicas (Campos de tabla `chiller`)**:
    *   **Unidad**: `numero_unidad` (ej. "Equipo 1").
    *   **Ubicación**: `ubicacion` (Traducir a "Piso X" / "Sótano Y").
    *   **Marca**: `marca` (Resuelto por ID contra tabla `marca`, ej. "Trane"). Si el ID es `169`, mostrar el texto contenido en `marca_otro` (ej. "MideaCustom").
    *   **Modelo**: `Modelo` (String).
    *   **Capacidad**: `Capacidad_enfriamiento` + `" TR"` (ej. "150 TR").
    *   **Refrigerante**: `tipo_refrigerante` (ej. "R134A").
    *   **Voltaje**: `Voltaje` + `" V"` (ej. "380 V").
    *   **Año Operación**: `Ano_operacion` (ej. "2015").
    *   **Compresor**: Nombre del compresor (resuelto contra tabla `tipo_compresor`, ej. "Tornillo").
    *   **Cant. Compresores**: `Cantidad_compresor` (ej. "2").
    *   **Tipo**: `tipo_chiller` (Debe ser "Aire" o "Agua").

---

### 2.3 y 2.4 Torres de Enfriamiento (Data Center / Chiller)
*   **Visualización**: Patrón B (Tarjeta Detallada).
*   **Especificaciones Técnicas (Campos de tabla `torre_enfriamiento`)**:
    *   **Cabecera de Tarjeta**: `"Torre de Enfriamiento " + numero_unidad` + `" (" + tipo_torre + ")"`.
    *   **Ubicación**: `Ubicacion`.
    *   **Marca**: `Marca` (o `marca_otro` si es ID 169).
    *   **Modelo**: `Modelo`.
    *   **Año de Inicio**: `Ano_operacion`.
    *   **Motor**: `cap_motor` + `" "` + `unidad_motor` (ej. "15 HP").
    *   **Sección de Variador (VDF)**:
        *   Si `tiene_vdf = 0`: Mostrar etiqueta `"Sin Variador de Frecuencia (VDF)"`.
        *   Si `tiene_vdf = 1`: Mostrar una sub-tarjeta interna con:
            *   **Marca VDF**: `marca_vdf` (o `marca_otro_vdf` si es ID 169).
            *   **Modelo VDF**: `modelo_vdf`.
            *   **Voltaje VDF**: `Voltaje_vdf` + `" V"`.
            *   **Capacidad VDF**: `cap_vdf` + `" "` + `unidad_vdf` (ej. "11 kW").

---

### 2.5 Ablandadores de Agua
*   **Visualización**: Patrón B (Tarjeta Detallada).
*   **Especificaciones Técnicas (Campos de tabla `ablandador`)**:
    *   **Cabecera**: `"Ablandador " + numero_unidad`.
    *   **Detalles Base**: Ubicación (`ubicacion`), Marca (`marca`/`marca_otro`), Modelo (`modelo`), Capacidad (`capacidad`), Tanque Salmuera (`cap_tanque_salmuera`), Año (`ano_operacion`).
    *   **Sección Reposición (Bombas Hijas)**:
        *   Si no tiene bombas, mostrar `"Sin bombas de reposición"`.
        *   Si tiene bombas (tabla `sistema_resposicion_agua`), renderizar una grilla interna con las columnas:
            *   **Bomba**: `numero_unidad` (secuencial).
            *   **Ubicación**: `ubicacion`.
            *   **Marca**: `marca` (o `marca_otro`).
            *   **Modelo**: `modelo`.
            *   **Motor**: `capacidad_motor` + `" HP"`.
            *   **Tanque**: `cap_tanque_salmuera` + `" L"`.

---

### 2.6, 2.7, 2.8 y 2.9 Bombas de Agua (Primaria / Secundaria / Condensada / Data Center)
*   **Visualización**: Patrón C (Listado Agrupado).
*   **Especificaciones Técnicas (Campos de tabla `Bombas`)**:
    *   **Unidad**: `cantidad` (se mapea a `numero_unidad` en la UI).
    *   **Ubicación**: `ubicacion`.
    *   **Marca**: `marca` (o `marca_otro` si es ID 169).
    *   **Modelo**: `modelo`.
    *   **Año Operación**: `anio_operacion`.
    *   **Detalle VDF**:
        *   Si `tiene_vdf = 0`, mostrar `"—"` en las columnas del VDF.
        *   Si `tiene_vdf = 1`, mostrar en la misma fila:
            *   **VDF**: `"Sí"`.
            *   **Marca VDF**: `marca_vdf` (o `marca_otro_vdf`).
            *   **Modelo VDF**: `modelo_vdf`.
            *   **Capacidad VDF**: `cap_vdf` + `" "` + `unidad_vdf`.

---

### 2.10, 2.11 y 2.12 Climatizadores Independientes (Splits / Fan Coils / UMAs)
*   **Visualización**: Patrón A (Grilla Tabular).
*   **Especificaciones Técnicas (Tablas `split`, `fancoil` y `uma`)**:
    *   **Unidad**: `numero_unidad`.
    *   **Ubicación**: `ubicacion` (Piso/Sótano).
    *   **Marca**: `marca` (o `marca_otro` si es ID 169).
    *   **Modelo**: `modelo`.
    *   **Capacidad**: `capacidad_enfriamiento` + `" BTU"` (o TR según configuración del registro).
    *   **Refrigerante**: `refrigerante` o `tipo_refrigerante`.
    *   **Voltaje**: `voltaje` + `" V"`.
    *   **Año Operación**: `ano_operacion`.
