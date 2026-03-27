# GEMA - App de Checklist de Mantenimiento

Aplicacion movil construida con **React Native + Expo** para gestionar checklists
de mantenimiento de equipos en edificios.

El proyecto esta orientado a operacion en campo: prioriza velocidad, trabajo sin
conexion y sincronizacion automatica con backend cuando vuelve internet.

## Tabla de contenidos

- [Descripcion funcional](#descripcion-funcional)
- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura offline-first](#arquitectura-offline-first)
- [Requisitos](#requisitos)
- [Instalacion y puesta en marcha](#instalacion-y-puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Comandos disponibles](#comandos-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Flujo de datos y sincronizacion](#flujo-de-datos-y-sincronizacion)
- [Calidad de codigo](#calidad-de-codigo)
- [Build y distribucion (EAS)](#build-y-distribucion-eas)
- [Troubleshooting](#troubleshooting)

## Descripcion funcional

La app permite registrar y consultar mantenimientos de equipos tecnicos,
incluyendo flujos como:

- Autenticacion de usuarios y control por rol.
- Navegacion por modulos de mantenimiento (Expo Router con rutas por archivos).
- Registro y consulta de checklists.
- Persistencia local para uso offline.
- Sincronizacion bidireccional con Supabase/servicios remotos.

## Stack tecnologico

- **Frontend movil:** Expo SDK 54, React 19, React Native 0.81.
- **Navegacion:** Expo Router v6.
- **Estado remoto:** TanStack React Query v5.
- **Backend y datos:** Supabase + API REST.
- **Persistencia local:** `expo-sqlite` (mirror tables + cola offline).
- **Formularios:** `react-hook-form` + `zod`.
- **Monitoreo:** Sentry.

## Arquitectura offline-first

Esta app sigue un enfoque **offline-first**:

1. La lectura de datos se hace primero desde SQLite local (respuesta rapida).
2. Los cambios del usuario se guardan localmente cuando no hay internet.
3. Un proceso de sincronizacion en segundo plano empuja y trae cambios del
   backend.
4. Si falla la sincronizacion, entra una cola con reintentos exponenciales.

Componentes clave:

- `services/db/`: tablas espejo locales y utilidades de acceso.
- `services/sync.ts`: orquestacion push/pull periodica.
- `services/sync-queue.ts`: reintentos con backoff.
- `lib/supabase.ts`: cliente Supabase centralizado.

## Requisitos

- Node.js 20+ recomendado.
- npm 10+.
- Android Studio (para emulador Android).
- Xcode (solo macOS, para iOS).
- Cuenta y proyecto en Supabase.
- (Opcional) `eas-cli` para builds de distribucion.

## Instalacion y puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo de entorno local:

```bash
cp .env.example .env
```

3. Completar variables en `.env` (ver seccion de variables).

4. Iniciar servidor de desarrollo:

```bash
npm start
```

5. Ejecutar app:

- Android:

```bash
npm run android
```

- iOS:

```bash
npm run ios
```

- Web:

```bash
npm run web
```

## Variables de entorno

Tomar como base `.env.example`.

| Variable | Requerida | Descripcion |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Si | URL base de la API REST |
| `EXPO_PUBLIC_SUPABASE_URL` | Si | URL de tu proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_KEY` | Si | Clave publica de Supabase para cliente |
| `EXPO_PUBLIC_SENTRY_DSN` | Recomendado | DSN para errores en cliente |
| `SENTRY_DSN` | Opcional | DSN alterno para integraciones de build |
| `SENTRY_AUTH_TOKEN` | Opcional | Token para sourcemaps/releases en CI |

Notas:

- Variables con prefijo `EXPO_PUBLIC_` quedan disponibles en runtime de Expo.
- No subas nunca tu `.env` real al repositorio.

## Comandos disponibles

```bash
# Desarrollo
npm start
npm run android
npm run ios
npm run web

# Calidad
npm run lint
npm run format
npm run format:check
```

## Estructura del proyecto

```text
app/                  # Rutas y pantallas (Expo Router)
components/           # Componentes reutilizables
config/               # Configuracion de endpoints y entorno
constants/            # Constantes globales
contexts/             # Estado global por contexto (auth, rol, etc.)
hooks/                # Hooks por dominio (React Query wrappers)
lib/                  # Clientes y utilidades compartidas (HTTP/Supabase)
schemas/              # Esquemas Zod
services/             # Logica de negocio y acceso a datos
  db/                 # SQLite local y utilidades de persistencia
types/                # Tipos e interfaces TypeScript
supabase/             # Recursos de soporte para backend
```

## Flujo de datos y sincronizacion

Flujo simplificado:

1. UI consulta datos via hooks de dominio.
2. Hook obtiene datos de SQLite local para respuesta inmediata.
3. `SyncService` sincroniza con backend en background.
4. Cambios remotos actualizan tablas espejo locales.
5. Si no hay red, los cambios quedan en cola y se reintentan.

Ventajas:

- Mejor experiencia en entornos con conectividad inestable.
- Menor dependencia de latencia de red para tareas operativas.
- Menor riesgo de perdida de datos en campo.

## Calidad de codigo

- Linter: ESLint (`expo lint`).
- Formato: Prettier.
- Tipado estricto: TypeScript `strict`.
- Convencion de imports con alias `@/`.

Actualmente no hay runner de tests configurado. Si se agregan pruebas, se sugiere
Jest + `jest-expo` como base.

## Build y distribucion (EAS)

Perfiles configurados en `eas.json`:

- `development`: build interna APK para pruebas.
- `preview`: build interna APK para QA/demo.
- `production`: Android App Bundle (`.aab`) con incremento de version.

Comandos de ejemplo:

```bash
npx eas build --profile development --platform android
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
```

## Troubleshooting

- Si hay errores de cache de Metro:

```bash
npx expo start --clear
```

- Si el emulador Android no detecta cambios, reinicia `adb` y vuelve a correr
  `npm run android`.
- Si falla autenticacion, valida primero `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_KEY`.
