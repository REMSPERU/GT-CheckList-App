# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- **Técnicos e Ingenieros de Campo (Móvil):** Personal operativo en Perú encargado del mantenimiento preventivo y correctivo de equipamiento técnico en inmuebles y edificios. Trabajan en entornos sin conectividad (sótanos, cuartos de bombas, tableros eléctricos, azoteas) y requieren registradores de datos ultra-rápidos e intuitivos.
- **Administradores y Supervisores de Edificios (Web):** Personal gerencial y operativo en oficina que monitorea el estado global de los mantenimientos, gestiona equipos/propiedades, genera reportes e inspecciona la carga de datos enviada desde campo.

## Product Purpose

GEMA (GT-CheckList-App) es una plataforma integral para la gestión, registro y supervisión de mantenimientos de equipamiento técnico en edificios. Permite a los técnicos completar checklists en campo sin dependencia de internet y a los administradores visualizar, auditar y exportar la información consolidada desde un portal web intuitivo.

## Positioning

Una herramienta dual (Móvil + Web) con arquitectura offline-first nativa que garantiza velocidad instantánea y cero pérdida de datos en campo para técnicos de mantenimiento en Perú, complementada por una consola administrativa web clara para toma de decisiones rápidas.

## Operating Context

- **Entorno Móvil (Campo):** Uso en teléfonos/tablets Android e iOS en zonas de baja o nula cobertura celular. Carga instantánea de datos mediante persistencia SQLite local (`expo-sqlite`), colas de reintento exponencial (`SyncQueue`) y sincronización transparente en segundo plano con Supabase.
- **Entorno Web (Oficina):** Acceso en navegador de escritorio (`web/` en Next.js) para supervisión, control de usuarios/roles, exportación a Excel y visualización de reportes.

## Capabilities and Constraints

- **App Móvil (React Native + Expo SDK 54):**
  - Navegación por tabs y rutas con Expo Router v6.
  - Persistencia offline en espejo con SQLite local y cliente Supabase.
  - Formularios dinámicos con `react-hook-form` + `zod`.
  - Captura de fotos de equipos y evidencias en campo con `expo-camera` / `expo-image-picker`.
- **Portal Web (`web/` - Next.js 16 + Tailwind CSS v4):**
  - Dashboard administrativo para consulta de registros y estado de mantenimientos.
  - Generación de QR y exportación de reportes en Excel/PDF (`exceljs`, `xlsx`).
- **Dominio e Idioma:** Español enfocado en Perú (`equipamento`, `mantenimiento`, `tablero_electrico`, `tipo_mantenimiento`).
- **Seguridad:** Autenticación y control de acceso por roles vía Supabase Auth.

## Brand Commitments

- Nombre oficial: **GEMA** (GT-CheckList-App).
- Diseño limpio, técnico y profesional en ambas superficies.
- UI móvil optimizada para uso con una sola mano en campo y UI web estructurada para rápida lectura administrativa.

## Evidence on Hand

- Código fuente de la app móvil en `app/`, `components/`, `services/`, `hooks/`.
- Aplicación web administrativa en `web/`.
- Configuración de base de datos offline en `services/db/` y motor de sincronización `services/sync.ts`.
- Documentación de arquitectura en `README.md` y `AGENTS.md`.

## Product Principles

1. **Prioridad Absoluta a la Experiencia de Campo:** La UI móvil debe ser ultra-intuitiva, táctil y nunca bloquear al técnico por latencia o falta de señal.
2. **Offline-First como Garantía:** Toda lectura y escritura en la app móvil ocurre primero en SQLite local; la red es un canal de sincronización secundario en segundo plano.
3. **Claridad Administrativa en Web:** El portal web debe presentar la información limpia, escaneable y lista para auditorías o exportaciones sin densidad innecesaria.
4. **Resiliencia e Integridad de Registros:** Ninguna inspección o foto tomada en campo se pierde; se reintenta automáticamente con backoff exponencial hasta ser confirmada en la nube.
