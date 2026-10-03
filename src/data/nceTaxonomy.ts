import { NoteDefinition } from '../types';

export const NCE_NOTE_DEFINITIONS: NoteDefinition[] = [
  {
    noteNumber: 1,
    name: 'Brief about the Entity',
    statement: 'BalanceSheet',
    nature: 'Equity',
    description: 'Corporate/Entity overview, domicile, legal constitution (Partnership/Proprietorship), registration particulars, and commercial activities.',
    subCategories: ['Entity Information', 'Level of Non-Corporate Entity (Level II/III/IV)', 'Reporting Framework'],
  },
  {
    noteNumber: 2,
    name: 'Significant Accounting Policies',
    statement: 'BalanceSheet',
    nature: 'Equity',
    description: 'Basis of accounting (Accrual/Historical Cost), compliance with Accounting Standards (AS), PPE valuation, Depreciation methods, Revenue recognition, Inventory valuation (AS-2), Employee benefits (AS-15), Taxes on Income (AS-22).',
    subCategories: [
      '2.1 Basis of Preparation of Financial Statements',
      '2.2 Use of Estimates',
      '2.3 Property, Plant and Equipment (PPE) & Capital WIP',
      '2.4 Depreciation and Amortization',
      '2.5 Revenue Recognition',
      '2.6 Valuation of Inventories',
      '2.7 Employee Benefits',
      '2.8 Borrowing Costs',
      '2.9 Taxes on Income',
      '2.10 Provisions, Contingent Liabilities and Contingent Assets',
      '2.11 Foreign Currency Transactions',
      '2.12 Operating Leases',
      '2.13 Cash and Cash Equivalents',
      "2.14 Partners' Remuneration and Interest on Capital",
      '2.15 Events Occurring After Balance Sheet Date',
      '2.16 Prior Period and Extraordinary Items',
      '2.17 Government Grants and Subsidies',
    ],
    mandatoryDisclosures: [
      "2.1 Basis of Preparation of Financial Statements: The financial statements of the entity have been prepared under the historical cost convention on an accrual basis of accounting in accordance with Generally Accepted Accounting Principles in India (Indian GAAP) and comply in all material respects with the mandatory Accounting Standards (AS) issued by the Institute of Chartered Accountants of India (ICAI) and the ICAI Guidance Note on Financial Statements of Non-Corporate Entities, to the extent applicable. Accounting policies have been consistently applied by the entity except where otherwise stated.",
      "2.2 Use of Estimates: The preparation of financial statements in conformity with Indian GAAP requires management to make judgments, estimates, and assumptions that affect the reported amounts of revenues, expenses, assets, and liabilities, and disclosure of contingent liabilities at the end of the reporting period. Although these estimates are based upon management's best knowledge of current events and actions, actual results could differ from these estimates. Revisions to accounting estimates are recognized prospectively in current and future periods.",
      "2.3 Property, Plant and Equipment (PPE) & Capital Work-in-Progress (AS 10): Tangible Property, Plant and Equipment are stated at cost of acquisition or construction less accumulated depreciation and accumulated impairment losses, if any. Cost comprises purchase price, import duties, non-refundable taxes, freight, borrowing costs directly attributable to qualifying assets, and any directly attributable costs of bringing the asset to its working condition for its intended use. Subsequent expenditures are capitalized only if they increase future economic benefits. Capital work-in-progress comprises the cost of assets not ready for their intended use at the reporting date.",
      "2.4 Depreciation and Amortization (AS 10 & ICAI Guidelines): Depreciation on Property, Plant and Equipment is provided on the Written Down Value (WDV) / Straight Line Method (SLM) over the estimated useful lives of the assets determined by the management in accordance with ICAI guidance for non-corporate entities. Depreciation is calculated on a pro-rata basis from the date of addition or up to the date of disposal. Assets costing ₹5,000 or less are fully depreciated in the year of acquisition. Intangible assets are amortized on a straight-line basis over their estimated economic useful life.",
      "2.5 Revenue Recognition (AS 9): Revenue is recognized to the extent that it is probable that economic benefits will flow to the entity and the revenue can be reliably measured. Revenue from sale of goods is recognized when significant risks and rewards of ownership have transferred to the buyer, usually on delivery or dispatch, net of sales returns, trade discounts, volume rebates, and Goods and Services Tax (GST). Revenue from services is recognized on completion of performance obligations. Interest income is recognized on a time-proportion basis taking into account the principal outstanding and applicable interest rate. Other incomes are recognized on accrual basis.",
      "2.6 Valuation of Inventories (AS 2): Inventories comprising raw materials, work-in-progress, finished goods, stock-in-trade, and stores & spares are valued at the lower of cost and net realizable value. Cost is computed on a First-In-First-Out (FIFO) or Weighted Average basis. Cost of finished goods and WIP includes raw materials, direct labour, and an appropriate allocation of fixed and variable production overheads incurred in bringing inventory to its present location and condition. Net realizable value represents the estimated selling price in the ordinary course of business less estimated completion and selling costs.",
      "2.7 Employee Benefits (AS 15): Short-term employee benefits (salaries, wages, bonus, ex-gratia) are recognized as an expense in the Statement of Profit and Loss in the period in which the employee renders the related services. Contributions to government-administered Provident Fund (PF) and Employee State Insurance (ESIC) are recognized on an accrual basis when due. Gratuity and leave encashment liabilities, where applicable based on employee thresholds and entity level classification, are provided in accordance with AS 15.",
      "2.8 Borrowing Costs (AS 16): Borrowing costs directly attributable to the acquisition, construction, or production of qualifying assets (assets that necessarily take a substantial period of time to get ready for their intended use or sale) are capitalized as part of the cost of the respective asset. All other borrowing costs, including bank interest, cash credit (CC/OD) interest, finance charges, and loan processing fees, are expensed in the Statement of Profit and Loss in the period in which they are incurred.",
      "2.9 Taxes on Income (AS 22): Tax expense comprises current tax and deferred tax. Current tax is measured as the amount expected to be paid to the tax authorities in accordance with the provisions of the Income Tax Act, 1961. Deferred tax is recognized on timing differences between taxable income and accounting income originating in one period and capable of reversal in subsequent periods, subject to prudence. Deferred tax assets are recognized and carried forward only to the extent there is reasonable certainty that sufficient future taxable income will be available against which such deferred tax assets can be realized.",
      "2.10 Provisions, Contingent Liabilities and Contingent Assets (AS 29): A provision is recognized when the entity has a present obligation as a result of past events, it is probable that an outflow of resources embodying economic benefits will be required to settle the obligation, and a reliable estimate can be made. Contingent liabilities are disclosed in the notes to accounts where an outflow of resources is possible. Contingent assets are neither recognized nor disclosed in the financial statements.",
      "2.11 Foreign Currency Transactions (AS 11): Transactions in foreign currencies are recorded at exchange rates prevailing on the transaction date. Monetary assets and liabilities denominated in foreign currencies at the balance sheet date are translated at closing exchange rates, with resulting exchange differences recognized in the Statement of Profit and Loss.",
      "2.12 Operating Leases (AS 19): Leases where the lessor effectively retains substantially all risks and rewards of ownership are classified as operating leases. Lease rentals are recognized as an expense in the Statement of Profit and Loss on a straight-line basis over the lease term.",
      "2.13 Cash and Cash Equivalents (AS 3): Cash and cash equivalents comprise cash on hand, bank balances in current and savings accounts, and highly liquid short-term fixed deposits with an original maturity of three months or less.",
      "2.14 Partners' Remuneration and Interest on Capital: Remuneration to working partners and interest on partners' capital/current accounts are provided in accordance with the terms of the valid Partnership Deed and subject to the permissible limits and provisions specified under Section 40(b) of the Income Tax Act, 1961.",
      "2.15 Events Occurring After Balance Sheet Date (AS 4): Assets and liabilities are adjusted for events occurring after the balance sheet date that provide additional evidence to assist estimation of amounts relating to conditions existing at the balance sheet date. Significant non-adjusting events are disclosed in the notes.",
      "2.16 Prior Period and Extraordinary Items (AS 5): Prior period items arising from errors or omissions in prior periods and extraordinary items outside ordinary activities are separately disclosed in the Statement of Profit and Loss.",
      "2.17 Government Grants and Subsidies (AS 12): Government grants and subsidies are recognized when there is reasonable assurance of compliance with attached conditions and receipt. Capital grants are adjusted against asset costs or deferred income; revenue grants are credited to Profit and Loss."
    ]
  },
  {
    noteNumber: 3,
    name: "Owners' Capital Account",
    statement: 'BalanceSheet',
    nature: 'Equity',
    description: 'Capital contributions, partner current accounts, drawings, profit sharing ratio, interest on capital, and partners remuneration for the year.',
    subCategories: ["Partners' Fixed Capital", "Partners' Current Account", "Proprietor's Capital", "Drawings Account", "Opening Profit / Loss Account Balance", "Share of Profit / Loss", "Remuneration for the Year", "Interest for the Year"],
    mandatoryDisclosures: ["Reconciliation of Capital at beginning and end of reporting period", "Name of each partner and profit sharing ratio (%)", "Capital introduced and withdrawals during the year"],
  },
  {
    noteNumber: 4,
    name: 'Reserves and Surplus',
    statement: 'BalanceSheet',
    nature: 'Equity',
    description: 'Capital Reserve, Revaluation Reserve, Other Reserves, and Undistributed Surplus (Balance from Statement of Profit and Loss).',
    subCategories: ['(a) Capital Reserve', '(b) Revaluation Reserve', '(c) Other Reserve', '(d) Undistributed Surplus (Balance from statement of profit and loss)'],
  },
  {
    noteNumber: 5,
    name: 'Borrowings (Long Term & Short Term)',
    statement: 'BalanceSheet',
    nature: 'Liability',
    description: 'Secured & Unsecured borrowings: Term loans from banks & other parties, Loans repayable on demand (Bank CC / Overdraft), Deferred payment liabilities, Loans and advances from related parties, Finance lease obligations.',
    subCategories: [
      'Secured - Term loans from banks',
      'Secured - Term loans from other parties',
      'Secured - Loans repayable on demand (from banks - CC/OD)',
      'Secured - Loans repayable on demand (from other parties)',
      'Secured - Deferred payment liabilities',
      'Secured - Loans and advances from related parties',
      'Secured - Long term/current maturities of finance lease obligation',
      'Unsecured - Term loans from banks',
      'Unsecured - Term loans from other parties',
      'Unsecured - Loans repayable on demand',
      'Unsecured - Loans and advances from related parties',
    ],
    mandatoryDisclosures: [
      'Nature of the Security to be specified separately for each loan',
      'Terms of repayment of term loans and other loans shall be stated',
      'Where loans guaranteed by partners/proprietor, aggregate of such amount under each head shall be disclosed',
    ],
  },
  {
    noteNumber: 6,
    name: 'Deferred Tax Liabilities/(Asset) (Net)',
    statement: 'BalanceSheet',
    nature: 'Liability',
    description: 'Deferred tax assets (expenses allowable on payment basis, provision for doubtful debts, difference between book and tax depreciation) and Deferred tax liabilities (timing differences on depreciation).',
    subCategories: [
      'Deferred Tax Asset - Expenses allowable on payment basis',
      'Deferred Tax Asset - Provision for doubtful debts',
      'Deferred Tax Asset - Difference between book depreciation & tax depreciation',
      'Deferred Tax Liability - Difference between book depreciation & tax depreciation',
      'Gross Deferred Tax Asset (A)',
      'Gross Deferred Tax Liability (B)',
      'Net Deferred Tax Liability / (Asset) (B-A)',
    ],
  },
  {
    noteNumber: 7,
    name: 'Other Long-Term Liabilities',
    statement: 'BalanceSheet',
    nature: 'Liability',
    description: 'Advance from customers (long-term tenure), security deposits received, and retention money.',
    subCategories: ['Advance from customers (Long-term)', 'Trade deposits received', 'Other long-term liabilities'],
  },
  {
    noteNumber: 8,
    name: 'Provisions (Long Term & Short Term)',
    statement: 'BalanceSheet',
    nature: 'Liability',
    description: 'Long-term and short-term provisions: (a) Provision for employee benefits (Gratuity, Leave Encashment), (b) Other provisions (Provision for Income Tax net of advance tax, warranties, sales returns).',
    subCategories: [
      'Long-term - Provision for gratuity',
      'Long-term - Provision for leave encashment',
      'Short-term - Provision for employee benefits',
      'Short-term - Provision for Income tax (net of advance tax)',
      'Short-term - Other Provisions (warranties / sales return)',
    ],
  },
  {
    noteNumber: 9,
    name: 'Trade Payables',
    statement: 'BalanceSheet',
    nature: 'Liability',
    description: '(a) Total outstanding dues of micro, small and medium enterprises (MSME), (b) Total outstanding dues of creditors other than micro, small and medium enterprises.',
    subCategories: [
      '(a) Total outstanding dues of micro, small and medium enterprises',
      '(b) Total outstanding dues of creditors other than micro, small and medium enterprises',
      'Creditors for Goods & Raw Materials',
      'Creditors for Expenses & Sub-contracting',
    ],
    mandatoryDisclosures: [
      'Disclosure relating to suppliers registered under MSMED Act (Clauses a to e: principal, interest, delayed payments)',
      'Ageing schedule (< 1 year, 1-2 years, 2-3 years, > 3 years)',
    ],
  },
  {
    noteNumber: 10,
    name: 'Other Current Liabilities',
    statement: 'BalanceSheet',
    nature: 'Liability',
    description: '(a) Current maturities of finance lease obligations, (b) Interest accrued but not due, (c) Interest accrued and due, (d) Income received in advance, (e) Unearned revenue, (f) Goods and Service tax payable, (g) TDS payable, (h) Other payables.',
    subCategories: [
      '(a) Current maturities of finance lease obligations',
      '(b) Interest accrued but not due on borrowings',
      '(c) Interest accrued and due on borrowings',
      '(d) Income received in advance',
      '(e) Unearned revenue',
      '(f) Goods and Service tax payable (CGST/SGST/IGST)',
      '(g) TDS payable',
      '(h) Other payables (Salaries, Audit Fees, Electricity)',
      'Suspense / Unidentified Account (Requires CA Audit Review)',
    ],
  },
  {
    noteNumber: 11,
    name: 'Property, Plant and Equipment and Intangible Assets',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: 'Tangible assets (Freehold land, Buildings, Plant and Equipment, Office equipment, Furniture & Fixtures, Vehicles, Others) and Intangible assets (Goodwill, Software, etc.) showing Gross Block, Additions, Deductions, Depreciation, and Net Block; Capital Work in Progress & Intangible assets under development.',
    subCategories: [
      'Freehold land',
      'Buildings',
      'Plant and Equipment',
      'Office equipment',
      'Furniture & Fixtures',
      'Vehicles',
      'Accumulated Depreciation',
      'Capital Work in Progress',
      'Intangible assets under development',
      'Intangible Assets - Computer Software & Licenses',
    ],
    mandatoryDisclosures: [
      'Depreciation method (WDV / SLM)',
      'Reconciliation of gross block and accumulated depreciation at beginning and end of period',
      'Assets under lease to be separately specified under each class of asset',
    ],
  },
  {
    noteNumber: 12,
    name: 'Investments - Non Current and Current',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: 'Non-current and current investments: Quoted & Unquoted Trade investments (in other entities, partnership firms) and Other investments (equity shares, preference shares, government securities, debentures/bonds, mutual funds, investment property).',
    subCategories: [
      'Non-Current - Government or trust securities (NSC/KVP)',
      'Non-Current - Investments in partnership firm',
      'Non-Current - Investments in equity instruments',
      'Non-Current - Investments in debentures or bonds',
      'Current - Investments in mutual funds (liquid)',
      'Current - Current maturities of long-term investments',
    ],
    mandatoryDisclosures: [
      'Aggregate market value of quoted investments',
      'Aggregate amount of unquoted investments',
      'Details of investment in partnership firm (Name of partner with % share in profits)',
    ],
  },
  {
    noteNumber: 13,
    name: 'Loans and Advances (Long Term & Short Term)',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: 'Secured & Unsecured: Capital advances, Loans and advances to partners or relatives of partners, Other loans and advances (Prepaid expenses, Advance tax/TDS, GST input credit receivable, Security deposits, Balance with government authorities).',
    subCategories: [
      'Secured - Capital advances (Considered good)',
      'Unsecured - Loans advances to partners or relative of partners',
      'Other - GST input credit receivable (CGST, SGST, IGST)',
      'Other - Advance tax and tax deducted at source (TDS)',
      'Other - Prepaid expenses',
      'Other - Security Deposits with government/utilities',
      'Other - Balance with government authorities',
    ],
  },
  {
    noteNumber: 14,
    name: 'Other Non-Current Assets',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: '(a) Security Deposits (long-term), (b) Prepaid expenses, (c) Bank deposits maturing after 12 months, (d) Others.',
    subCategories: ['(a) Security Deposits', '(b) Prepaid expenses', '(c) Bank deposits maturing after 12 months', '(d) Others'],
  },
  {
    noteNumber: 15,
    name: 'Inventories',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: '(a) Raw materials, (b) Work-in-progress, (c) Finished goods, (d) Stock-in-trade, (e) Stores and spares, (f) Loose Tools, (g) Others. Valued at lower of cost and net realizable value (AS-2).',
    subCategories: [
      '(a) Raw materials',
      '(b) Work-in-progress',
      '(c) Finished goods',
      '(d) Stock-in-trade',
      '(e) Stores and spares',
      '(f) Loose Tools',
      '(g) Others / Packing materials',
    ],
    mandatoryDisclosures: [
      'Mode of valuation (FIFO / Weighted Average)',
      'Goods in transit to be disclosed under relevant sub-head of inventories',
    ],
  },
  {
    noteNumber: 16,
    name: 'Trade Receivables',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: 'Outstanding for a period less than 6 months from due date (Secured, Unsecured, Doubtful, Less provision), Outstanding exceeding 6 months, and Unbilled receivables.',
    subCategories: [
      'Outstanding < 6 months - Unsecured Considered good',
      'Outstanding < 6 months - Secured Considered good',
      'Outstanding > 6 months - Unsecured Considered good',
      'Outstanding > 6 months - Doubtful',
      'Less: Provision for doubtful receivables',
      'Unbilled receivables',
    ],
    mandatoryDisclosures: ['Ageing schedule of trade receivables', 'Debts due by partners or related parties'],
  },
  {
    noteNumber: 17,
    name: 'Cash and Bank Balances',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: 'A. Cash and cash equivalents: (a) On current accounts, (b) Cash credit account (Debit balance), (c) Fixed Deposits (< 3 months), (d) Cheques on hand, (e) Cash on hand. B. Other bank balances: deposits 3-12 months, margin money under lien.',
    subCategories: [
      'A. (a) On current accounts',
      'A. (b) Cash credit account (Debit balance)',
      'A. (c) Fixed Deposits (< 3 months)',
      'A. (d) Cheques, drafts on hand',
      'A. (e) Cash on hand',
      'B. Bank Deposits (maturity 3 to 12 months)',
      'B. Margin money or deposits under lien',
    ],
  },
  {
    noteNumber: 18,
    name: 'Other Current Assets',
    statement: 'BalanceSheet',
    nature: 'Asset',
    description: 'All-inclusive heading for current assets that do not fit into any other asset categories: (a) Interest accrued but not due on deposits, (b) Interest accrued and due on deposits, others.',
    subCategories: [
      '(a) Interest accrued but not due on deposits',
      '(b) Interest accrued and due on deposits',
      'Other short-term claims and assets',
    ],
  },
  {
    noteNumber: 19,
    name: 'Revenue from Operations',
    statement: 'ProfitAndLoss',
    nature: 'Income',
    description: '(a) Sale of products, (b) Sale of services, (c) Grants or donations received, (d) Other operating revenue, Less: Excise duty.',
    subCategories: [
      '(a) Sale of products',
      '(b) Sale of services',
      '(c) Grants or donations received',
      '(d) Other operating revenue',
      'Less: Excise duty / Trade Rebates',
    ],
  },
  {
    noteNumber: 20,
    name: 'Other Income',
    statement: 'ProfitAndLoss',
    nature: 'Income',
    description: '(a) Interest income, (b) Dividend income, (c) Net gain on sale of investments, (d) Other non-operating income (cash discounts, rental, asset sales).',
    subCategories: [
      '(a) Interest income (Bank FD & IT Refund)',
      '(b) Dividend income',
      '(c) Net gain on sale of investments',
      '(d) Other non-operating income (Discounts, Rent)',
    ],
  },
  {
    noteNumber: 21,
    name: 'Cost of Goods Sold',
    statement: 'ProfitAndLoss',
    nature: 'Expense',
    description: '(A) Cost of raw material consumed (Opening stock + Purchases - Closing stock) including packing and other materials, (B) Purchases of stock-in-trade, (C) Changes in inventories of finished goods, work in progress and stock-in-trade.',
    subCategories: [
      '(A) Raw material consumed',
      '(A) Packing material consumed',
      '(A) Other materials (purchased intermediates/freight)',
      '(B) Purchases of stock-in-trade',
      '(C) Changes in inventories (Opening less Closing)',
    ],
  },
  {
    noteNumber: 22,
    name: 'Employee Benefits Expense',
    statement: 'ProfitAndLoss',
    nature: 'Expense',
    description: '(Including contract labour) (a) Salaries, wages, bonus and other allowances, (b) Contribution to provident and other funds, (c) Gratuity expenses, (d) Staff welfare expenses.',
    subCategories: [
      '(a) Salaries, wages, bonus and other allowances',
      '(b) Contribution to provident and other funds',
      '(c) Gratuity expenses',
      '(d) Staff welfare expenses',
      '(e) Partners\' remuneration / Salary to partners (Disclosed at Line X of P&L)',
    ],
    mandatoryDisclosures: [
      'Separate disclosure of Partners\' remuneration on the face of P&L (Line X) and partner-wise breakup under Sec 40(b)',
    ],
  },
  {
    noteNumber: 23,
    name: 'Finance Cost',
    statement: 'ProfitAndLoss',
    nature: 'Expense',
    description: '(a) Interest expense (other than interest on partners capital): (i) On bank loan, (ii) On assets on finance lease, (b) Interest on partners capital, (c) Other borrowing costs, (d) Loss on foreign exchange transactions considered as finance cost.',
    subCategories: [
      '(a) Interest expense - On bank loan',
      '(a) Interest expense - On finance lease',
      '(b) Interest on partners capital/member capital',
      '(c) Other borrowing costs & bank charges',
      '(d) Net loss on foreign exchange considered as finance cost',
    ],
  },
  {
    noteNumber: 24,
    name: 'Depreciation and Amortization Expense',
    statement: 'ProfitAndLoss',
    nature: 'Expense',
    description: '(a) On tangible assets (Refer note 11), (b) On intangible assets (Refer note 11).',
    subCategories: [
      '(a) Depreciation on tangible assets',
      '(b) Amortization on intangible assets',
    ],
  },
  {
    noteNumber: 25,
    name: 'Other Expenses',
    statement: 'ProfitAndLoss',
    nature: 'Expense',
    description: 'Items (a) to (x): Consumption of stores & spares, Power & fuel, Rent, Repairs to Buildings & Machinery, Insurance, Rates & taxes, Labour charges, Travelling, Auditor remuneration, Printing & stationery, Communication, Legal & professional, Advertisement, Business promotion, Commission, Clearing & forwarding, Loss on asset sales, Forex loss, Provision for doubtful debts, Miscellaneous.',
    subCategories: [
      '(a) Consumption of stores and spare parts',
      '(b) Power and fuel',
      '(c) Rent',
      '(d) Repairs and maintenance - Buildings',
      '(e) Repairs and maintenance - Machinery',
      '(f) Insurance',
      '(g) Rent, Rates and taxes, excluding taxes on income',
      '(h) Labour charges',
      '(i) Travelling expenses',
      '(j) Auditor remuneration',
      '(k) Printing and stationery',
      '(l) Communication expenses',
      '(m) Legal and professional charges',
      '(n) Advertisement and publicity',
      '(o) Business promotion expenses',
      '(p) Commission',
      '(q) Clearing and forwarding charges',
      '(r) Loss on sale of Property, Plant and Equipment',
      '(s) Loss on foreign exchange transactions (net)',
      '(t) Loss on cancellation of forward contracts',
      '(u) Loss on sale of investments (net)',
      '(v) Provision for diminution in value of investments',
      '(w) Provision for doubtful debts',
      '(x) Miscellaneous expenses',
      '(y) Partners\' remuneration / Salary to partners (Disclosed at Line X of P&L)',
    ],
  },
];

