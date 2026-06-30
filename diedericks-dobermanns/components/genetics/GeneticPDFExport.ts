import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

import type { ColourOutcome } from '@/lib/genetics/dobermann-colours';

export async function exportGeneticReportPdf(opts: {
  parentA: string;
  parentB: string;
  b1: string;
  b2: string;
  d1: string;
  d2: string;
  colours: ColourOutcome[];
  vwd: Record<string, number>;
}) {
  const colourRows = opts.colours
    .map(
      (c) =>
        `<tr><td><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${c.hex}"></span> ${c.name}</td><td>${(c.probability * 100).toFixed(1)}%</td></tr>`,
    )
    .join('');

  const html = `
    <html><head><style>
      body { font-family: Georgia, serif; padding: 40px; color: #1a1a1a; }
      h1 { color: #C4A35A; letter-spacing: 3px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      .bar { background: #C4A35A; height: 8px; }
      .footer { margin-top: 40px; font-size: 10px; color: #888; }
    </style></head><body>
      <h1>Diedericks Dobermanns</h1>
      <h2>Genetic Forecast Report</h2>
      <p>Generated ${format(new Date(), 'dd MMM yyyy')}</p>
      <p><strong>Parent A:</strong> ${opts.parentA} (B: ${opts.b1}, D: ${opts.d1})</p>
      <p><strong>Parent B:</strong> ${opts.parentB} (B: ${opts.b2}, D: ${opts.d2})</p>
      <h3>Offspring colour probabilities</h3>
      <table>${colourRows}</table>
      <h3>vWD risk</h3>
      <p>Clear: ${(opts.vwd.clear * 100).toFixed(1)}% · Carrier: ${(opts.vwd.carrier * 100).toFixed(1)}% · Affected: ${(opts.vwd.affected * 100).toFixed(1)}%</p>
      <p class="footer">This tool provides statistical estimates. DNA testing is recommended for confirmed genotypes.<br/>
      Diedericks Dobermanns | diedericksdobermanns.com</p>
    </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Genetic Forecast' });
  }
}
