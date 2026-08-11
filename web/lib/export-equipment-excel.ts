import type ExcelJS from 'exceljs';
import type { AdminEquipmentExportRow } from '@/types/admin';
import { mapTipoLabel } from '@/app/admin/equipos/page';

interface TechFieldConfig {
  key: string;
  label: string;
  width: number;
}

const ALL_TECHNICAL_FIELDS: TechFieldConfig[] = [
  { key: 'marca', label: 'Marca', width: 18 },
  { key: 'modelo', label: 'Modelo', width: 18 },
  { key: 'serie', label: 'N° Serie', width: 20 },
  { key: 'capacidad', label: 'Capacidad', width: 18 },
  { key: 'potencia', label: 'Potencia', width: 16 },
  { key: 'voltaje', label: 'Voltaje', width: 14 },
  { key: 'fases', label: 'Fases', width: 12 },
  { key: 'rpm', label: 'RPM', width: 12 },
  { key: 'presion', label: 'Presión', width: 14 },
  { key: 'refrigerante', label: 'Refrigerante', width: 16 },
  { key: 'tiene_vdf', label: 'Tiene VDF', width: 12 },
  { key: 'anio_operacion', label: 'Año Operación', width: 14 },
  { key: 'tipo_tablero', label: 'Tipo Tablero', width: 18 },
  { key: 'rotulo', label: 'Rótulo', width: 18 },
  { key: 'numero_unidad', label: 'N° Unidad', width: 14 },
  { key: 'tipo_compresor', label: 'Tipo Compresor', width: 18 },
  { key: 'tipo_sistema', label: 'Tipo Sistema', width: 18 },
  { key: 'estado_sistema', label: 'Estado Sistema', width: 16 },
  { key: 'tipo_transferencia', label: 'Tipo Transferencia', width: 18 },
  { key: 'tipo_vidrio', label: 'Tipo Vidrio', width: 16 },
  { key: 'software_marca', label: 'Marca Software', width: 18 },
  { key: 'sistema_operacion', label: 'Sistema Operativo', width: 18 },
  { key: 'tiene_servidor', label: 'Tiene Servidor', width: 14 },
];

