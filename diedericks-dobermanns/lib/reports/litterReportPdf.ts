import type { LitterReportData } from '@/hooks/useLitterReports';

const BASE = `
  body { font-family: Georgia, serif; background: #111008; color: #F5F0E8; padding: 24px; }
  h1 { color: #C4A35A; font-size: 22px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #C4A35A33; padding: 8px; font-size: 11px; text-align: left; }
  th { color: #C4A35A; }
`;

export function buildLitterReportHtml(data: LitterReportData): string {
  const { litter, dam, sire, puppies } = data;
  const rows = puppies
    .map(
      (p, i) =>
        `<tr><td>${i + 1}</td><td>${p.sex ?? '—'}</td><td>${p.name}</td><td>${p.microchip_number ?? '—'}</td><td>${p.colour ?? '—'}</td><td></td><td></td><td></td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><style>${BASE}</style></head><body>
    <h1>LITTER RECORD</h1>
    <p>Dam: ${dam?.name ?? '—'} · DOB: ${dam?.date_of_birth ?? '—'}</p>
    <p>Sire: ${sire?.name ?? '—'} · DOB: ${sire?.date_of_birth ?? '—'}</p>
    <p>Litter #: ${litter.litter_letter ?? '—'} · Males: ${litter.male_count ?? 0} · Females: ${litter.female_count ?? 0}</p>
    <table>
      <tr><th>#</th><th>Sex</th><th>Name</th><th>Microchip</th><th>Colour</th><th>Transferred</th><th>Papers</th><th>Limited</th></tr>
      ${rows}
    </table>
  </body></html>`;
}

export function buildDogReportHtml(puppy: LitterReportData['puppies'][0], data: LitterReportData): string {
  return `<!DOCTYPE html><html><head><style>${BASE}</style></head><body>
    <h1>${puppy.name}</h1>
    <p>Litter ${data.litter.litter_letter ?? '—'} · Born ${data.litter.actual_date ?? '—'}</p>
    <p>Dam: ${data.dam?.name ?? '—'} · Sire: ${data.sire?.name ?? '—'}</p>
    <p>Sex: ${puppy.sex ?? '—'} · Colour: ${puppy.colour ?? '—'} · Microchip: ${puppy.microchip_number ?? '—'}</p>
  </body></html>`;
}

export function buildPedigreeHtml(puppy: LitterReportData['puppies'][0], data: LitterReportData): string {
  return `<!DOCTYPE html><html><head><style>${BASE}</style></head><body>
    <h1>${puppy.name} — Pedigree</h1>
    <p>Breed: Dobermann Pinscher · DOB: ${data.litter.actual_date ?? '—'} · Gender: ${puppy.sex ?? '—'}</p>
    <p>Colour: ${puppy.colour ?? '—'}</p>
    <table>
      <tr><th>Generation</th><th>Name</th></tr>
      <tr><td>Sire</td><td>${data.sire?.name ?? '—'}</td></tr>
      <tr><td>Dam</td><td>${data.dam?.name ?? '—'}</td></tr>
    </table>
  </body></html>`;
}
