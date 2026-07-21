# Manual Oficial de Mapeo de Activos Técnicos

Este documento es la **guía central y de referencia rápida** para entender, revisar y modificar el mapeo de especificaciones técnicas de todos los equipos (activos) en la aplicación móvil y la base de datos de Supabase.

---

## 1. Arquitectura y Flujo de Mapeo

Cuando la aplicación va a renderizar o editar las especificaciones técnicas de un equipo (`equipment_detail`), el flujo es el siguiente:

```
[ Base de Datos / SQLite ] ──> abreviatura / equipo.codigo
                                       │
                                       ▼
                        [ types/inventory/index.ts ]
                         getTechnicalFields(abreviatura)
                                       │
                                       ▼
                     [ EQUIPMENT_TECHNICAL_FIELD_ALIASES ]
                    (Convierte alias como BA -> BELEC)
                                       │
                                       ▼
                       [ Módulos Específicos por Dominio ]
                    ┌───────────────────┬─────────────────┐
                    │ sanitary.ts       │ hvac.ts         │
                    │ electrical.ts     │ fire-safety.ts  │
                    │ security-telecom.ts                 │
                    └───────────────────┴─────────────────┘
                                       │
                                       ▼
                  [ TechnicalDetailView / DynamicFieldRenderer ]
                  (Filtra nulos + Renderiza Esquema + Extras)
```

---

## 2. Catálogo de Equipos y Mapeo por Dominio

---

