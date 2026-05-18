# GT CheckList - Web Admin

App web con Next.js para autenticacion y administracion basica:

- Registro de usuario (`/register`)
- Inicio de sesion (`/login`)
- Recuperar contrasena (`/forgot-password`)
- Definir nueva contrasena (`/reset-password`)
- Panel administrativo (`/admin`)
- Consulta de equipos (`/admin/equipos`)
- Consulta de inmuebles (`/admin/inmuebles`)
- Consulta de mantenimientos (`/admin/mantenimientos`)

## 1) Instalar y ejecutar local

```bash
cd web
npm install
npm run dev
```

Abrir `http://localhost:3000`.

El panel administrativo requiere iniciar sesion. Despues del login se redirige a
`/admin`.

## 2) Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (ej: `http://localhost:3000` en local)

## 3) Configurar Supabase para envio de correo

En Supabase Dashboard:

1. **Authentication -> URL Configuration**
   - Site URL: tu dominio web (ej: `https://tu-app.vercel.app`)
2. **Authentication -> URL Configuration -> Redirect URLs**
   - Agrega:
     - `http://localhost:3000/reset-password`
     - `https://tu-app.vercel.app/reset-password`
     - `http://localhost:3000/login`
     - `https://tu-app.vercel.app/login`
3. **Authentication -> Email Templates**
   - Opcional: personaliza el correo de confirmacion y recuperacion.

Nota: Supabase envia correos de confirmacion y recuperacion de forma nativa.
Si quieres mejor entregabilidad, configura SMTP propio en
**Authentication -> SMTP Settings**.

## 4) Permisos de datos

El admin web usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, por lo que respeta las
reglas RLS de Supabase. Asegurate de que los roles administrativos tengan
permiso de lectura sobre:

- `properties`
- `equipos`
- `equipamentos`
- `mantenimientos`

## 5) Desplegar en Vercel

1. Importa este repositorio en Vercel.
2. En el proyecto, configura:
   - **Root Directory**: `web`
   - Framework: Next.js
3. Agrega env vars en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = URL publica de Vercel
4. Deploy.

## 6) Flujo de recuperacion

1. Usuario entra a `/forgot-password` y coloca correo.
2. Supabase envia email con enlace.
3. Usuario abre enlace (redirige a `/reset-password`).
4. Usuario define nueva contrasena.
