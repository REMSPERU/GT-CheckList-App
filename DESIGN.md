---
name: GEMA Web Admin
description: Portal web administrativo para supervisión corporativa de mantenimientos de equipamiento e inventario en inmuebles
colors:
  primary: "#072e27"
  primary-dark: "#05221d"
  secondary: "#0b1a21"
  accent: "#047857"
  neutral-bg: "#f4f7f6"
  neutral-card: "#ffffff"
  neutral-text: "#0f172a"
  neutral-muted: "#64748b"
  border-platino: "#e2e8f0"
  status-success: "#dcfce7"
typography:
  display:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "clamp(1.75rem, 3.5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 800
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
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
    rounded: "{rounded.md}"
    padding: "9px 16px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "9px 16px"
  card:
    backgroundColor: "{colors.neutral-card}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: GEMA Web Admin

## Overview

**Creative North Star: "The Executive Operations Deck"**

GEMA Web Admin es una interfaz corporativa de supervisión operativa para administradores de edificios y gerentes de facilidades. Combina la sobriedad de un software industrial de gestión de  activos con una estructura limpia, clara y estructurada.

El sistema visual prioriza la densidad de información escaneable, destacando datos clave en tablas técnicas de alta legibilidad, bordes platino estructurados y tarjetas corporativas limpias.

**Key Characteristics:**
- **Bosque Nocturno y Platino:** Paleta corporativa sobria inspirada en ingeniería y administración de activos edilicios.
- **Estructura Geométricamente Pulida:** Radio de esquinas equilibrado (`rounded-xl` / 12px para contenedores, `rounded-lg` / 8px para botones/inputs), eliminando bordes excesivamente redondeados estilo neón/IA.
- **Jerarquía Tipográfica Clara:** Uso de Segoe UI con tracking sutil en títulos y antetítulos (*eyebrows*) en mayúsculas pequeñas.
- **Sobriedad Operativa:** Colores de acento estrictamente funcionales sin saturación neón ni verde lima chillón.

## Colors

La paleta cromática transmite seriedad ejecutiva, control técnico y confiabilidad institucional:

### Primary
- **Bosque Nocturno** (`#072e27`): Usado en la barra lateral de navegación, encabezados principales y botones primarios.
- **Dark Forest Teal** (`#05221d`): Fondo de navegación secundaria y estados hover de alta densidad.

### Secondary
- **Slate Dark Navy** (`#0b1a21`): Tono de apoyo para contrastes de cabeceras y modales.

### Accent
- **Esmeralda Corp** (`#047857` / `#059669`): Reservado para elementos activos seleccionados, badges de confirmación y llamadas a la acción clave.

### Neutral
- **Platinum Canvas BG** (`#f4f7f6` / `#f8fafc`): Fondo general de la plataforma de administración.
- **Pure White Card** (`#ffffff`): Superficies de tarjetas, modales y tablas.
- **Charcoal Text** (`#0f172a` / `#1e293b`): Texto principal de máxima legibilidad.
- **Slate Muted Text** (`#64748b`): Subtítulos, descripciones y antetítulos.
- **Border Platino** (`#e2e8f0` / `#cbd5e1`): Bordes finos de separación de módulos y tarjetas.

## Typography

**Font Family:** `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`

### Hierarchy
- **Display** (700, `clamp(1.75rem, 3.5vw, 3rem)`, 1.15, `-0.03em`)
- **Headline** (800, `1.25rem` / 20px, 1.25, `-0.03em`)
- **Title** (700, `1rem` / 16px, 1.35, `-0.02em`)
- **Body** (400, `0.875rem` / 14px, 1.5)
- **Label** (800, `0.68rem` / 11px, `0.14em` uppercase)

## Layout & Shapes

- **Corner Radius:**
  - **Tarjetas & Contenedores:** `rounded-xl` (12px).
  - **Botones, Inputs & Selects:** `rounded-lg` (8px).
  - **Chips & Badges:** `rounded-md` (6px) o `rounded-full` sutil.
- **Border Vocabulary:** Líneas de separación pulidas en `border-slate-200` (`#e2e8f0`).

## Components

### Buttons
- **Primary Button:** Fondo Bosque (`bg-[#072e27]`), texto blanco, radio 8px (`rounded-lg`), hover a `bg-[#05221d]`.
- **Accent Button:** Fondo Esmeralda Corp (`bg-[#047857]`), texto blanco, radio 8px (`rounded-lg`), font-semibold.
- **Secondary Button:** Fondo Platino tenue (`bg-[#f1f5f9]`), texto Charcoal (`text-slate-800`), borde `border-slate-200`, radio 8px (`rounded-lg`).

### Navigation Sidebar
- **Background:** Bosque Nocturno (`#072e27`).
- **Items:** Links con radio de 8px (`rounded-lg`). Estado activo en `bg-[#047857] text-white font-bold border-l-2 border-emerald-400`.

## Do's and Don'ts

### Do:
- **Do** mantener bordes limpios (12px en tarjetas, 8px en controles) para una estética corporativa seria.
- **Do** usar el acento verde esmeralda mate (`#047857`) de forma discreta para estados activos y acciones primarias.
- **Do** mantener fondos claros y legibles en tablas y formularios de inspección.

### Don't:
- **Don't** utilizar verde lima neón (`#d9f99d`) ni colores fluorescentes.
- **Don't** usar esquinas gigantes redondeadas (`rounded-3xl` / 24px) que deformen la estructura corporativa.