### A. Sanitarias y Bombas de Agua
**Archivo fuente**: [`types/inventory/sanitary.ts`](file:///c:/REMS/GT-CheckList-App/types/inventory/sanitary.ts)

| Abreviaturas / Aliases Supabase | Esquema Exportado | Nombre del Equipo | Campos Mapeados |
|---|---|---|---|
| `BA`, `BBA`, `BELEC` | `BELEC` | Bombas de Agua (electrobombas, sumideros) | `tipo`, `tipo_bomba`, `marca`, `modelo`, `capacidad_bomba`, `capacidad_bomba_gpm`, `capacidad_motor`, `anio_operacion`, `subcomponentes` |
| `BACHC` | `BACHC` | Bomba de agua para chiller condensado | `tipo`, `marca`, `modelo`, `ano_operacion`, `vdf: { tiene_vdf, marca, modelo, capacidad, unidad, voltaje }` |
| `BACHP` | `BACHP` | Bomba de agua para chiller primario | `tipo`, `marca`, `modelo`, `ano_operacion`, `vdf: { tiene_vdf, marca, modelo, capacidad, unidad, voltaje }` |
| `BACHS` | `BACHS` | Bomba de agua para chiller secundario | `tipo`, `marca`, `modelo`, `ano_operacion`, `vdf: { tiene_vdf, marca, modelo, capacidad, unidad, voltaje }` |
| `BDTQ`, `BDOP`, `BDOS` | `BDOS` | Bombas dosificadoras quím. | `marca`, `modelo`, `capacidad_motor`, `anio_operacion` |
| `BDESG`, `BDS` | `BDS` | Bombas de desagüe / sumidero | `tipo`, `numero_unidad`, `marca`, `modelo`, `capacidad_motor`, `capacidad_bomba`, `anio_operacion` |
| `AGU`, `ABL` | `ABL` | Ablandadores de agua | `marca`, `modelo`, `capacidad`, `cap_tanque_salmuera`, `ano_operacion` |
| `CISAP`, `CISPTAG`, `CPTAG`, `CISTPTAG` | `CISTPTAG` | Cisterna de Agua Potable | `numero_unidad`, `capacidad`, `comparte_cisterna`, `observacion`, `subcomponentes` |
| `CISBCI`, `CISTBCI` | `CISTBCI` | Cisterna de Agua Contra Incendio | `numero_unidad`, `capacidad`, `compartida`, `sistem_comparte`, `plato_antivortice` |
| `TANQUELE`, `TELEV` | `TELEV` | Tanques Elevados | `numero_unidad`, `capacidad`, `comparte_cisterna`, `detalle_compartir`, `subcomponentes` |
| `TFILT`, `TFIL` | `TFIL` | Tanques de Filtrado | `indice`, `marca`, `modelo`, `anio_operacion`, `filtro_racor`, `ano_operacion_filtro` |
| `THIDRO`, `THID` | `THID` | Tanques Hidroneumáticos | `marca`, `modelo`, `capacidad_l`, `anio_operacion` |
| `REGUL`, `VRPS`, `VREG` | `VREG` | Válvulas Reguladoras | `marca`, `modelo`, `anio_operacion` |

---

### B. Climatización y HVAC
**Archivo fuente**: [`types/inventory/hvac.ts`](file:///c:/REMS/GT-CheckList-App/types/inventory/hvac.ts)

| Abreviaturas / Aliases Supabase | Esquema Exportado | Nombre del Equipo | Campos Mapeados |
|---|---|---|---|
| `CHAG` | `CHAG` | Chiller agua | `tipo`, `marca`, `modelo`, `voltaje`, `ano_operacion`, `cantidad_total`, `tipo_compresor`, `tipo_refrigerante`, `cantidad_compresor`, `capacidad_enfriamiento` |
| `CHAI`, `CHILLER`, `CHILLER_AIRE` | `CHAI` | Chiller aire | `tipo`, `marca`, `modelo`, `voltaje`, `ano_operacion`, `cantidad_total`, `tipo_compresor`, `tipo_refrigerante`, `cantidad_compresor`, `capacidad_enfriamiento` |
| `AUTO`, `AUTOC` | Equipos Autocontenidos | `AUTOC` | `numero_unidad`, `marca`, `modelo`, `voltaje`, `ano_operacion`, `capacidad_enfriamiento`, `refrigerante`, `tipo_refrigerante` |
| `VENT`, `VF`, `VFOR`, `EXA`, `EXM`, `INA`, `JF`, `PRE` | `VFOR` | Ventilación Mecánica (Extractores, Inyectores, Jet Fans, Presurizadores) | `tipo`, `numero_unidad`, `marca_motor`, `modelo_motor`, `capacidad_motor`, `anio_operacion_motor`, `capacidad_flujo`, `subcomponentes` |
| `FACO`, `FCU`, `FANCOIL`, `FCOIL` | `FCU` | Fan coils | `tipo`, `marca`, `modelo`, `voltaje`, `ano_operacion`, `cantidad_total`, `capacidad_enfriamiento`, `refrigerante`, `tipo_refrigerante` |
| `SP`, `SPLIT` | `SPLIT` | Splits | `tipo`, `marca`, `modelo`, `voltaje`, `ano_operacion`, `anio_operacion`, `cantidad_total`, `capacidad_enfriamiento`, `refrigerante`, `tipo_refrigerante` |
| `TOECH`, `TOEDC`, `TOE`, `TE` | `TOE` | Torres de Enfriamiento (Chiller y Data Center) | `tipo`, `numero_unidad`, `marca`, `modelo`, `ano_operacion`, `cap_motor`, `unidad_motor`, `cantidad_total`, `vdf` |
| `UMA` | `UMA` | Unidad manejadora de aire | `tipo`, `marca`, `modelo`, `voltaje`, `ano_operacion`, `cantidad_total`, `capacidad_enfriamiento`, `refrigerante`, `tipo_refrigerante` |
| `VRF`, `VRV` | `VRF` | Sistemas VRV/VRF | `tipo`, `marca`, `modelo`, `numero_unidad`, `unidad`, `ubicacion`, `voltaje`, `capacidad`, `refrigerante`, `ano_operacion`, `anio_operacion`, `observaciones`, `subcomponentes` |

---

### C. Sistema Eléctrico
**Archivo fuente**: [`types/inventory/electrical.ts`](file:///c:/REMS/GT-CheckList-App/types/inventory/electrical.ts)

| Abreviaturas / Aliases Supabase | Esquema Exportado | Nombre del Equipo | Campos Mapeados |
|---|---|---|---|
| `TBELEC` | `TBELEC` | Tableros Eléctricos | `rotulo`, `tipo_tablero`, `detalle_tecnico`, `condiciones_especiales`, `itgs`, `componentes`, `fases`, `voltaje` |
| `GELEC`, `GE` | `GE` | Grupos electrógenos | `numero_unidad`, `marca`, `modelo`, `capacidad`, `voltaje`, `ano_operacion`, `subcomponentes` |
| `SUBEST`, `SUBE` | `SUBE` | Sub estación eléctrica | `marca`, `modelo`, `anio_operacion`, `potencia_contratada`, `subcomponentes` |
| `BBAR`, `BUSBAR` | `BUSBAR` | Busbar (ductos de barra) | `marca`, `modelo`, `capacidad`, `ano_operacion`, `subcomponentes` |
| `TTA` | `TTA` | Tableros de transferencia automática | `numero_unidad`, `tipo_transferencia`, `marca_modulo`, `modelo_modulo`, `ano_operacion`, `observaciones`, `subcomponentes` |
| `TRAIS` | `TRAIS` | Transformadores de aislamiento | `marca`, `modelo`, `capacidad`, `numero_unidad`, `subcomponentes` |
| `PAT` | `PAT` | Pozo a tierra | `grupo`, `numero`, `DENOMINACION` |
| `LUZ` | `LUZ` | Luces de emergencia | `marca`, `modelo`, `capacidad_bateria`, `ano_instalacion` |
| `TBDIST` | `TBDIST` | Tablero Distribución | `numero_tablero`, `rotulo`, `ubicacion` |
| `TBAUTO` | `TBAUTO` | Tablero Autosoportado | `numero_tablero`, `rotulo`, `ubicacion` |

---

### D. Protección Contra Incendios
**Archivo fuente**: [`types/inventory/fire-safety.ts`](file:///c:/REMS/GT-CheckList-App/types/inventory/fire-safety.ts)

| Abreviaturas / Aliases Supabase | Esquema Exportado | Nombre del Equipo | Campos Mapeados |
|---|---|---|---|
| `BINC` | `BINC` | Bombas de incendio principales | `tipo`, `motor_marca`, `motor_modelo`, `motor_potencia`, `motor_ano`, `bomba_capacidad`, `bomba_ano`, `tablero_marca`, `tablero_modelo`, `vacuometro`, `tanque_combustible`, `subcomponentes` |
| `BJOCK` | `BJOCK` | Bombas jockey | `marca`, `modelo`, `motor_potencia`, `bomba_capacidad`, `ano_operacion`, `anio_operacion`, `marca_tablero`, `modelo_tablero`, `ano_tablero`, `subcomponentes` |
| `PCORT`, `PCF` | `PCF` | Puertas corta fuego | `indice`, `cantidad`, `ubicacion_detalle`, `marca_puerta`, `puerta_marca`, `modelo_puerta`, `puerta_modelo`, `tipo_cierre`, `cierre_tipo`, `marca_cierre`, `cierre_marca`, `modelo_cierre`, `cierre_modelo`, `tiene_barra_antipanico`, `barra_antipanico`, `marca_barra`, `barra_marca`, `modelo_barra`, `barra_modelo`, `subcomponentes` |
| `RHUM`, `RH` | `RH` | Red húmeda (gabinetes y rociadores) | `numero_unidad`, `presion`, `caudal`, `ubicacion`, `observaciones` (Soporta `{}` limpiamente) |
| `SINC`, `SIN` | `SIN` | Sistema de detección y alarma contra incendio | `tipo_sistema`, `estado_sistema`, `ubicacion_central`, `tipo`, `sub_tipo`, `marca`, `modelo`, `ubicacion`, `anio_operacion`, `observaciones`, `subcomponentes` |

---

### E. Seguridad, Telecomunicaciones y Transporte
**Archivo fuente**: [`types/inventory/security-telecom.ts`](file:///c:/REMS/GT-CheckList-App/types/inventory/security-telecom.ts)

| Abreviaturas / Aliases Supabase | Esquema Exportado | Nombre del Equipo | Campos Mapeados |
|---|---|---|---|
| `SEGPEAT`, `SEGP` | `SEGP` | Acceso peatonal | `software_nombre`, `software_marca`, `software_version`, `tiene_servidor`, `subcomponentes` |
| `SEGVEH`, `SEGV` | `SEGV` | Acceso vehicular | `software_nombre`, `software_marca`, `software_version`, `tiene_servidor`, `subcomponentes` |
| `CCTV` | `CCTV` | Circuito cerrado de televisión | `tipo`, `marca`, `modelo`, `ubicacion`, `anio_operacion`, `sistema_operacion`, `software_nombre`, `software_marca`, `software_version`, `tiene_servidor`, `subcomponentes` |
| `ASC`, `ASCENSOR` | `ASC` | Ascensores | `marca`, `modelo`, `capacidad`, `tipo_llamada`, `detalle_llamada`, `llamada_anticipada`, `ano_operacion` |
| `MAMP`, `MAMPARA` | `MAMP` | Mamparas | `marca`, `modelo_freno`, `tipo_vidrio`, `tipo_vidrio_otros`, `ubicacion` |
| `PLATDISC`, `PDISC` | `PDISC` | Plataformas para Discapacitados | `unidad`, `marca`, `modelo`, `capacidad`, `tiempo_operacion`, `cantidad` |
| `SRVDC`, `DC` | `DC` | Servidores de data center | `unidad`, `marca`, `modelo`, `anio_operacion`, `subcomponentes` |
| `CENTTEL`, `CTELEF` | `CTELEF` | Centrales Telefónicas | `tipo`, `marca`, `modelo`, `anio_operacion`, `subcomponentes` |

---

## 3. Instrucciones Paso a Paso para Modificar o Agregar Mapeos

### Escenario 1: Quieres agregar un nuevo ALIAS (ej. un nuevo código de abreviatura de Supabase)
1. Abre [`types/inventory/index.ts`](file:///c:/REMS/GT-CheckList-App/types/inventory/index.ts).
2. Busca el objeto `EQUIPMENT_TECHNICAL_FIELD_ALIASES`.
3. Añade la nueva clave mapeada al esquema correspondiente:
   ```ts
   NUEVA_ABREVIATURA: 'ESQUEMA_DESTINO',
   ```

---

### Escenario 2: Quieres agregar un nuevo CAMPO a un equipo existente
1. Abre el archivo de módulo del dominio (`sanitary.ts`, `hvac.ts`, `electrical.ts`, `fire-safety.ts`, `security-telecom.ts`).
2. Ubica el arreglo del equipo (ejemplo `BELEC` o `SPLIT`).
3. Agrega el objeto de configuración:
   ```ts
   { key: 'nombre_llave_json', label: 'Etiqueta Bonita', type: 'text' }
   ```
   *Propiedades opcionales disponibles*:
   - `suffix`: sufijo estático (ej. `'m³'`, `'HP'`, `'V'`, `'GPM'`).
   - `section`: agrupador visual (ej. `'Motor'`, `'VDF'`).
   - `type`: `'text' | 'number' | 'select' | 'boolean' | 'collection'`.

---

### Escenario 3: Quieres crear un equipo TOTALMENTE NUEVO
1. Crea la constante `NUEVO_EQUIPO: TechnicalFieldConfig[] = [...]` en su archivo de dominio.
2. Expórtala en `types/inventory/index.ts` dentro de `EQUIPMENT_TECHNICAL_FIELDS`.
3. Registra su abreviatura o alias en `EQUIPMENT_TECHNICAL_FIELD_ALIASES`.

---

## 4. Garantías del Motor Híbrido (Seguridad de Datos)

Aunque edites o no un esquema:
1. **Visibilidad inteligente**: Los campos que estén vacíos o nulos en la BD se ocultan automáticamente (no muestran guiones feos `—`).
2. **Campos adicionales automáticos**: Si un registro de Supabase trae una llave que no agregaste al esquema, el sistema la descubre dinámicamente y la muestra formateada bajo la sección **"Información Adicional"**.
3. **Edición sin pérdidas**: Al editar y guardar, el sistema mantiene intactas las llaves extras y arreglos/objetos anidados (`vdf`, `subcomponentes`, `itgs`), asegurando que **nunca se destruya ningún dato en la base de datos**.
