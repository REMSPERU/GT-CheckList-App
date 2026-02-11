import { MaintenanceSessionReport } from './types';
import { formatDate } from './utils';

/**
 * Generate a Protocol Page listing all tableros and their protocol checklist results
 * Uses manual pagination to ensure consistent headers and footers on every page.
 */
export function generateProtocolPageHTML(
  data: MaintenanceSessionReport,
): string {
  const serviceDate = formatDate(data.serviceDate, 'short');
  const totalEquipments = data.equipments.length;

  // Define keys to display in columns
  const protocolKeys = [
    { key: 'tablero_sin_oxido', column: 'Tablero sin óxido' },
    { key: 'puerta_mandil_aterrados', column: 'Puerta y Mandil aterrados' },
    { key: 'cables_libres_halogenos', column: 'Cables libre de halógeno' },
    { key: 'identificacion_fases', column: 'Identificación de fases' },
    { key: 'interruptores_terminales', column: 'Interruptores con terminales' },
    {
      key: 'linea_tierra_correcta',
      column: 'Línea a tierra de color amarillo o verde',
    },
    {
      key: 'diagrama_unifilar_actualizado',
      column: 'Diagrama unifilar y directorio actualizado',
    },
    { key: 'luz_emergencia', column: 'Cuenta con Luz de emergencia' },
    { key: 'rotulado_circuitos', column: 'Rotulado de circuitos' },
    {
      key: 'interruptores_riel_din',
      column: 'Cuenta con interruptores riel DIN',
    },
  ];

  // CONSTANTS FOR PAGINATION
  // Start with a safe number. Since we want a fixed footer on EVERY page,
  // we need to reserve space for it.
  // Landscape A4 is ~794px height (at 96 DPI) or ~210mm.
  // We need to experiment, but let's try 12 rows per page to allow space for header/footer.
  // User asked for "tabla mas pequeña para que quepan mucho mas filas".
  // If we reduce font size significantly, maybe we can fit 15-18 rows.
  // UPDATE: With 5.5px font and tight padding, we can fit more.
  const ROWS_PER_PAGE = 22;

  const pages: string[] = [];
  const chunkedEquipments = [];

  if (totalEquipments === 0) {
    chunkedEquipments.push([]);
  } else {
    for (let i = 0; i < totalEquipments; i += ROWS_PER_PAGE) {
      chunkedEquipments.push(data.equipments.slice(i, i + ROWS_PER_PAGE));
    }
  }

  // Helper to generate the header HTML (repeated on every page)
  const renderHeader = () => `
    <div class="protocol-top">
      <div class="protocol-brand">
        <div class="brand-title">PROPIEDAD ELITE S.R.L.</div>
        <div class="brand-sub">DIVISIÓN ELÉCTRICA</div>
      </div>
      <div class="protocol-contact">
        <div><strong>RUC:</strong> 20538436209</div>
        <div><strong>Teléfono:</strong> (511) 979351357</div>
        <div><strong>Correo:</strong> Gianmarco.Isique@rems.pe</div>
      </div>
    </div>

    <div class="protocol-band">
      <div class="protocol-band-text">
        PROTOCOLO DE MANTENIMIENTO PREVENTIVO DE TABLEROS ELÉCTRICOS
      </div>
    </div>

    <div class="protocol-meta compact-meta">
      <div class="meta-row">
        <span><strong>CLIENTE:</strong> ${data.clientName}</span>
        <span><strong>FECHA:</strong> ${serviceDate}</span>
      </div>
      <div class="meta-row">
        <span><strong>SEDE:</strong> ${data.locationName}</span>
        <span><strong>DIRECCIÓN:</strong> ${data.address}</span>
      </div>
      <div class="meta-row">
        <span><strong>EQUIPO:</strong> ${data.measurementInstrument?.name || '-'} (${data.measurementInstrument?.brand || '-'})</span>
        <span><strong>TOTAL TABLEROS:</strong> ${totalEquipments}</span>
      </div>
    </div>
  `;

  // Helper to generate footer HTML (repeated on every page)
  const renderFooter = (pageIndex: number, totalPages: number) => `
    <div class="protocol-footer">
       <div class="protocol-signatures">
        <table class="sig-table">
          <thead>
            <tr>
              <th style="width: 50%;">CONTROL DE CALIDAD</th>
              <th style="width: 50%;">PROTOCOLO REALIZADO POR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="sig-name">Ing. Gabriel E. Flores Mera</div>
                <div class="sig-role">CIP 76028 - Ing. Electricista</div>
              </td>
              <td>
                <div class="sig-name">Gianmarco Isique Neosup</div>
                <div class="sig-role">Jefe de Servicios Eléctricos</div>
              </td>
            </tr>
            <tr>
              <td style="height:50px; vertical-align:bottom;">
                <div style="border-top:1px solid #111; margin:0 20px;"></div>
              </td>
              <td style="height:50px; vertical-align:bottom;">
                <div style="border-top:1px solid #111; margin:0 20px;"></div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="sig-validity">
          EL PRESENTE CERTIFICADO TIENE VIGENCIA DE 3 MESES
        </div>
        <div class="page-number">
          Página ${pageIndex + 1} de ${totalPages}
        </div>
      </div>
    </div>
  `;

  // Loop through chunks and create pages
  chunkedEquipments.forEach((equipmentsChunk, index) => {
    // PAD ROWS if it's the last page
    const rowsToRender = [...equipmentsChunk];
    while (rowsToRender.length < ROWS_PER_PAGE) {
      rowsToRender.push(null as any); // Marker for empty row
    }

    const tableRows = rowsToRender
      .map(eq => {
        if (!eq) {
          // Render empty filler row
          return `
          <tr class="empty-row">
            <td>&nbsp;</td><td></td><td></td><td></td><td></td>
            ${protocolKeys.map(() => `<td></td>`).join('')}
            <td></td>
          </tr>
         `;
        }

        const protocol = eq.protocol || {};
        return `
        <tr>
          <td>${eq.type.substring(0, 3).toUpperCase()}</td>
          <td class="text-left">${eq.label}</td>
          <td>${eq.model || 'ADOSADO'}</td>
          <td>${eq.location}</td>
          <td>${eq.voltage ? `${eq.voltage}V` : '-'}</td>
          ${protocolKeys
            .map(pk => {
              const val = protocol[pk.key];
              return `<td class="text-center">${val === true ? '✓' : val === false ? 'X' : '-'}</td>`;
            })
            .join('')}
          <td class="text-xs">${eq.observations || '-'}</td>
        </tr>
      `;
      })
      .join('');

    const pageContent = `
      <div class="page protocol-page active-page">
        <div class="landscape-container">
          ${renderHeader()}
          
          <div class="table-container">
            <table class="protocol-table">
              <thead>
                <tr>
                  <th style="width:3%">TIPO</th>
                  <th style="width:10%">TABLERO</th>
                  <th style="width:6%">MODELO</th>
                  <th style="width:8%">UBICACIÓN</th>
                  <th style="width:4%">Medición de voltaje</th>
                  ${protocolKeys.map(pk => `<th>${pk.column}</th>`).join('')}
                  <th style="width:8%">Comentarios </th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          ${renderFooter(index, chunkedEquipments.length)}
        </div>
      </div>
    `;

    pages.push(pageContent);
  });

  return pages.join('');
}