export type FourPillarCategory = 'Assets' | 'Liability' | 'Income' | 'Expenditures';

export interface FourCategoryTheme {
  category: FourPillarCategory;
  label: string;
  shortLabel: string;
  statementLabel: 'Balance Sheet' | 'P & L';
  noteRange: string;
  dotClass: string;
  rowBorderClass: string;
  badgeClass: string;
  selectClass: string;
  optgroupClass: string;
  filterActiveClass: string;
  filterInactiveClass: string;
  cardBorderClass: string;
  cardHeaderBgClass: string;
  numberBadgeClass: string;
}

export function getLedgerFourCategory(noteNumber: number, nature?: string): FourPillarCategory {
  if (noteNumber >= 11 && noteNumber <= 18) return 'Assets';
  if (noteNumber >= 3 && noteNumber <= 10) return 'Liability';
  if (noteNumber >= 19 && noteNumber <= 20) return 'Income';
  if (noteNumber >= 21 && noteNumber <= 25) return 'Expenditures';

  if (nature === 'Asset') return 'Assets';
  if (nature === 'Liability' || nature === 'Equity') return 'Liability';
  if (nature === 'Income') return 'Income';
  return 'Expenditures';
}

export const FOUR_CATEGORY_THEMES: Record<FourPillarCategory, FourCategoryTheme> = {
  Assets: {
    category: 'Assets',
    label: 'Assets',
    shortLabel: 'Assets',
    statementLabel: 'Balance Sheet',
    noteRange: 'Notes 11–18',
    dotClass: 'bg-blue-500',
    rowBorderClass: 'border-l-4 border-l-blue-500',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    selectClass:
      'bg-blue-50/90 hover:bg-blue-100/70 text-blue-950 border-blue-300 hover:border-blue-400 focus:ring-blue-400 focus:border-blue-400',
    optgroupClass: 'bg-blue-50 text-blue-950 font-bold',
    filterActiveClass:
      'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/30',
    filterInactiveClass:
      'bg-blue-50/90 hover:bg-blue-100 text-blue-900 border-blue-200/90',
    cardBorderClass: 'border-slate-200 hover:border-blue-300/90',
    cardHeaderBgClass: 'bg-blue-50/40 hover:bg-blue-50/70 border-slate-200',
    numberBadgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  Liability: {
    category: 'Liability',
    label: 'Liability',
    shortLabel: 'Liability',
    statementLabel: 'Balance Sheet',
    noteRange: 'Notes 3–10',
    dotClass: 'bg-amber-500',
    rowBorderClass: 'border-l-4 border-l-amber-500',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    selectClass:
      'bg-amber-50/90 hover:bg-amber-100/70 text-amber-950 border-amber-300 hover:border-amber-400 focus:ring-amber-400 focus:border-amber-400',
    optgroupClass: 'bg-amber-50 text-amber-950 font-bold',
    filterActiveClass:
      'bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-400/30',
    filterInactiveClass:
      'bg-amber-50/90 hover:bg-amber-100 text-amber-900 border-amber-200/90',
    cardBorderClass: 'border-slate-200 hover:border-amber-300/90',
    cardHeaderBgClass: 'bg-amber-50/40 hover:bg-amber-50/70 border-slate-200',
    numberBadgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  Income: {
    category: 'Income',
    label: 'Income',
    shortLabel: 'Income',
    statementLabel: 'P & L',
    noteRange: 'Notes 19–20',
    dotClass: 'bg-emerald-500',
    rowBorderClass: 'border-l-4 border-l-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    selectClass:
      'bg-emerald-50/90 hover:bg-emerald-100/70 text-emerald-950 border-emerald-300 hover:border-emerald-400 focus:ring-emerald-400 focus:border-emerald-400',
    optgroupClass: 'bg-emerald-50 text-emerald-950 font-bold',
    filterActiveClass:
      'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/30',
    filterInactiveClass:
      'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border-emerald-200/90',
    cardBorderClass: 'border-slate-200 hover:border-emerald-300/90',
    cardHeaderBgClass: 'bg-emerald-50/40 hover:bg-emerald-50/70 border-slate-200',
    numberBadgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  Expenditures: {
    category: 'Expenditures',
    label: 'Expenditures',
    shortLabel: 'Expenditures',
    statementLabel: 'P & L',
    noteRange: 'Notes 21–25',
    dotClass: 'bg-rose-500',
    rowBorderClass: 'border-l-4 border-l-rose-500',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    selectClass:
      'bg-rose-50/90 hover:bg-rose-100/70 text-rose-950 border-rose-300 hover:border-rose-400 focus:ring-rose-400 focus:border-rose-400',
    optgroupClass: 'bg-rose-50 text-rose-950 font-bold',
    filterActiveClass:
      'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/30',
    filterInactiveClass:
      'bg-rose-50/90 hover:bg-rose-100 text-rose-900 border-rose-200/90',
    cardBorderClass: 'border-slate-200 hover:border-rose-300/90',
    cardHeaderBgClass: 'bg-rose-50/40 hover:bg-rose-50/70 border-slate-200',
    numberBadgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
  },
};

export function getNoteCategoryTheme(noteNumber: number, nature?: string): FourCategoryTheme {
  const cat = getLedgerFourCategory(noteNumber, nature);
  return FOUR_CATEGORY_THEMES[cat];
}