function formatHeaderLabel(key: string): string {
  const predefined = ALL_TECHNICAL_FIELDS.find(f => f.key === key);
  if (predefined) return predefined.label;

  const parts = key.split('_');
  if (parts.length > 1) {
    const group = parts[0].toUpperCase();
    const rest = parts
      .slice(1)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
    return `${group}: ${rest}`;
  }

  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

function getColLetter(colIdx: number): string {
  let letter = '';
  while (colIdx > 0) {
    const temp = (colIdx - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    colIdx = Math.floor((colIdx - temp - 1) / 26);
  }
  return letter;
}

function getRowValForLength(
  r: AdminEquipmentExportRow,
  colIdx: number,
  activeTechFields: TechFieldConfig[],
  hasComponentSummary: boolean,
): string | null {
  const baseVals = [
    r.propertyName,
    r.codigo,
    r.equipmentName,
    r.tipo ? mapTipoLabel(r.tipo) : '',
    r.subtipo ? mapTipoLabel(r.subtipo) : '',
    r.estatus,
    r.config ? 'Sí' : 'No',
    r.ubicacion,
    r.detalle_ubicacion,
  ];

  if (colIdx - 1 < baseVals.length) {
    return baseVals[colIdx - 1] ?? null;
  }

  const techIdx = colIdx - 1 - baseVals.length;
  if (techIdx < activeTechFields.length) {
    const key = activeTechFields[techIdx].key;
    const val = r.technicalDetails?.[key];
    return val !== null && val !== undefined ? String(val) : null;
  }

  if (hasComponentSummary) {
    return r.componentesResumen ?? null;
  }

  return null;
}

function getSafeSheetName(name: string, usedNames: Set<string>): string {
  let sanitized = name
    .replace(/[\/\\?*:[\]]/g, '')
    .trim();

  if (!sanitized) sanitized = 'Activos';

  if (sanitized.length > 28) {
    sanitized = sanitized.slice(0, 28).trim();
  }

  let finalName = sanitized;
  let counter = 1;
  while (usedNames.has(finalName.toLowerCase())) {
    counter++;
    const suffix = ` (${counter})`;
    finalName = `${sanitized.slice(0, 31 - suffix.length)}${suffix}`;
  }

  usedNames.add(finalName.toLowerCase());
  return finalName;
}

export async function exportEquipmentsToExcel(
  rows: AdminEquipmentExportRow[],
  filterSummary?: string,
) {
  const ExcelModule = await import('exceljs');
  const ExcelJS = ExcelModule.default || ExcelModule;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GEMA App';
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();

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

  const baseHeaders = [
    { label: '#', width: 8 },
    { label: 'Inmueble', width: 25 },
    { label: 'Código de Activo', width: 20 },
    { label: 'Tipo de Activo', width: 26 },
    { label: 'Tipo', width: 22 },
    { label: 'Subtipo', width: 22 },
    { label: 'Estado', width: 12 },
    { label: 'Configurado', width: 12 },
    { label: 'Ubicación', width: 24 },
    { label: 'Detalle Ubicación', width: 28 },
  ];

  // Group rows by Asset Type (equipmentName)
  const groupsMap = new Map<string, AdminEquipmentExportRow[]>();
  rows.forEach(r => {
    const key = (r.equipmentName || r.tipo || 'Sin Tipo').trim();
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(r);
  });

  // Helper to calculate active tech fields for a set of rows
  const getActiveTechFields = (subsetRows: AdminEquipmentExportRow[]): TechFieldConfig[] => {
    const presentKeys = new Set<string>();
    subsetRows.forEach(r => {
      if (r.technicalDetails) {
        Object.entries(r.technicalDetails).forEach(([k, v]) => {
          if (v !== null && v !== undefined && String(v).trim() !== '') {
            presentKeys.add(k);
          }
        });
      }
    });

    const sorted = Array.from(presentKeys).sort((a, b) => {
      const idxA = ALL_TECHNICAL_FIELDS.findIndex(f => f.key === a);
      const idxB = ALL_TECHNICAL_FIELDS.findIndex(f => f.key === b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sorted.map(key => {
      const predefined = ALL_TECHNICAL_FIELDS.find(f => f.key === key);
      const label = predefined ? predefined.label : formatHeaderLabel(key);
      return {
        key,
        label,
        width: predefined ? predefined.width : Math.max(16, label.length + 4),
      };
    });
  };

  // Helper function to render a structured equipment table sheet
  const renderEquipmentSheet = (
    sheetName: string,
    subsetRows: AdminEquipmentExportRow[],
    techFields: TechFieldConfig[],
  ) => {
    const safeName = getSafeSheetName(sheetName, usedSheetNames);
    const worksheet = workbook.addWorksheet(safeName, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    });

    const hasCompSummary = subsetRows.some(
      r => r.componentesResumen && r.componentesResumen.trim() !== '',
    );

    const headers = [
      ...baseHeaders,
      ...techFields.map(f => ({ label: f.label, width: f.width })),
    ];

    if (hasCompSummary) {
      headers.push({ label: 'Resumen Componentes / ITGs', width: 35 });
    }

    worksheet.columns = headers.map(h => ({ width: h.width }));
    const totalCols = headers.length;
    const colLetterTo = getColLetter(totalCols);

    // Table Headers (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;

    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h.label;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF07352F' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: idx === 0 || idx === 2 || idx === 6 || idx === 7 ? 'center' : 'left',
      };
      cell.border = headerBorder;
    });

    // Table Data Rows (Row 2+)
    subsetRows.forEach((row, index) => {
      const rowIndex = 2 + index;
      const dataRow = worksheet.getRow(rowIndex);
      dataRow.height = 22;

      const values: (string | number)[] = [
        index + 1,
        row.propertyName || 'Sin inmueble',
        row.codigo || '-',
        row.equipmentName || 'Sin tipo',
        row.tipo ? mapTipoLabel(row.tipo) : '-',
        row.subtipo ? mapTipoLabel(row.subtipo) : '-',
        row.estatus || '-',
        row.config ? 'Sí' : 'No',
        row.ubicacion || '-',
        row.detalle_ubicacion || '-',
      ];

      techFields.forEach(tf => {
        const val = row.technicalDetails?.[tf.key];
        values.push(
          val !== null && val !== undefined && String(val).trim() !== ''
            ? String(val)
            : '-',
        );
      });

      if (hasCompSummary) {
        values.push(row.componentesResumen || '-');
      }

      const isZebra = index % 2 === 1;
      const rowFillColor = isZebra ? 'FFF4F8F6' : 'FFFFFFFF';

      values.forEach((val, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        cell.value = val;
        cell.font = {
          name: 'Calibri',
          size: 10.5,
          bold: colIdx === 2,
          color: { argb: colIdx === 2 ? 'FF0F172A' : 'FF334155' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowFillColor },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal:
            colIdx === 0 || colIdx === 2 || colIdx === 6 || colIdx === 7
              ? 'center'
              : 'left',
        };
        cell.border = thinBorder;
      });
    });

    // AutoFilter
    const lastRowIndex = 1 + subsetRows.length;
    worksheet.autoFilter = {
      from: 'A1',
      to: `${colLetterTo}${lastRowIndex}`,
    };

    // Auto Column Widths
    worksheet.columns.forEach((col, colIdx) => {
      let maxLen = headers[colIdx]?.width || 12;
      if (colIdx === 0) {
        col.width = 8;
        return;
      }
      subsetRows.forEach(r => {
        const rowVal = getRowValForLength(r, colIdx, techFields, hasCompSummary);
        if (rowVal) {
          maxLen = Math.max(maxLen, String(rowVal).length + 3);
        }
      });
      col.width = Math.min(maxLen, 55);
    });
  };

  // 1. CREATE MAIN SUMMARY TAB ("Resumen General")
  const allTechFields = getActiveTechFields(rows);
  const summaryTechFields = groupsMap.size === 1 ? allTechFields : [];
  renderEquipmentSheet(
    'Resumen General',
    rows,
    summaryTechFields,
  );

  // 2. CREATE SEPARATE TABS FOR EACH ASSET TYPE
  groupsMap.forEach((groupRows, groupName) => {
    const typeTechFields = getActiveTechFields(groupRows);
    renderEquipmentSheet(
      groupName,
      groupRows,
      typeTechFields,
    );
  });

  // 3. CREATE SHEET ("Detalle Componentes & ITGs") IF DETAILED ITGS OR COMPONENTS EXIST
  const hasDetailedComponents = rows.some(r => {
    const detail = r.rawDetail;
    if (!detail) return false;
    const hasItgs = Array.isArray(detail.itgs) && detail.itgs.length > 0;
    const hasComps = Array.isArray(detail.componentes) && detail.componentes.length > 0;
    return hasItgs || hasComps;
  });

  if (hasDetailedComponents) {
    const safeDetailName = getSafeSheetName('Detalle Componentes & ITGs', usedSheetNames);
    const detailSheet = workbook.addWorksheet(safeDetailName, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    });

    const compHeaders = [
      { label: '#', width: 8 },
      { label: 'Inmueble', width: 22 },
      { label: 'Código Activo', width: 18 },
      { label: 'Categoría', width: 22 },
      { label: 'Ubicación', width: 20 },
      { label: 'Grupo / ITG Alimentador', width: 22 },
      { label: 'Sub-Alimentado', width: 22 },
      { label: 'Elemento / Interruptor (ITM)', width: 24 },
      { label: 'Tipo', width: 12 },
      { label: 'Fases', width: 10 },
      { label: 'Amperaje', width: 12 },
      { label: 'Circuito Alimentado', width: 24 },
      { label: 'Tipo Cable', width: 16 },
      { label: 'Diámetro Cable', width: 16 },
      { label: 'Diferencial', width: 18 },
    ];

    detailSheet.columns = compHeaders.map(h => ({ width: h.width }));

    // Header Row (Row 1)
    const compHeaderRow = detailSheet.getRow(1);
    compHeaderRow.height = 24;
    compHeaders.forEach((h, idx) => {
      const cell = compHeaderRow.getCell(idx + 1);
      cell.value = h.label;
      cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D4F46' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: idx === 0 || idx === 2 || idx === 8 || idx === 9 || idx === 10 ? 'center' : 'left',
      };
      cell.border = headerBorder;
    });

    let compRowIndex = 2;
    let seq = 1;

    rows.forEach(r => {
      const detail = r.rawDetail;
      if (!detail) return;

      // Render ITGs & ITMs
      if (Array.isArray(detail.itgs)) {
        detail.itgs.forEach((itg: any, itgIdx: number) => {
          const itgLabel = itg.prefijo || `ITG-${itgIdx + 1}`;
          const itgFeed = itg.suministra || '-';

          if (Array.isArray(itg.itms) && itg.itms.length > 0) {
            itg.itms.forEach((itm: any) => {
              const row = detailSheet.getRow(compRowIndex);
              row.height = 20;

              const diffStr = itm.diferencial?.existe
                ? `${itm.diferencial.amperaje ? `${itm.diferencial.amperaje}A` : 'Sí'} (${itm.diferencial.fases || ''})`
                : 'No';

              const vals = [
                seq++,
                r.propertyName || 'Sin inmueble',
                r.codigo || '-',
                r.equipmentName || '-',
                r.ubicacion || '-',
                itgLabel,
                itgFeed,
                itm.nombre || itm.id || 'ITM',
                itm.tipo || 'ITM',
                itm.fases || '-',
                itm.amperaje ? `${itm.amperaje}A` : '-',
                itm.suministra || '-',
                itm.tipo_cable || '-',
                itm.diametro_cable || '-',
                diffStr,
              ];

              vals.forEach((v, cIdx) => {
                const cell = row.getCell(cIdx + 1);
                cell.value = v;
                cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: seq % 2 === 0 ? 'FFF4F8F6' : 'FFFFFFFF' },
                };
                cell.alignment = {
                  vertical: 'middle',
                  horizontal: cIdx === 0 || cIdx === 2 || cIdx === 8 || cIdx === 9 || cIdx === 10 ? 'center' : 'left',
                };
                cell.border = thinBorder;
              });

              compRowIndex++;
            });
          } else {
            // ITG without inner ITMs
            const row = detailSheet.getRow(compRowIndex);
            row.height = 20;
            const vals = [
              seq++,
              r.propertyName || 'Sin inmueble',
              r.codigo || '-',
              r.equipmentName || '-',
              r.ubicacion || '-',
              itgLabel,
              itgFeed,
              'General',
              'ITG',
              itg.fases || '-',
              itg.amperaje ? `${itg.amperaje}A` : '-',
              itgFeed,
              itg.tipo_cable || '-',
              itg.diametro_cable || '-',
              '-',
            ];

            vals.forEach((v, cIdx) => {
              const cell = row.getCell(cIdx + 1);
              cell.value = v;
              cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: seq % 2 === 0 ? 'FFF4F8F6' : 'FFFFFFFF' },
              };
              cell.alignment = {
                vertical: 'middle',
                horizontal: cIdx === 0 || cIdx === 2 || cIdx === 8 || cIdx === 9 || cIdx === 10 ? 'center' : 'left',
              };
              cell.border = thinBorder;
            });

            compRowIndex++;
          }
        });
      }

      // Render Componentes list
      if (Array.isArray(detail.componentes)) {
        detail.componentes.forEach((comp: any) => {
          const compGroup = comp.tipo || 'Componente';
          if (Array.isArray(comp.items)) {
            comp.items.forEach((item: any) => {
              const row = detailSheet.getRow(compRowIndex);
              row.height = 20;
              const vals = [
                seq++,
                r.propertyName || 'Sin inmueble',
                r.codigo || '-',
                r.equipmentName || '-',
                r.ubicacion || '-',
                compGroup,
                '-',
                item.codigo || 'Elemento',
                'Comp',
                '-',
                '-',
                item.suministra || '-',
                '-',
                '-',
                '-',
              ];

              vals.forEach((v, cIdx) => {
                const cell = row.getCell(cIdx + 1);
                cell.value = v;
                cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: seq % 2 === 0 ? 'FFF4F8F6' : 'FFFFFFFF' },
                };
                cell.alignment = {
                  vertical: 'middle',
                  horizontal: cIdx === 0 || cIdx === 2 || cIdx === 8 || cIdx === 9 || cIdx === 10 ? 'center' : 'left',
                };
                cell.border = thinBorder;
              });

              compRowIndex++;
            });
          }
        });
      }
    });

    detailSheet.autoFilter = {
      from: 'A1',
      to: `O${compRowIndex - 1}`,
    };
  }

  // 4. GENERATE AND TRIGGER DOWNLOAD
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
