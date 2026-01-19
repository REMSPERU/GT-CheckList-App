// PDF Report CSS Styles - Corporate Template

/**
 * Corporate style CSS for PDF reports
 * Blue (#0056b3) and Orange (#ff6600) color scheme
 */
export function getReportStyles(): string {
  return `
    /* ESTILOS GENERALES (FORMATO A4) */
    @page {
      size: A4;
      margin: 15mm;
    }

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
      border-bottom: 2px solid #0056b3;
      margin-bottom: 20px;
      padding-bottom: 10px;
    }

    h1 {
      color: #0056b3;
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
      color: #0056b3;
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
      background-color: #0056b3;
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
      background-color: #0056b3;
      color: white;
    }

    /* TABLA DE EQUIPOS */
    .equipment-table th {
      background-color: #0056b3;
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
      background-color: #ff6600;
    }

    .bg-blue {
      background-color: #0056b3;
    }

    .bg-green {
      background-color: #28a745;
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
      border-left: 3px solid #0056b3;
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
  `;
}
