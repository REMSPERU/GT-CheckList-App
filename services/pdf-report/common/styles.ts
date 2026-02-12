// PDF Report CSS Styles - Corporate Template

/**
 * Corporate style CSS for PDF reports
 * Blue (#0056b3) and Orange (#ff6600) color scheme
 */
export function getReportStyles(
  orientation: 'portrait' | 'landscape' = 'portrait',
): string {
  const pageRule =
    orientation === 'landscape'
      ? `@page { size: landscape; margin: 5mm; }`
      : `@page { size: A4; margin: 15mm; }`;

  return `
    ${pageRule}
    /* ESTILOS GENERALES (FORMATO A4) */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }

    .page {
      width: 100%;
      min-height: 100vh;
      padding: 10mm 0;
      page-break-after: always;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* ENCABEZADOS */
    header {
      border-bottom: 2px solid #FC5126;
      margin-bottom: 20px;
      padding-bottom: 10px;
    }

    h1 {
      color: #FC5126;
      font-size: 24px;
      text-transform: uppercase;
      margin: 0;
      text-align: center;
    }

    h2 {
      font-size: 16px;
      color: #444;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
      margin-top: 25px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    h3 {
      font-size: 14px;
      color: #FC5126;
      margin-top: 10px;
      text-align: center;
    }

    /* TABLAS DE DATOS */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 12px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #f2f2f2;
      font-weight: bold;
      color: #000;
    }

    .info-table {
      margin-bottom: 20px;
    }

    .info-table td {
      border: none;
      padding: 4px 0;
    }

    .info-label {
      font-weight: bold;
      width: 150px;
      display: inline-block;
      color: #333;
    }

    .data-grid th {
      background-color: #FC5126;
      color: white;
      width: 25%;
    }

    .data-grid td {
      width: 25%;
    }

    /* TABLA DE RESUMEN */
    .summary-table {
      width: 60%;
      margin: 0 auto 20px auto;
    }

    .summary-table th {
      background-color: #FC5126;
      color: white;
    }

    /* TABLA DE EQUIPOS */
    .equipment-table th {
      background-color: #FC5126;
      color: white;
      text-align: center;
      font-size: 11px;
    }

    .equipment-table td {
      text-align: center;
      font-size: 11px;
    }

    .equipment-table tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    /* LISTAS */
    ul {
      font-size: 12px;
      line-height: 1.8;
      padding-left: 25px;
      margin-bottom: 15px;
    }

    li {
      margin-bottom: 3px;
    }

    /* SECCIÓN DE FOTOS (GRID) */
    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 15px;
    }

    .photo-container {
      flex: 1 1 calc(50% - 10px);
      min-width: 200px;
      text-align: center;
      border: 1px solid #ddd;
      padding: 5px;
      background: #fafafa;
    }

    .photo-container.full-width {
      flex: 1 1 100%;
    }

    .photo-header {
      color: white;
      font-weight: bold;
      padding: 6px 10px;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: block;
      font-size: 11px;
    }

    .bg-orange {
      background-color: #FC5126;
    }

    img {
      max-width: 100%;
      height: auto;
      max-height: 200px;
      display: block;
      margin: 0 auto;
      border: 1px solid #eee;
    }

    .photo-caption {
      font-size: 10px;
      font-style: italic;
      color: #666;
      margin-top: 5px;
    }

    /* UTILIDADES */
    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .date-header {
      text-align: right;
      font-size: 12px;
      margin-top: 5px;
      color: #666;
    }

    .normativa {
      font-size: 11px;
      text-align: justify;
      background: #f9f9f9;
      padding: 10px;
      border-left: 3px solid #FC5126;
      margin: 10px 0;
    }

    .section-text {
      font-size: 12px;
      margin-bottom: 10px;
      text-align: justify;
    }

    /* PAGE BREAKS */
    .page-break {
      page-break-before: always;
    }

    @media print {
      body {
        background: none;
        margin: 0;
      }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
      .photo-container {
        page-break-inside: avoid;
      }
    }

    /* ESTILOS COMPACTOS (Para ajustar más contenido en una página) */
    .compact .page {
      padding: 5mm 0;
    }

    .compact h1 { font-size: 20px; margin-bottom: 5px; }
    .compact h2 { font-size: 14px; margin-top: 15px; margin-bottom: 5px; }
    .compact h3 { font-size: 12px; margin-top: 5px; }
    
    .compact .data-grid th, .compact .data-grid td {
      padding: 4px;
      font-size: 10px;
    }

    .grid-compact {
      gap: 8px;
      margin-top: 10px;
    }

    .grid-compact .photo-container {
      padding: 3px;
    }

    .grid-compact .photo-header {
      padding: 3px 5px;
      font-size: 9px;
      margin-bottom: 4px;
    }

    .grid-compact .photo-caption {
      margin-top: 2px;
      font-size: 9px;
    }

    /* Imágenes más pequeñas para modo compacto */
    .small-image img {
      max-height: 140px;
    }

    /* Layout de tercios para optimizar espacio horizontal */
    .thirds .photo-container {
      flex: 1 1 calc(33.33% - 10px);
      min-width: 150px;
    }

    /* ESTILOS PROTOCOLO (RESUMEN TABLEROS) */
    
    .protocol-page {
      padding: 0;
      width: 100%;
      background-color: #fff;
      font-family: Arial, sans-serif;
      height: 100vh; /* Para asegurar que ocupe toda la hoja */
      display: flex;
      flex-direction: column;
    }
    
    .landscape-container {
      width: 100%;
      height: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
    }

    .protocol-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 10px;
      border-bottom: 2px solid #FC5126;
      padding-bottom: 5px;
    }
    .brand-title {
      font-weight: bold;
      font-size: 18px;
      color: #FC5126;
    }
    .brand-sub {
      font-size: 12px;
      color: #333;
      font-weight: bold;
    }
    .protocol-contact {
      font-size: 9px;
      text-align: right;
      color: #444;
      line-height: 1.2;
    }

    .protocol-band {
      background-color: #FC5126;
      color: #fff;
      padding: 5px;
      text-align: center;
      margin-bottom: 10px;
      border-radius: 2px;
    }
    .protocol-band-text {
      font-weight: bold;
      font-size: 14px;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Meta Info Compacta */
    .compact-meta {
      display: flex;
      flex-direction: column;
      font-size: 10px;
      margin-bottom: 10px;
      gap: 3px;
      border: 1px solid #ddd;
      padding: 5px;
      background: #f9f9f9;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
    }
    
    /* Contenedor de la tabla para ocupar el espacio central */
    .table-container {
      flex-grow: 1;
    }

    .protocol-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px; /* Fuente pequeña para que entre todo */
      border: 1px solid #FC5126;
      table-layout: fixed; /* Ayuda a controlar anchos */
    }
    .protocol-table th {
      background-color: #FC5126;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      padding: 1px;
      vertical-align: middle;
      border: 1px solid #ffffff;
      /* text-transform: uppercase; REMOVED */
      font-size: 4.5px; 
      overflow: hidden; /* Changed back to hidden to clip if needed, but wrap should handle it */
      white-space: normal; 
      word-break: break-word; /* Important for long words */
      line-height: 1.1;
      height: 30px; /* Slightly taller to fit wrapped text */
    }
    .protocol-table td {
      padding: 2px 1px;
      border: 1px solid #ffdccc; 
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 7px;
    }
    .protocol-table td.text-left {
      text-align: left;
      padding-left: 4px;
    }
    .protocol-table td.text-xs {
      font-size: 7px;
      white-space: normal; /* Permitir wrap en observaciones */
    }
    .protocol-table tr:nth-child(even) {
      background-color: #fff5ed;
    }
    .protocol-table tr.empty-row {
      background-color: transparent !important;
    }
    .protocol-table tr.empty-row td {
      border: 1px solid transparent;
      color: transparent;
    }
    
    /* Footer fijo al fondo del contenedor flex */
    .protocol-footer {
      margin-top: auto;
      padding-top: 10px;
    }

    .protocol-signatures {
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .sig-table th {
      background-color: #FC5126;
      color: #fff;
      font-size: 9px;
      padding: 4px;
      border: 1px solid #ffffff;
    }
    .sig-table td {
      border: 1px solid #FC5126;
      padding: 4px;
      text-align: center;
    }
    .sig-name {
      font-weight: bold;
      font-size: 10px;
      color: #FC5126;
    }
    .sig-role {
      font-size: 8px;
      color: #666;
    }
    
    .sig-validity {
      text-align: center;
      font-weight: bold;
      font-size: 10px;
      border: 1px solid #FC5126;
      padding: 4px;
      color: #FC5126;
      background-color: #fff5ed;
      margin-bottom: 5px;
    }

    .page-number {
      text-align: right;
      font-size: 8px;
      color: #888;
    }

    /* RECOMMENDATIONS AND CONCLUSIONS SECTION */
    .recommendations-box {
      background: #f9f9f9;
      border-left: 4px solid #FC5126;
      padding: 15px;
      margin: 10px 0 20px 0;
      font-size: 12px;
      text-align: justify;
    }

    .recommendations-box p {
      margin: 0;
      line-height: 1.6;
    }

    /* SIGNATURES SECTION (Technical Report) */
    .signatures-section {
      margin-top: 60px;
      page-break-inside: avoid;
    }

    .sig-grid {
      display: flex;
      justify-content: space-around;
      gap: 40px;
    }

    .sig-block {
      text-align: center;
      min-width: 200px;
    }

    .sig-block p {
      margin-bottom: 40px;
    }

    .sig-line {
      border-top: 1px solid #333;
      width: 200px;
      margin: 0 auto;
    }
  `;
}
