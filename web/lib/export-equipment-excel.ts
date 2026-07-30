import ExcelJS from 'exceljs';
import type { AdminEquipmentExportRow } from '@/types/admin';
import { mapTipoLabel } from '@/app/admin/equipos/page';
import { formatUbicacion } from '@/lib/ubicacion';

export async function exportEquipmentsToExcel(
  rows: AdminEquipmentExportRow[],
  filterSummary?: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GEMA App';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Activos', {
    views: [{ showGridLines: true }],
  });

  const dateStr = new Date().toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Define column keys and base widths
  worksheet.columns = [
    { key: 'num', width: 8 },
    { key: 'inmueble', width: 25 },
    { key: 'codigo', width: 20 },
    { key: 'tipoActivo', width: 28 },
    { key: 'tipo', width: 24 },
    { key: 'subtipo', width: 22 },
    { key: 'ubicacion', width: 24 },
    { key: 'detalleUbicacion', width: 30 },
  ];

  // 1. Title Banner (Row 1)
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'REPORTE DE ACTIVOS E INVENTARIO - GEMA';
  titleCell.font = {
    name: 'Calibri',
    size: 14,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF07352F' }, // Dark Emerald
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  // 2. Metadata Rows (Rows 2-4)
  const metaStyleLabel = {
    font: {
      name: 'Calibri',
      size: 10.5,
      bold: true,
      color: { argb: 'FF07352F' },
    },
    alignment: { vertical: 'middle', horizontal: 'left' as const },
  };

  const metaStyleVal = {
    font: { name: 'Calibri', size: 10.5, color: { argb: 'FF1F2937' } },
    alignment: { vertical: 'middle', horizontal: 'left' as const },
  };

  // Row 2: Fecha de generación
  worksheet.mergeCells('A2:B2');
  const r2Label = worksheet.getCell('A2');
  r2Label.value = 'Fecha de generación:';
  Object.assign(r2Label, metaStyleLabel);

  worksheet.mergeCells('C2:H2');
  const r2Val = worksheet.getCell('C2');
  r2Val.value = dateStr;
  Object.assign(r2Val, metaStyleVal);
  worksheet.getRow(2).height = 20;

  // Row 3: Total de registros
  worksheet.mergeCells('A3:B3');
  const r3Label = worksheet.getCell('A3');
  r3Label.value = 'Total de registros:';
  Object.assign(r3Label, metaStyleLabel);

  worksheet.mergeCells('C3:H3');
  const r3Val = worksheet.getCell('C3');
  r3Val.value = `${rows.length} activos`;
  Object.assign(r3Val, metaStyleVal);
  worksheet.getRow(3).height = 20;

  // Row 4: Filtros aplicados
  worksheet.mergeCells('A4:B4');
  const r4Label = worksheet.getCell('A4');
  r4Label.value = 'Filtros aplicados:';
  Object.assign(r4Label, metaStyleLabel);

  worksheet.mergeCells('C4:H4');
  const r4Val = worksheet.getCell('C4');
  r4Val.value = filterSummary || 'Todos los activos sin restricciones';
  Object.assign(r4Val, metaStyleVal);
  worksheet.getRow(4).height = 20;

  // Row 5: Blank separator
  worksheet.getRow(5).height = 12;

  // 3. Table Header (Row 6)
  const headerTitles = [
    '#',
    'Inmueble',
    'Código de Activo',
    'Tipo de Activo',
    'Tipo',
    'Subtipo',
    'Ubicación',
    'Detalle Ubicación',
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.height = 26;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FF04231F' } },
    bottom: { style: 'medium', color: { argb: 'FF04231F' } },
    left: { style: 'thin', color: { argb: 'FF0D4F46' } },
    right: { style: 'thin', color: { argb: 'FF0D4F46' } },
  };

  headerTitles.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF07352F' }, // Dark Emerald Header
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 0 || idx === 2 ? 'center' : 'left',
    };
    cell.border = headerBorder;
  });

  // 4. Data Rows (Rows 7+)
  rows.forEach((row, index) => {
    const rowIndex = 7 + index;
    const dataRow = worksheet.getRow(rowIndex);
    dataRow.height = 22;

    const rowValues = [
      index + 1,
      row.propertyName || 'Sin inmueble',
      row.codigo || '-',
      row.equipmentName || 'Sin tipo',
      row.tipo ? mapTipoLabel(row.tipo) : '-',
      row.subtipo ? mapTipoLabel(row.subtipo) : '-',
      formatUbicacion(row.ubicacion),
      row.detalle_ubicacion || '-',
    ];

    const isZebra = index % 2 === 1;
    const rowFillColor = isZebra ? 'FFF4F8F6' : 'FFFFFFFF'; // Light mint zebra

    rowValues.forEach((val, colIdx) => {
      const cell = dataRow.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: colIdx === 2, // Bold on active code
        color: { argb: colIdx === 2 ? 'FF0F172A' : 'FF334155' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowFillColor },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 0 || colIdx === 2 ? 'center' : 'left',
      };
      cell.border = thinBorder;
    });
  });

  // 5. AutoFilter on header row A6:H{lastRow}
  const lastRowIndex = 6 + rows.length;
  worksheet.autoFilter = {
    from: 'A6',
    to: `H${lastRowIndex}`,
  };

  // 6. Dynamic Column Widths auto-adjust (based on table content)
  worksheet.columns.forEach((col, colIdx) => {
    let maxLen = col.width || 12;
    if (colIdx === 0) {
      col.width = 8; // Column '#' stays compact
      return;
    }
    rows.forEach(row => {
      const vals = [
        row.propertyName,
        row.codigo,
        row.equipmentName,
        row.tipo ? mapTipoLabel(row.tipo) : '',
        row.subtipo ? mapTipoLabel(row.subtipo) : '',
        row.ubicacion,
        row.detalle_ubicacion,
      ];
      const val = vals[colIdx - 1];
      if (val) {
        maxLen = Math.max(maxLen, String(val).length + 4);
      }
    });
    col.width = Math.min(maxLen, 50);
  });

  // 7. Write & trigger file download as GEMA_Activos_YYYY-MM-DD.xlsx
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const todayIso = new Date().toISOString().split('T')[0];
  const filename = `GEMA_Activos_${todayIso}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
