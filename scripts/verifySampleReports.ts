import * as XLSXRaw from 'xlsx-js-style';
const XLSX: any = (XLSXRaw as any).default || XLSXRaw;

function inspect(file: string) {
  console.log(`\n=================== INSPECTING ${file} ===================`);
  const wb = XLSX.readFile(file);
  console.log('Sheet Names:', wb.SheetNames);

  // 1. Balance Sheet
  const bs = wb.Sheets['Balance Sheet'];
  if (bs) {
    const rows = XLSX.utils.sheet_to_json(bs, { header: 1 }) as any[][];
    console.log('\n--- Balance Sheet Banner & Top 10 Rows ---');
    rows.slice(0, 12).forEach((r, i) => console.log(`Row ${i}:`, r.filter((x: any) => x !== undefined && x !== '')));
  }

  // 2. Note 3
  const note3 = wb.Sheets['Note 3'];
  if (note3) {
    const rows = XLSX.utils.sheet_to_json(note3, { header: 1 }) as any[][];
    console.log('\n--- Note 3 Top 15 Rows ---');
    rows.slice(0, 15).forEach((r, i) => console.log(`Row ${i}:`, r.filter((x: any) => x !== undefined && x !== '')));
  }

  // 3. Notes 1 to 25
  const notesSheet = wb.Sheets['Notes 1 to 25'];
  if (notesSheet) {
    const rows = XLSX.utils.sheet_to_json(notesSheet, { header: 1 }) as any[][];
    console.log('\n--- Notes 1 to 25 Sample Disclosures ---');
    // Find Note 1, Note 9, Note 16 rows
    rows.forEach((r, idx) => {
      const lineStr = r.join(' | ');
      if (lineStr.includes('Note 1') || lineStr.includes('Note 9') || lineStr.includes('Note 16') || lineStr.includes('MSME') || lineStr.includes('Aging Schedule')) {
        console.log(`Row ${idx}:`, r.slice(0, 5));
      }
    });
  }
}

inspect('Sample_Statutory_Report_RRK_and_CO_Partnership_Firm.xlsx');
inspect('Sample_Statutory_Report_Durga_Steel_Sole_Proprietorship.xlsx');
