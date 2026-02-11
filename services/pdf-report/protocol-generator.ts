import { MaintenanceSessionReport } from './types';
import { formatDate } from './utils';

/**
 * Generate a Protocol Page listing all tableros and their protocol checklist results
 */
export function generateProtocolPageHTML(
  data: MaintenanceSessionReport,
): string {
  const serviceDate = formatDate(data.serviceDate, 'short');

  // Define keys to display in columns
  const protocolKeys = [
    { key: 'tablero_sin_oxido', column: 'Tablero sin señales de óxido' },
    { key: 'puerta_mandil_aterrados', column: 'Puerta y mandil aterrados' },
    { key: 'cables_libres_halogenos', column: 'Cables libres de halógeno' },
    { key: 'identificacion_fases', column: 'Identificación de fases' },
    { key: 'interruptores_terminales', column: 'Interruptores con terminales' },
    {
      key: 'linea_tierra_correcta',
      column: 'Línea tierra color amarillo/verde',
    },
    {
      key: 'diagrama_unifilar_actualizado',
      column: 'Diagrama unifilar y directorio',
    },
    { key: 'luz_emergencia', column: 'Cuenta con luz de emergencia' },
    { key: 'rotulado_circuitos', column: 'Rotulado de los circuitos' },
    {
      key: 'interruptores_riel_din',
      column: 'Interruptores fijados en riel din',
    },
  ];

  return `
    <div class="page protocol-page">
      <div class="landscape-container">
      <div class="protocol-top">
        <div class="protocol-brand">
          <div class="brand-title">PROPIEDAD ELITE S.R.L.</div>
          <div class="brand-sub">DIVISIÓN ELÉCTRICA</div>
        </div>

        <div class="protocol-contact">
          <div><strong>RUC:</strong> 20538436209</div>
          <div><strong>Teléfono:</strong> (511) 979351357</div>
          <div><strong>Correo:</strong> Gianmarco.Isique@prems.pe</div>
        </div>
      </div>

      <div class="protocol-band">
        <div class="protocol-band-text">
          PROTOCOLO DE MANTENIMIENTO PREVENTIVO DE<br />
          TABLEROS ELÉCTRICOS
        </div>
      </div>

      <div class="protocol-meta">
        <div class="meta-left">
          <div><strong>CLIENTE:</strong> ${data.clientName}</div>
          <div><strong>REFERENCIA:</strong> ${data.locationName}</div>
          <div><strong>DIRECCIÓN:</strong> ${data.address}</div>
          <div><strong>FECHA:</strong> ${serviceDate}</div>
          <div><strong>CANTIDAD DE TABLEROS:</strong> ${data.equipments.length}</div>
          <div><strong>NORMA:</strong> CNE-U (Regla 010-010-3)</div>
        </div>

        <div class="meta-right">
          <div><strong>EQUIPO:</strong> ${data.measurementInstrument?.name || '-'}</div>
          <div><strong>MARCA:</strong> ${data.measurementInstrument?.brand || '-'}</div>
          <div><strong>MODELO:</strong> ${data.measurementInstrument?.model || '-'}</div>
        </div>
      </div>

      <table class="protocol-table">
        <thead>
          <tr>
            <th>TIPO</th>
            <th>NOMBRE DEL TABLERO</th>
            <th>MODELO</th>
            <th>UBICACIÓN</th>
            <th>VOLTAJE</th>
            ${protocolKeys.map(pk => `<th>${pk.column}</th>`).join('')}
            <th>COMENTARIOS</th>
          </tr>
        </thead>

        <tbody>
          ${data.equipments
            .map(eq => {
              const protocol = eq.protocol || {};
              return `
              <tr>
                <td>${eq.type.toUpperCase()}</td>
                <td>${eq.label}</td>
                <td>${eq.model || 'ADOSADO'}</td>
                <td>${eq.location}</td>
                <td>${eq.voltage ? `${eq.voltage}V` : '-'}</td>
                ${protocolKeys
                  .map(pk => {
                    const val = protocol[pk.key];
                    return `<td style="text-align:center;">${val === true ? '✓' : val === false ? 'X' : '-'}</td>`;
                  })
                  .join('')}
                <td>${eq.observations || '-'}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>

      <div class="protocol-signatures">
        <table class="sig-table">
          <thead>
            <tr>
              <th>CONTROL DE CALIDAD</th>
              <th>PROTOCOLO REALIZADO POR</th>
              <th>SUPERVISADO POR</th>
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
              <td>
                <div class="sig-name">Anthony Huamán Arroyo</div>
                <div class="sig-role">Supervisor</div>
              </td>
            </tr>

            <tr>
              <td style="height:90px; vertical-align:bottom;">
                <div style="border-top:1px solid #111; margin:0 10px 12px;"></div>
              </td>
              <td style="height:90px; vertical-align:bottom;">
                <div style="border-top:1px solid #111; margin:0 10px 12px;"></div>
              </td>
              <td style="height:90px; vertical-align:bottom;">
                <div style="border-top:1px solid #111; margin:0 10px 12px;"></div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="sig-validity">
          EL PRESENTE CERTIFICADO TIENE VIGENCIA DE 3 MESES
        </div>
      </div> <!-- protocol-signatures -->
      </div> <!-- landscape-container -->
    </div> <!-- page protocol-page -->
  `;
}
