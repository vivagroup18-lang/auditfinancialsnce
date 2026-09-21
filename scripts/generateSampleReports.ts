import fs from 'node:fs';
import path from 'node:path';
import * as XLSXRaw from 'xlsx-js-style';
const XLSX: any = (XLSXRaw as any).default || XLSXRaw;
import { SAMPLE_DATASETS } from '../src/data/sampleTrialBalances';
import { processTrialBalance } from '../src/utils/mappingEngine';
import { computeFinancialStatements } from '../src/utils/financialCalculations';
import { buildAttractiveExcelWorkbook } from '../src/utils/excelExporter';
import { EntityConfig } from '../src/types';

const artifactDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\fd02032c-14a9-4a4b-b7ff-f09187a49e4e';
const workspaceDir = 'f:\\Google AI Studio\\auditfinancials';

async function generateSample(datasetIndex: number, outputBaseName: string) {
  const sample = SAMPLE_DATASETS[datasetIndex];
  console.log(`Generating report for: ${sample.name} (${sample.entityType})...`);

  // 1. Map CY ledgers
  const cyMapping = processTrialBalance(sample.rows);

  // 2. Map PY ledgers if available
  let pyMappingResult: any = undefined;
  if (sample.previousYearRows && sample.previousYearRows.length > 0) {
    pyMappingResult = processTrialBalance(sample.previousYearRows);
  }

  // 3. Entity Config
  const isProprietor = sample.entityType === 'Sole Proprietorship';
  const config: EntityConfig = {
    entityName: sample.name.split('(')[0].trim(),
    entityType: sample.entityType,
    financialYear: sample.financialYear || '2024-25',
    reportingPeriod: sample.reportingPeriod || 'March 31, 2025',
    previousFinancialYear: sample.previousFinancialYear || '2023-24',
    previousReportingPeriod: sample.previousReportingPeriod || 'March 31, 2024',
    currencyUnit: 'INR',
    taxRatePercent: 30,
    transferProfitTo: 'partners_capital',
    address: 'Plot No. 45, MIDC Industrial Area, Pune, Maharashtra - 411019',
    registeredAddress: 'Plot No. 45, MIDC Industrial Area, Pune, Maharashtra - 411019',
    placeOfSigning: 'Pune',
    dateOfSigning: 'September 15, 2025',
    proprietorName: isProprietor ? 'Shri Parasharam Patil' : undefined,
    auditorName: 'CA. Rajesh Sharma & Associates',
    auditorMembershipNo: '098765',
    firmRegistrationNo: '101234W',
    udin: '25098765ABCA9876',
    natureOfBusiness: isProprietor ? 'Trading in Steel, Iron, and Allied Building Materials' : 'Manufacturing & Precision Engineering Components',
    pan: isProprietor ? 'AAAPP1234A' : 'AABFR5678B',
    gstin: isProprietor ? '27AAAPP1234A1Z5' : '27AABFR5678B1Z2',
    partners: isProprietor
      ? [
          {
            name: 'Shri Parasharam Patil',
            profitSharePercent: 100,
            remunerationSharePercent: 0,
            isWorkingPartner: true,
            isDesignatedPartner: false,
            openingBalance: 4012760.34,
            capitalIntroduced: 0,
            interestOnCapital: 0,
            withdrawals: 0,
            shareOfProfit: 596388.72,
            closingBalance: 4609149.06,
          },
        ]
      : [
          {
            name: 'CA. R. R. Kulkarni',
            profitSharePercent: 50,
            remunerationSharePercent: 50,
            isWorkingPartner: true,
            isDesignatedPartner: true,
            openingBalance: 4250000,
            capitalIntroduced: 250000,
            remuneration: 600000,
            interestOnCapital: 425000,
            withdrawals: 525000,
            shareOfProfit: 0,
            closingBalance: 5000000,
          },
          {
            name: 'Er. R. K. Kulkarni',
            profitSharePercent: 50,
            remunerationSharePercent: 50,
            isWorkingPartner: true,
            isDesignatedPartner: false,
            openingBalance: 4250000,
            capitalIntroduced: 250000,
            remuneration: 600000,
            interestOnCapital: 425000,
            withdrawals: 525000,
            shareOfProfit: 0,
            closingBalance: 5000000,
          },
        ],
  };

  // 4. Calculate Financial Statements
  const statements = computeFinancialStatements(
    cyMapping.mappedLedgers,
    config,
    pyMappingResult?.mappedLedgers,
    pyMappingResult ? 'Previous Year Trial Balance' : undefined
  );

  // 5. Build Workbook
  const { wb } = buildAttractiveExcelWorkbook({
    entityConfig: config,
    balanceSheet: statements.balanceSheet,
    profitAndLoss: statements.profitAndLoss,
    noteSchedules: statements.noteSchedules,
    exceptions: cyMapping.exceptions,
    rawRows: sample.rows,
    mappedLedgers: cyMapping.mappedLedgers,
  });

  // 6. Write Excel files
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  const wsFilePath = path.join(workspaceDir, `${outputBaseName}.xlsx`);
  fs.writeFileSync(wsFilePath, buffer);
  console.log(`✓ Saved workspace file: ${wsFilePath}`);

  if (fs.existsSync(artifactDir)) {
    const artFilePath = path.join(artifactDir, `${outputBaseName}.xlsx`);
    fs.writeFileSync(artFilePath, buffer);
    console.log(`✓ Saved artifact file: ${artFilePath}`);
  }

  return {
    name: sample.name,
    entityType: sample.entityType,
    balanceSheet: statements.balanceSheet,
    profitAndLoss: statements.profitAndLoss,
    noteSchedules: statements.noteSchedules,
    sheets: wb.SheetNames,
  };
}

async function run() {
  console.log('=== GENERATING OFFICIAL ICAI COMPLIANT NCE SAMPLE REPORTS ===\n');
  const rrkResult = await generateSample(1, 'Sample_Statutory_Report_RRK_and_CO_Partnership_Firm');
  console.log('\n----------------------------------------\n');
  const durgaResult = await generateSample(0, 'Sample_Statutory_Report_Durga_Steel_Sole_Proprietorship');
  console.log('\n✓ Both sample reports successfully generated.');
}

run().catch((err) => {
  console.error('Error generating sample report:', err);
  process.exit(1);
});
