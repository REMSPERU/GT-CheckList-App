---
name: GEMA Web Admin
description: Portal web administrativo para supervisión de mantenimientos de equipamiento e inventario en inmuebles
colors:
  primary: "#082f2a"
  primary-dark: "#07352f"
  secondary: "#0b1f28"
  accent: "#d9f99d"
  neutral-bg: "#edf5f3"
  neutral-card: "#ffffff"
  neutral-text: "#0c1720"
  neutral-muted: "#64748b"
  status-success: "#dcfce7"
typography:
  display:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "clamp(2rem, 4vw, 4.2rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.05em"
  title:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.03em"
  body:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 900
    letterSpacing: "0.16em"
rounded:
  sm: "10px"
  md: "12px"
  lg: "24px"
  xl: "28px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-card}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#042f2e"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.neutral-card}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "26px"
---

# Design System: GEMA Web Admin

## Overview

**Creative North Star: "The Operations Command Deck"**

GEMA Web Admin es una interfaz de supervisión operativa y ejecutiva diseñada para brindar máxima claridad, contraste técnico y solidez estructural. Diseñada sobre una paleta verde esmeralda profundo con acentos en lima fluorescente y fondos de textura de papel fresco (mint paper canvas), la plataforma combina la seriedad de un software industrial de gestión edilicia con una estética moderna, limpia y pulida.

El sistema visual prioriza la densidad de información escaneable, destacando datos clave en tablas de alta legibilidad, badges de estado vibrantes y tarjetas de métricas tipo cápsula. La navegación lateral flotante y la barra superior traslúcida con desenfoque de fondo aportan dinamismo visual sin comprometer la velocidad de inspección.

**Key Characteristics:**
- **Esmeralda y Lima de Alto Contraste:** Paleta principal inspirada en monitoreo técnico y eficiencia energética.
- **Glassmorphism Traslúcido:** Cabeceras y modales con `backdrop-blur` sutil sobre gradientes radiales.
- **Estructura Modular Amplia:** Esquinas suavizadas de gran radio (`rounded-3xl` / 24px) que encapsulan datos de forma orgánica.
- **Tipografía Técnica Ajustada:** Uso de la jerarquía Segoe UI con tracking estrecho en títulos y tracking súper expandido en etiquetas uppercase.

## Colors

La paleta cromática comunica confianza técnica, ecología industrial y visibilidad instantánea. Se estructura en roles de contraste definidos:

### Primary
- **Deep Emerald Teal** (#082f2a): Usado en la barra lateral de navegación, encabezados principales y botones primarios de acción.
- **Dark Forest Teal** (#07352f): Tono de degradado secundario para modales y elementos de mayor profundidad.

### Secondary
- **Slate Navy Dark** (#0b1f28): Fondo complementario de contraste para gradientes nocturnos y menús colapsados.

### Accent
- **Vibrant Lime Accent** (#d9f99d): Usado en items navegables activos, indicadores de foco, bordes de modales y botones de alta prioridad.

### Neutral
- **Mint Canvas BG** (#edf5f3): Fondo general de la aplicación con suave degradado radial.
- **Pure White Card** (#ffffff): Superficies de tarjetas, formularios y fondos de tabla.
- **Slate Deep Text** (#0c1720 / #0f172a): Color de texto principal para máxima legibilidad.
- **Slate Muted Text** (#64748b): Color de texto secundario para etiquetas, subtítulos y descripciones.

### Status
- **Success Green** (#dcfce7 / #14532d): Badges y badges de confirmación o completado.

### Named Rules
**The High-Visibility Accent Rule.** El acento lima (`#d9f99d`) se reserva estrictamente para estados activos de navegación, llamadas a la acción destacadas y micro-destacados. Su uso nunca debe superar el 10% de la superficie visible.

## Typography

**Display & Body Font:** `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`  
**Character:** Limpia, geométrica, altamente legible en pantallas de escritorio y monitores de control.

### Hierarchy
- **Display** (700, `clamp(2rem, 4vw, 4.2rem)`, 1.1, `-0.04em`): Títulos principales de secciones y páginas de resumen.
- **Headline** (900, `1.5rem` / 24px, 1.2, `-0.05em`): Títulos de modales y tarjetas destacadas.
- **Title** (700, `1.125rem` / 18px, 1.3, `-0.03em`): Subtítulos de sección y cabeceras de tabla.
- **Body** (400, `0.92rem` / 14.7px, 1.5): Texto general de tablas, descripciones y campos de formulario.
- **Label** (900, `0.68rem` / 11px, `0.16em` uppercase): Antetítulos (*eyebrows*), etiquetas de sección y chips técnicos.

### Named Rules
**The Eyebrow-Title Contrast Rule.** Todo título importante va precedido de un antetítulo (*eyebrow*) en mayúsculas pequeñas (11px, `tracking-[0.16em]`) en color `text-emerald-800` o `text-lime-200` según la superficie.

## Layout

La distribución se basa en un grid asimétrico con barra lateral persistente y contenido adaptable:

- **Sidebar de Navegación:** Ancho fijo de `260px` expandido y `70px` colapsado, con transición suave de grid (`grid-cols-[260px_minmax(0,1fr)]`).
- **Header Superior Traslúcido:** Altura mínima de `56px` con `backdrop-blur-[14px]`, pegado en la parte superior (`sticky top-0`).
- **Contenedores de Pagina:** Tarjetas principales con bordes sutiles (`border border-slate-900/10`), sombras suaves (`shadow-[0_20px_60px_rgba(12,23,32,0.08)]`) y relleno interno de 26px (`p-[26px]`).
- **Tablas Responsivas:** Scroll horizontal y vertical automático (`max-h-[calc(100vh-250px)]`), con cabeceras pegajosas (`sticky top-0 z-10`).

## Elevation & Depth

El sistema utiliza sombras suaves multi-capa combinadas con desenfoque de fondo (glassmorphism) en lugar de sombras pesadas:

### Shadow Vocabulary
- **Card Ambient** (`shadow-[0_20px_60px_rgba(12,23,32,0.08)]`): Utilizado en tarjetas principales de contenido y cabeceras de página.
- **Compact Card** (`shadow-[0_12px_34px_rgba(12,23,32,0.06)]`): Utilizado en filtros y tarjetas secundarias.
- **Modal Deep** (`shadow-[0_34px_120px_rgba(2,18,14,0.38)]`): Sombreamiento dramático flotante para ventanas modales sobre telón oscuro de fondo (`bg-[#061711]/65 backdrop-blur-[5px]`).

### Named Rules
**The Glass-Layering Rule.** Los elementos flotantes (headers, modales) deben utilizar fondos semi-transparentes (`bg-white/55` o `bg-[#061711]/65`) combinados con `backdrop-blur` para mantener el contexto de la superficie inferior.

## Shapes

- **Corner Radius:**
  - **Large Containers & Cards:** `rounded-3xl` (24px) o `rounded-[28px]`.
  - **Modals & Search Bars:** `rounded-[22px]` a `rounded-[28px]`.
  - **Nav Items & Buttons:** `rounded-xl` (12px) o `rounded-[10px]` (10px).
  - **Status Badges & Avatar Pills:** `rounded-full` (9999px).
- **Border Vocabulary:** Líneas finas de división en `border-slate-900/10`, `border-white/10` o `border-emerald-950/10`.

## Components

### Buttons
- **Primary Button:** Fondo Slate Dark (`bg-slate-900`), texto blanco, radio de 10px (`rounded-[10px]`), peso font-bold, hover a `bg-emerald-900`.
- **Accent Nav Button:** Fondo Lima (`bg-lime-200`), texto Teal Oscuro (`text-teal-950`), radio de 12px (`rounded-xl`), font-semibold.
- **Close Modal Button:** Círculo blanco semi-transparente (`bg-white/10 border border-white/20`), texto blanco, hover `bg-white/20`.

### Navigation Sidebar
- **Background:** Gradiente vertical de `#082f2a` a `#0b1f28`.
- **Items:** Links redondeados (12px) con iconos Lucide de 18px (`strokeWidth={1.5}`). Estado activo marcado con fondo `bg-lime-200 text-teal-950`.

### Cards & Page Headers
- **Featured Header:** Gradiente diagonal suave de blanco a lima suave con destello azulado radial (`bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(217,249,157,0.42))]`), relleno de 26px, borde fino.

### Tables
- **Header Cells (TH):** Fondo `bg-slate-50`, texto `text-slate-500` en minúsculas/uppercase de 12px (`text-xs uppercase tracking-[0.08em]`), borde inferior `border-slate-100`.
- **Data Cells (TD):** Texto `text-[#0c1720]` de 14.7px, padding vertical de 14px (`py-3.5`), borde inferior fino.

### Status Badges
- **Success Badge:** Cápsula redonda (`rounded-full`), fondo `bg-green-100`, texto `text-green-900` font-extrabold de 12px (`text-xs`).

## Do's and Don'ts

### Do:
- **Do** usar siempre antetítulos (*eyebrows*) en mayúsculas pequeñas con amplio espaciado entre letras (`tracking-[0.16em]`) antes de encabezados principales.
- **Do** mantener las cabeceras de tabla pegajosas (`sticky top-0 z-10`) con fondo de contraste ligero (`bg-slate-50`) para facilitar la lectura de listas extensas.
- **Do** utilizar el fondo de gradiente mint suave (`radial-gradient`) para mantener la frescura visual del canvas.

### Don't:
- **Don't** saturar la pantalla con el verde lima de acento (`#d9f99d`); este se limita a elementos activos y seleccionados.
- **Don't** remover las esquinas redondeadas suavizadas (`rounded-3xl` / 24px) en los contenedores principales.
- **Don't** aplicar sombras duras o negras puras; utilizar transparencias con tinte esmeralda o azul pizarra.
