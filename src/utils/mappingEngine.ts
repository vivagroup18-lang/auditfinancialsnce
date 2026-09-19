import { AccountingNature, MappedLedger, StatementType, TrialBalanceRow, AuditException } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';

interface RuleMatch {
  noteNumber: number;
  noteName: string;
  subCategory: string;
  statement: StatementType;
  nature: AccountingNature;
  confidence: number;
  reasoning: string;
}

export function classifyLedgerAccount(accountName: string, netDebit: number, netCredit: number): RuleMatch {
  const rawName = accountName.toLowerCase().trim();
  // Clean punctuation for multi-word phrase comparison while retaining words
  const name = rawName.replace(/[\/\-_,\(\)]+/g, ' ').replace(/\s+/g, ' ').trim();

  // ==========================================
  // TIER 1: EXACT FULL SENTENCE & MULTI-WORD PHRASES
  // (Priority 1: Complete sentences and 2-6 word descriptions)
  // ==========================================

  // A. Provision Reversals, Returns & Write-Backs (Income - Note 20)
  if (
    name.includes('excess provision return back') || name.includes('excess provision returned back') ||
    name.includes('excess provision written back') || name.includes('provision written back') ||
    name.includes('provision for doubtful debts written back') || name.includes('provision for doubtful debt written back') ||
    name.includes('provision returned back') || name.includes('provision return back') ||
    name.includes('provision no longer required') || name.includes('unclaimed balances written back') ||
    name.includes('unclaimed credit balance written back') || name.includes('bad debts recovered') ||
    name.includes('liabilities no longer required written back') || name.includes('provision reversed')
  ) {
    return {
      noteNumber: 20,
      noteName: 'Other Income',
      subCategory: '(d) Other non-operating income (Discounts, Rent, Reversals)',
      statement: 'ProfitAndLoss',
      nature: 'Income',
      confidence: 0.99,
      reasoning: 'Full-sentence rule match: Provision reversal / write-back of excess provision mapped to Note 20 (Other Income).',
    };
  }

  // B. Interest Income & Tax Refunds (Income - Note 20)
  if (
    name.includes('interest received on income tax refund') || name.includes('interest on income tax refund') ||
    name.includes('interest on tax refund') || name.includes('interest on refund') ||
    name.includes('interest received on fd') || name.includes('interest on fixed deposit') ||
    name.includes('interest received on bank deposit') || name.includes('interest income on fixed deposit') ||
    name.includes('interest received from bank') || name.includes('interest on term deposit')
  ) {
    return {
      noteNumber: 20,
      noteName: 'Other Income',
      subCategory: '(a) Interest income (Bank FD & IT Refund)',
      statement: 'ProfitAndLoss',
      nature: 'Income',
      confidence: 0.99,
      reasoning: 'Full-sentence rule match: Interest income on Bank FD or Tax refund mapped to Note 20 (Other Income).',
    };
  }

  // C. Interest Paid & Borrowing Costs (Expense - Note 23)
  if (
    name.includes('interest paid on car loan') || name.includes('interest on vehicle loan') ||
    name.includes('interest on term loan') || name.includes('interest paid to bank') ||
    name.includes('interest on bank loan') || name.includes('interest on cash credit') ||
    name.includes('interest on overdraft') || name.includes('interest on bank od') ||
    name.includes('interest on partners capital') || name.includes('interest paid on capital') ||
    name.includes('interest on unsecured loan') || name.includes('interest paid on loan') ||
    name.includes('bank interest paid')
  ) {
    return {
      noteNumber: 23,
      noteName: 'Finance Cost',
      subCategory: name.includes('partner') ? "(b) Interest on partners capital/member capital" : '(a) Interest expense - On bank loan',
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.99,
      reasoning: 'Full-sentence rule match: Interest paid on borrowings / capital mapped to Note 23 (Finance Cost).',
    };
  }

  // D. Investments & Capital in External Entities (Asset - Note 12)
  if (
    name.includes('capital contribution in partnership firm') || name.includes('capital contribution in firm') ||
    name.includes('capital with partnership firm') || name.includes('capital with firm') ||
    name.includes('capital in partnership firm') || name.includes('capital in firm') ||
    name.includes('investment in partnership firm') || name.includes('investment in subsidiary') ||
    name.includes('investment in equity shares') || name.includes('investment in mutual funds') ||
    name.includes('investment in bonds') || name.includes('investment in debentures') ||
    name.includes('capital account with') || name.includes('capital in joint venture')
  ) {
    const isCurrent = name.includes('mutual fund') || name.includes('liquid') || name.includes('current investment');
    return {
      noteNumber: 12,
      noteName: 'Investments - Non Current and Current',
      subCategory: isCurrent ? 'Current - Investments in mutual funds (liquid)' : 'Non-Current - Investment in partnership firm / Government securities',
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.99,
      reasoning: 'Full-sentence rule match: Capital contribution / Investment in external entity mapped to Note 12 (Investments).',
    };
  }

  // E. Sales Returns (Contra Revenue - Note 19) vs Purchase Returns (Contra Expense - Note 21)
  if (name.includes('sales return') || name.includes('sales returns') || name.includes('return inward') || name.includes('return inwards') || name.includes('rejection inward')) {
    return {
      noteNumber: 19,
      noteName: 'Revenue from Operations',
      subCategory: '(a) Sale of products - Sales Returns',
      statement: 'ProfitAndLoss',
      nature: 'Income',
      confidence: 0.99,
      reasoning: 'Full-sentence rule match: Sales Return / Return Inward mapped to Note 19 (Deduction from Revenue).',
    };
  }
  if (name.includes('purchase return') || name.includes('purchase returns') || name.includes('return outward') || name.includes('return outwards') || name.includes('rejection outward')) {
    return {
      noteNumber: 21,
      noteName: 'Cost of Goods Sold',
      subCategory: '(A) Raw material consumed - Purchase Returns',
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.99,
      reasoning: 'Full-sentence rule match: Purchase Return / Return Outward mapped to Note 21 (Deduction from Purchases).',
    };
  }

  // F. Statutory Taxes & GST Input vs Output
  if (
    name.includes('input cgst') || name.includes('input sgst') || name.includes('input igst') ||
    name.includes('gst input tax credit') || name.includes('gst itc account') ||
    name.includes('tds receivable') || name.includes('advance tax paid') || name.includes('tds deducted by customer')
  ) {
    return {
      noteNumber: 13,
      noteName: 'Loans and Advances (Long Term & Short Term)',
      subCategory: name.includes('gst') || name.includes('input') ? 'Other - GST input credit receivable (CGST, SGST, IGST)' : 'Other - Advance tax and tax deducted at source (TDS)',
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.98,
      reasoning: 'Full-sentence rule match: GST Input Credit / TDS Receivable mapped to Note 13 (Loans and Advances).',
    };
  }

  // G. Statutory Dues Payable
  if (
    name.includes('output cgst') || name.includes('output sgst') || name.includes('output igst') ||
    name.includes('gst payable') || name.includes('tds payable') || name.includes('professional tax payable') ||
    name.includes('pf payable') || name.includes('esic payable') || name.includes('salaries payable') ||
    name.includes('wages payable') || name.includes('audit fees payable') || name.includes('electricity payable')
  ) {
    return {
      noteNumber: 10,
      noteName: 'Other Current Liabilities',
      subCategory: name.includes('gst') || name.includes('output') ? '(f) Goods and Service tax payable (CGST/SGST/IGST)' : (name.includes('tds') || name.includes('pf') || name.includes('esic') || name.includes('tax') ? '(g) TDS & Statutory dues payable' : '(h) Other payables (Salaries, Audit Fees, Electricity)'),
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.98,
      reasoning: 'Full-sentence rule match: Statutory dues & expenses payable mapped to Note 10 (Other Current Liabilities).',
    };
  }

  // H. Statutory Late Fees / Penalties Paid
  if (name.includes('late fee paid') || name.includes('gst late fee') || name.includes('sgst late fee') || name.includes('cgst late fee') || name.includes('penalty paid') || name.includes('fine paid') || name.includes('income tax interest paid')) {
    return {
      noteNumber: 25,
      noteName: 'Other Expenses',
      subCategory: '(g) Rent, Rates and taxes, excluding taxes on income',
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.97,
      reasoning: 'Full-sentence rule match: Late fee / penalty paid mapped to Note 25 (Other Expenses).',
    };
  }

  // ==========================================
  // TIER 2: CONTEXTUAL MULTI-WORD COMBINATIONS
  // ==========================================

  // A. Provision + Return / Written Back / Excess / Reversed
  if ((name.includes('provision') || name.includes('provisions')) && (name.includes('return') || name.includes('back') || name.includes('written') || name.includes('reversed') || name.includes('excess'))) {
    if (netCredit > 0 || netDebit === 0) {
      return {
        noteNumber: 20,
        noteName: 'Other Income',
        subCategory: '(d) Other non-operating income (Discounts, Rent, Reversals)',
        statement: 'ProfitAndLoss',
        nature: 'Income',
        confidence: 0.97,
        reasoning: 'Contextual sentence rule: Provision written back / returned back credited to Note 20 (Other Income).',
      };
    }
  }

  // B. Interest + Income / Refund / FD / Received
  if (name.includes('interest') && (name.includes('refund') || name.includes('received') || name.includes('fd') || name.includes('fixed deposit') || name.includes('deposit') || name.includes('income') || name.includes('saving'))) {
    if (!name.includes('paid') && !name.includes('loan') && !name.includes('cc') && !name.includes('overdraft')) {
      return {
        noteNumber: 20,
        noteName: 'Other Income',
        subCategory: '(a) Interest income (Bank FD & IT Refund)',
        statement: 'ProfitAndLoss',
        nature: 'Income',
        confidence: 0.96,
        reasoning: 'Contextual sentence rule: Interest received / refund mapped to Note 20 (Other Income).',
      };
    }
  }

  // C. Interest + Loan / Bank / Paid / CC / OD / Capital
  if (name.includes('interest') && (name.includes('loan') || name.includes('bank') || name.includes('paid') || name.includes('cc') || name.includes('od') || name.includes('charge') || name.includes('partner') || name.includes('capital'))) {
    return {
      noteNumber: 23,
      noteName: 'Finance Cost',
      subCategory: name.includes('partner') ? "(b) Interest on partners capital/member capital" : '(a) Interest expense - On bank loan',
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.96,
      reasoning: 'Contextual sentence rule: Interest paid / borrowing cost mapped to Note 23 (Finance Cost).',
    };
  }

  // D. Capital + Contribution / External Entity / Shares / Mutual Fund
  if (name.includes('capital') && (name.includes('firm') || name.includes('contribution') || name.includes('with') || name.includes('in partnership') || name.includes('joint venture') || name.includes('company'))) {
    if (!name.includes('reserve') && !name.includes('goods') && !name.includes('advance')) {
      return {
        noteNumber: 12,
        noteName: 'Investments - Non Current and Current',
        subCategory: 'Non-Current - Investment in partnership firm / Government securities',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.96,
        reasoning: 'Contextual sentence rule: Capital contribution in external entity mapped to Note 12 (Investments).',
      };
    }
  }

  // 1. Suspense / Unclassified
  if (name.includes('suspense') || name.includes('unidentified') || name.includes('unclassified') || name.includes('temp a/c') || name.includes('temporary account')) {
    return {
      noteNumber: 10,
      noteName: 'Other Current Liabilities',
      subCategory: 'Suspense / Unidentified Account (Requires CA Audit Review)',
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.35,
      reasoning: 'Suspense/unidentified account detected. Placed in Note 10: Other Current Liabilities pending CA investigation.',
    };
  }

  // 2. Investments in other entities (must run BEFORE Owners' Capital rule to prevent "Capital with XYZ" from being mapped to Note 3)
  if (
    name.includes('capital with') || name.includes('capital in') || name.includes('capital contribution in') ||
    name.includes('investment') || name.includes('investments') || name.includes('shares') || name.includes('mutual fund') ||
    name.includes('liquid fund') || name.includes('bonds') || name.includes('debenture') || name.includes('nsc') ||
    name.includes('national saving') || name.includes('kvp') || name.includes('marketable securities') || name.includes('equity shares')
  ) {
    if (!name.includes('loss on') && !name.includes('profit on') && !name.includes('interest on') && !name.includes('dividend')) {
      const isCurrent = name.includes('mutual fund') || name.includes('liquid') || name.includes('current investment');
      return {
        noteNumber: 12,
        noteName: 'Investments - Non Current and Current',
        subCategory: isCurrent ? 'Current - Investments in mutual funds (liquid)' : 'Non-Current - Investment in partnership firm / Government securities',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.97,
        reasoning: 'Mapped to Note 12: Investments (Capital in other entities / Government securities).',
      };
    }
  }

  // 3. Owners' / Partners' Capital (Note 3)
  const isCapitalKeyword = name.includes('capital') && !name.includes('capital goods') && !name.includes('capital reserve') && !name.includes('interest on capital') && !name.includes('capital advance');
  if (
    isCapitalKeyword ||
    name.includes('drawings') ||
    (name.includes('partner') && (name.includes('current') || name.includes('fixed') || name.includes('share') || name.includes('capital'))) ||
    (name.includes('proprietor') && !name.includes('remuneration'))
  ) {
    return {
      noteNumber: 3,
      noteName: "Owners' Capital Account",
      subCategory: name.includes('drawing') ? "Drawings Account" : (name.includes('current') ? "Partners' Current Account" : "Partners' Fixed Capital"),
      statement: 'BalanceSheet',
      nature: 'Equity',
      confidence: 0.98,
      reasoning: 'Mapped to Note 3: Owners/Partners Capital or Drawings based on ICAI NCE framework.',
    };
  }

  // 4. Reserves & Surplus (Note 4)
  if (name.includes('reserve') || (name.includes('surplus') && !name.includes('unallocated')) || name.includes('retained earnings')) {
    return {
      noteNumber: 4,
      noteName: 'Reserves and Surplus',
      subCategory: name.includes('capital reserve') ? '(a) Capital Reserve' : '(c) Other Reserve',
      statement: 'BalanceSheet',
      nature: 'Equity',
      confidence: 0.96,
      reasoning: 'Mapped to Note 4: Reserves and Surplus (Capital/Other Reserve or Retained Earnings).',
    };
  }

  // 5. Borrowings - Long Term & Short Term (Note 5)
  // Must NOT match finance cost interest, bank charges, or loans & advances to suppliers
  const isAdvanceOrLoanToOthers = name.includes('advance to') || name.includes('advances to') || name.includes('loans and advance') || name.includes('loans & advance') || name.includes('supplier');
  const isInterestOrCharge = (name.includes('interest') && !name.includes('interest on loan')) || name.includes('bank charges') || name.includes('processing fee');

  if (
    !isAdvanceOrLoanToOthers && !isInterestOrCharge && (
      name.includes('term loan') || name.includes('vehicle loan') || name.includes('car loan') || name.includes('machinery loan') ||
      name.includes('mortgage') || name.includes('unsecured loan') || name.includes('stl loan') || name.includes('loan from') ||
      name.includes('cash credit') || name.includes(' cc ') || name.includes('cc a/c') || name.includes('cc limit') || name.includes('cc facility') ||
      name.includes('overdraft') || name.includes('bank od') || name.includes('od facility') || name.includes('working capital loan') ||
      name.includes('packing credit') || name.includes('buyer credit') || name.includes('borrowing') ||
      (name.includes('loan') && (netCredit > 0 || name.includes('a/c') || name.includes('facility') || name.includes('account')))
    )
  ) {
    const isShortTerm = name.includes('cash credit') || name.includes(' cc ') || name.includes('cc a/c') || name.includes('overdraft') || name.includes('bank od') || name.includes('working capital') || name.includes('short term') || name.includes('stl');
    return {
      noteNumber: 5,
      noteName: 'Borrowings (Long Term & Short Term)',
      subCategory: isShortTerm ? 'Secured - Loans repayable on demand (from banks - CC/OD)' : (name.includes('unsecured') ? 'Unsecured - Term loans from other parties' : 'Secured - Term loans from banks'),
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.96,
      reasoning: 'Mapped to Note 5: Borrowings (Long-Term / Short-Term CC/OD as per ICAI format).',
    };
  }

  // 6. Deferred Tax Liabilities/(Asset) (Net) (Note 6)
  if (name.includes('deferred tax') || name.includes('dtl') || name.includes('dta')) {
    const isAsset = name.includes('asset') || name.includes('dta');
    return {
      noteNumber: 6,
      noteName: 'Deferred Tax Liabilities/(Asset) (Net)',
      subCategory: isAsset ? 'Gross Deferred Tax Asset (A)' : 'Gross Deferred Tax Liability (B)',
      statement: 'BalanceSheet',
      nature: isAsset ? 'Asset' : 'Liability',
      confidence: 0.98,
      reasoning: 'Mapped to Note 6: Deferred Tax Liabilities/(Asset) as per AS-22.',
    };
  }

  // 7. Other Long-Term Liabilities (Note 7)
  if (name.includes('retention money') || (name.includes('deposit') && name.includes('received') && !name.includes('security deposit with')) || (name.includes('customer advance') && name.includes('long'))) {
    return {
      noteNumber: 7,
      noteName: 'Other Long-Term Liabilities',
      subCategory: 'Trade deposits received',
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.93,
      reasoning: 'Mapped to Note 7: Other Long-Term Liabilities.',
    };
  }

  // 8. Provisions (Long Term & Short Term) (Note 8)
  if (
    name.includes('gratuity provision') || name.includes('provision for gratuity') || name.includes('leave encashment') ||
    name.includes('provision for tax') || name.includes('provision for income tax') || name.includes('warranty provision') ||
    (name.startsWith('provision') && (netCredit > 0 || netDebit === 0))
  ) {
    const isLongTerm = name.includes('gratuity') || name.includes('leave');
    return {
      noteNumber: 8,
      noteName: 'Provisions (Long Term & Short Term)',
      subCategory: isLongTerm ? 'Long-term - Provision for gratuity' : 'Short-term - Provision for Income tax (net of advance tax)',
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.95,
      reasoning: 'Mapped to Note 8: Provisions (Employee retirement benefits / Tax provisions).',
    };
  }

  // 9. Trade Payables (Note 9)
  if (
    (name.includes('sundry creditor') || name.includes('trade payable') || name.includes('creditors for') || name.includes('creditor -') || name.includes('creditor:')) ||
    (name.includes('msme') && (name.includes('payable') || name.includes('creditor') || name.includes('due')))
  ) {
    return {
      noteNumber: 9,
      noteName: 'Trade Payables',
      subCategory: name.includes('msme') || name.includes('micro') ? '(a) Total outstanding dues of micro, small and medium enterprises' : '(b) Total outstanding dues of creditors other than micro, small and medium enterprises',
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.96,
      reasoning: 'Mapped to Note 9: Trade Payables (Sundry Creditors for goods/services).',
    };
  }

  // 10. Other Current Liabilities (Note 10)
  // Must catch statutory dues, customer advances, and outstanding expenses before expense rules run
  // Must NOT catch late fees, charges, or expense payments (e.g., "SGST Late Fee Paid", "PF Administration Charges")
  const isLateFeeOrPenaltyOrExpense = name.includes('late fee') || name.includes('penalty') || name.includes('fine') || name.includes('paid');
  if (
    !isLateFeeOrPenaltyOrExpense && (
      name.includes('output cgst') || name.includes('output sgst') || name.includes('output igst') || name.includes('gst payable') ||
      name.includes('tds payable') || name.includes('t d s payable') || name.includes('pf payable') || name.includes('esic payable') || name.includes('esi payable') ||
      name.includes('professional tax payable') || name.includes('pt payable') || name.includes('salaries payable') || name.includes('salary payable') ||
      name.includes('wages payable') || name.includes('audit fees payable') || name.includes('electricity payable') || name.includes('power charges payable') ||
      name.includes('employees contribution') || name.includes('employee contribution') || name.includes('employees pt') || name.includes('employees p t') || name.includes('employee pt') ||
      name.includes('outstanding') || name.includes('statutory dues') || name.includes('dues payable') ||
      name.includes('advance from customer') || name.includes('advances from customer') || name.includes('advances from customers') ||
      name.includes('advance from clients') || name.includes('unearned revenue') ||
      (name.includes('payable') && !name.includes('trade payable') && !name.includes('creditor'))
    )
  ) {
    let subCat = '(h) Other payables (Salaries, Audit Fees, Electricity)';
    if (name.includes('gst') || name.includes('cgst') || name.includes('sgst') || name.includes('igst')) {
      subCat = '(f) Goods and Service tax payable (CGST/SGST/IGST)';
    } else if (name.includes('tds') || name.includes('statutory') || name.includes('pf') || name.includes('esi') || name.includes('esic') || name.includes('pt') || name.includes('contribution')) {
      subCat = '(g) TDS & Statutory dues payable';
    } else if (name.includes('advance')) {
      subCat = '(e) Advances from customers / unearned revenue';
    }

    return {
      noteNumber: 10,
      noteName: 'Other Current Liabilities',
      subCategory: subCat,
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.96,
      reasoning: 'Mapped to Note 10: Other Current Liabilities (Statutory dues, expenses payable, customer advances).',
    };
  }

  // 11. PPE, Intangible Assets & Accumulated Depreciation (Note 11) vs Depreciation Expense (Note 24)
  if (name.includes('depreciation') || name.includes('amortization') || name.includes('amortisation')) {
    const isAccumulated = name.includes('accumulated') || name.includes('acc.') || name.includes('acc dep') || name.includes('reserve') || (netCredit > 0 && netDebit === 0);
    if (isAccumulated) {
      return {
        noteNumber: 11,
        noteName: 'Property, Plant and Equipment and Intangible Assets',
        subCategory: 'Accumulated Depreciation',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.98,
        reasoning: 'Accumulated Depreciation contra-asset account mapped to Note 11.',
      };
    } else {
      return {
        noteNumber: 24,
        noteName: 'Depreciation and Amortization Expense',
        subCategory: name.includes('intangible') || name.includes('amortiz') ? '(b) Amortization on intangible assets' : '(a) Depreciation on tangible assets',
        statement: 'ProfitAndLoss',
        nature: 'Expense',
        confidence: 0.98,
        reasoning: 'Depreciation/Amortization expense for the period mapped to Note 24.',
      };
    }
  }

  // PPE Asset Gross Block (Note 11)
  if (
    name.includes('land') || name.includes('building') || name.includes('residential building') || name.includes('farm house') || name.includes('shed') ||
    name.includes('machinery') || name.includes('plant') || name.includes('equipment') || name.includes('electrical equipment') || name.includes('electrical installation') ||
    name.includes('electrical vehicle') || name.includes('generator') || name.includes('transformer') || name.includes('inverter') || name.includes('ups system') ||
    name.includes('ups') || name.includes('solar system') || name.includes('solar') || name.includes('furniture') || name.includes('fixture') ||
    name.includes('computer') || name.includes('laptop') || name.includes('printer') || name.includes('server') ||
    name.includes('vehicle') || name.includes('car') || name.includes('polo car') || name.includes('virtus') || name.includes('scooter') || name.includes('bike') || name.includes('truck') ||
    name.includes('vaccum') || name.includes('vacuum') || name.includes('cleaner') || name.includes('air conditioner') || name.includes('ac system') || name.includes('cctv') ||
    name.includes('capital work in progress') || name.includes('cwip') || name.includes('software') || name.includes('goodwill') || name.includes('trademark') || name.includes('patent')
  ) {
    return {
      noteNumber: 11,
      noteName: 'Property, Plant and Equipment and Intangible Assets',
      subCategory: name.includes('cwip') ? 'Capital Work in Progress' : (name.includes('software') ? 'Intangible Assets - Computer Software & Licenses' : (name.includes('machinery') || name.includes('plant') ? 'Plant and Equipment' : (name.includes('building') || name.includes('house') || name.includes('shed') ? 'Buildings' : (name.includes('land') ? 'Land' : (name.includes('vehicle') || name.includes('car') || name.includes('virtus') ? 'Vehicles' : 'Office equipment'))))),
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.97,
      reasoning: 'Mapped to Note 11: Tangible/Intangible Fixed Assets as per ICAI NCE schedule.',
    };
  }

  // 12. Loans and Advances - Long Term & Short Term (Note 13)
  if (
    name.includes('input cgst') || name.includes('input sgst') || name.includes('input igst') || name.includes('input tax') ||
    name.includes('gst itc') || name.includes('itc') || name.includes('govt authorities') || name.includes('government authorities') || name.includes('balances with govt') ||
    name.includes('advance tax') || name.includes('tds deducted') || name.includes('tds receivable') || name.includes('tds account') || name.includes('26as') ||
    name.includes('prepaid') || name.includes('advance to supplier') || name.includes('advances to supplier') || name.includes('staff advance') ||
    name.includes('short-term loans and advances') || name.includes('short term loans and advances') || name.includes('loans and advances') || name.includes('loans & advances') ||
    name.includes('security deposit') || (name.includes('deposit') && (name.includes('electricity') || name.includes('msedcl') || name.includes('lease') || name.includes('rent') || name.includes('government') || name.includes('sales tax') || name.includes('telephone') || name.includes('deposit with') || name.includes('asset'))) ||
    name.includes('capital advance') || name.includes('loan to partner')
  ) {
    return {
      noteNumber: 13,
      noteName: 'Loans and Advances (Long Term & Short Term)',
      subCategory: (name.includes('gst') || name.includes('itc') || name.includes('govt')) ? 'Other - GST input credit receivable (CGST, SGST, IGST)' : (name.includes('advance tax') || name.includes('tds') ? 'Other - Advance tax and tax deducted at source (TDS)' : (name.includes('deposit') ? 'Other - Security Deposits with government/utilities' : 'Other - Prepaid expenses')),
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.96,
      reasoning: 'Mapped to Note 13: Loans and advances (TDS/Advance Tax, GST ITC, prepaid expenses, security deposits, advances to suppliers).',
    };
  }

  // 13. Other Non-Current Assets (Note 14)
  if (name.includes('fixed deposit > 12') || name.includes('long-term deposit') || name.includes('non-current asset') || name.includes('deposit > 1 year')) {
    return {
      noteNumber: 14,
      noteName: 'Other Non-Current Assets',
      subCategory: '(c) Bank deposits maturing after 12 months',
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.93,
      reasoning: 'Mapped to Note 14: Other Non-Current Assets.',
    };
  }

  // 14. Inventories (Note 15)
  // Handles 'inventories', 'inventory', 'stock'
  if (
    (name.startsWith('inventor') || name.includes('inventory') || name.includes('inventories') || name.includes('stock in hand') || name.includes('stock-in-hand') || name.includes('closing stock')) &&
    !name.includes('opening stock') && !name.includes('changes in') && !name.includes('purchases') && !name.includes('stock-in-trade purchase')
  ) {
    let subCat = '(a) Raw materials';
    if (name.includes('finished')) subCat = '(c) Finished goods';
    else if (name.includes('wip') || name.includes('work-in-progress') || name.includes('work in progress')) subCat = '(b) Work-in-progress';
    else if (name.includes('trade')) subCat = '(d) Stock-in-trade';
    else if (name.includes('spares') || name.includes('loose')) subCat = '(e) Stores and spares';

    return {
      noteNumber: 15,
      noteName: 'Inventories',
      subCategory: subCat,
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.97,
      reasoning: 'Mapped to Note 15: Inventories as at reporting date.',
    };
  }

  // 15. Trade Receivables (Note 16)
  if (
    name.includes('sundry debtor') || name.includes('trade receivable') || name.includes('debtors') || name.includes('accounts receivable') || name.includes('bills receivable')
  ) {
    return {
      noteNumber: 16,
      noteName: 'Trade Receivables',
      subCategory: name.includes('> 6') || name.includes('exceeding 6') ? 'Outstanding > 6 months - Unsecured Considered good' : 'Outstanding < 6 months - Unsecured Considered good',
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.97,
      reasoning: 'Mapped to Note 16: Trade Receivables (Sundry Debtors).',
    };
  }

  // 16. Cash and Bank Balances (Note 17)
  if (
    (name.includes('cash in hand') || name.includes('cash-in-hand') || name.includes('cash on hand') || name === 'cash' || name.includes('petty cash') ||
     name.includes('balances with bank') || name.includes('balance with bank') || name.includes('bank balance') || name.includes('bank accounts') || name.includes('bank account') ||
     (name.includes('bank') && (name.includes('current') || name.includes('balance') || name.includes('a/c') || name.includes('account') || name.includes('deposit'))) ||
     name.includes('fixed deposit') || name.includes('term deposit') || (name.includes('fd') && (name.includes('sbi') || name.includes('bank') || name.includes('< 12') || name.includes('short term')))) &&
    !name.includes('interest on') && !name.includes('interest income') && !name.includes('bank charges') && !name.includes('loan') && !name.includes('cash credit') && !name.includes('overdraft')
  ) {
    return {
      noteNumber: 17,
      noteName: 'Cash and Bank Balances',
      subCategory: name.includes('cash') ? 'A. (e) Cash on hand' : (name.includes('fixed deposit') || name.includes('fd') ? 'A. (c) Fixed Deposits (< 3 months)' : 'A. (a) On current accounts'),
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.98,
      reasoning: 'Mapped to Note 17: Cash, Bank Current Accounts & Short-Term FDs.',
    };
  }

  // 17. Other Current Assets (Note 18)
  if (name.includes('interest accrued') || name.includes('accrued interest') || name.includes('interest receivable') || name.includes('unbilled')) {
    return {
      noteNumber: 18,
      noteName: 'Other Current Assets',
      subCategory: '(a) Interest accrued but not due on deposits',
      statement: 'BalanceSheet',
      nature: 'Asset',
      confidence: 0.94,
      reasoning: 'Mapped to Note 18: Other Current Assets (Interest accrued & other short-term claims).',
    };
  }

  // 18. Revenue from Operations (Note 19)
  const isRevenueKeyword =
    (name.includes('sales') || name.includes('sale of') || name.includes('revenue from') || name.includes('turnover')) &&
    !name.includes('commission') &&
    !name.includes('paid') &&
    !name.includes('expense') &&
    !name.includes('purchase');

  if (
    isRevenueKeyword ||
    name.includes('service charges received') || name.includes('job work') || name.includes('gross receipts') ||
    name.includes('fees received') || name.includes('amc')
  ) {
    return {
      noteNumber: 19,
      noteName: 'Revenue from Operations',
      subCategory: name.includes('service') || name.includes('job') || name.includes('fees') || name.includes('amc') ? '(b) Sale of services' : '(a) Sale of products',
      statement: 'ProfitAndLoss',
      nature: 'Income',
      confidence: 0.97,
      reasoning: 'Mapped to Note 19: Revenue from Operations (Sale of goods/services).',
    };
  }

  // 19. Other Income (Note 20)
  if (
    name.includes('interest on fixed') || name.includes('interest on fd') || name.includes('interest income') ||
    name.includes('interest received') || name.includes('dividend') || name.includes('discount received') || name.includes('profit on sale') ||
    name.includes('scrap sale') || name.includes('sale of wastage') || name.includes('wastage sale') || name.includes('rental income') || name.includes('rent received') ||
    name.includes('agricultural income') || name.includes('transportation charges received') || name.includes('transporatation charges received') ||
    name.includes('operating income') || name.includes('miscellaneous income') || name.includes('misc income') || name.includes('bad debts recovered') ||
    ((name.includes('income') || name.includes('receipts')) && (netCredit > 0 || netDebit === 0) && !name.includes('advance'))
  ) {
    return {
      noteNumber: 20,
      noteName: 'Other Income',
      subCategory: name.includes('interest') ? '(a) Interest income (Bank FD & IT Refund)' : (name.includes('discount') ? '(d) Other non-operating income (Discounts, Rent)' : '(d) Other non-operating income (Discounts, Rent)'),
      statement: 'ProfitAndLoss',
      nature: 'Income',
      confidence: 0.96,
      reasoning: 'Mapped to Note 20: Other Income (Interest, discounts, non-operating receipts).',
    };
  }

  // 20. Cost of Goods Sold / Purchases (Note 21)
  if (
    name.includes('purchases') || name.includes('purchase') || name.includes('gst purchase') || name.includes('raw material purchase') ||
    name.includes('carriage inward') || name.includes('freight inward') || name.includes('fright inward') || name.includes('customs duty') || name.includes('octroi') ||
    name.includes('clearing charges') || name.includes('freight on raw') || name.includes('component purchase') ||
    name.includes('opening stocks') || name.includes('opening stock') || name.includes('changes in inventories') ||
    name.includes('packing material') || (name.includes('raw material') && name.includes('purchase')) ||
    (name.includes('opening') && name.includes('raw material'))
  ) {
    let subCat = '(A) Raw material consumed';
    if (name.includes('carriage') || name.includes('freight') || name.includes('fright') || name.includes('customs')) subCat = '(A) Other materials (purchased intermediates/freight)';
    else if (name.includes('packing')) subCat = '(A) Packing material consumed';
    else if (name.includes('changes in') || (name.includes('opening') && !name.includes('purchases') && !name.includes('purchase'))) subCat = '(C) Changes in inventories (Opening less Closing)';
    else if (name.includes('trade') || name.includes('finished purchase')) subCat = '(B) Purchases of stock-in-trade';

    return {
      noteNumber: 21,
      noteName: 'Cost of Goods Sold',
      subCategory: subCat,
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.98,
      reasoning: 'Mapped to Note 21: Cost of Goods Sold (Raw materials consumed, purchases of stock-in-trade, inventory changes).',
    };
  }

  // 21. Employee Benefits Expense (Note 22)
  const isEmployeeDeduction = name.includes('employees contribution') || name.includes('employee contribution') || name.includes('employee deduction') || name.includes('employees pt') || name.includes('employees p t') || name.includes('employee pt');
  if (
    !isEmployeeDeduction && (
      name.includes('salaries') || name.includes('salary') || name.includes('wages') || name.includes('bonus') ||
      ((name.includes('provident fund') || name.includes('pf')) && (name.includes('contribution') || name.includes('expense') || name.includes('admin') || name.includes('adminisatration') || name.includes('employer'))) ||
      (name.includes('esic') && (name.includes('contribution') || name.includes('expense') || name.includes('employer'))) ||
      name.includes('staff welfare') || name.includes('canteen') || (name.includes('gratuity') && name.includes('expense'))
    )
  ) {
    return {
      noteNumber: 22,
      noteName: 'Employee Benefits Expense',
      subCategory: name.includes('pf') || name.includes('esic') ? '(b) Contribution to provident and other funds' : (name.includes('welfare') || name.includes('canteen') ? '(d) Staff welfare expenses' : '(a) Salaries, wages, bonus and other allowances'),
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.97,
      reasoning: 'Mapped to Note 22: Employee Benefits Expense (Salaries, PF, welfare).',
    };
  }

  // 22. Finance Cost (Note 23)
  if (
    (name.includes('interest') && (name.includes('bank') || name.includes('loan') || name.includes('borrow') || name.includes('cc') || name.includes('od') || name.includes('partner') || name.includes('term') || name.includes('paid') || name.includes('unsecured'))) ||
    name.includes('bank charges') || name.includes('processing fee') || name.includes('finance cost')
  ) {
    return {
      noteNumber: 23,
      noteName: 'Finance Cost',
      subCategory: name.includes('partner') ? "(b) Interest on partners capital/member capital" : (name.includes('bank charges') || name.includes('processing') ? '(c) Other borrowing costs & bank charges' : '(a) Interest expense - On bank loan'),
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.96,
      reasoning: 'Mapped to Note 23: Finance Cost (Bank borrowing interest, partners capital interest, bank charges).',
    };
  }

  // 23. Other Expenses (Note 25)
  if (
    name.includes('audit fee') || name.includes('audit fees') || name.includes('auditor') || name.includes('tax audit') ||
    name.includes('rent') || name.includes('power and fuel') || name.includes('power charges') || name.includes('electricity') || name.includes('rates and taxes') ||
    name.includes('insurance') || name.includes('repairs') || name.includes('maintenance') || name.includes('legal') ||
    name.includes('professional') || name.includes('consultancy') || name.includes('freight') || name.includes('fright') || name.includes('carriage') ||
    name.includes('travelling') || name.includes('traveling') || name.includes('conveyance') || name.includes('hotel') || name.includes('printing') || name.includes('stationery') ||
    name.includes('postage') || name.includes('courier') || name.includes('telephone') || name.includes('internet') || name.includes('communication') || name.includes('advertising') ||
    name.includes('sales promotion') || name.includes('commission') || name.includes('pooja') || name.includes('petrol') || name.includes('diesel') || name.includes('late fee') ||
    name.includes('penalty') || name.includes('round off') || name.includes('labour charge') || name.includes('processing charge') || name.includes('expence') || name.includes('expense') ||
    name.includes('office expense') || name.includes('stores and spares') || name.includes('admin expenses') || name.includes('administrative')
  ) {
    let subCat = '(x) Miscellaneous expenses';
    if (name.includes('audit')) subCat = '(j) Auditor remuneration';
    else if (name.includes('power') || name.includes('fuel') || name.includes('electricity')) subCat = '(b) Power and fuel';
    else if (name.includes('rent') && !name.includes('rate')) subCat = '(c) Rent';
    else if (name.includes('repair') && name.includes('building')) subCat = '(d) Repairs and maintenance - Buildings';
    else if (name.includes('repair')) subCat = '(e) Repairs and maintenance - Machinery';
    else if (name.includes('insurance')) subCat = '(f) Insurance';
    else if (name.includes('rates') || name.includes('tax')) subCat = '(g) Rent, Rates and taxes, excluding taxes on income';
    else if (name.includes('labour')) subCat = '(h) Labour charges';
    else if (name.includes('travelling') || name.includes('traveling') || name.includes('conveyance') || name.includes('hotel')) subCat = '(i) Travelling expenses';
    else if (name.includes('printing') || name.includes('stationery')) subCat = '(k) Printing and stationery';
    else if (name.includes('postage') || name.includes('courier') || name.includes('telephone') || name.includes('internet') || name.includes('communication')) subCat = '(l) Communication expenses';
    else if (name.includes('legal') || name.includes('professional') || name.includes('consultancy')) subCat = '(m) Legal and professional charges';
    else if (name.includes('advertising') || name.includes('publicity')) subCat = '(n) Advertisement and publicity';
    else if (name.includes('promotion')) subCat = '(o) Business promotion expenses';
    else if (name.includes('commission')) subCat = '(p) Commission';
    else if (name.includes('freight') || name.includes('fright') || name.includes('carriage') || name.includes('clearing')) subCat = '(q) Clearing and forwarding charges';
    else if (name.includes('stores') || name.includes('spares')) subCat = '(a) Consumption of stores and spare parts';
    else if (name.includes('bad debt') || name.includes('doubtful')) subCat = '(w) Provision for doubtful debts';

    return {
      noteNumber: 25,
      noteName: 'Other Expenses',
      subCategory: subCat,
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.94,
      reasoning: `Mapped to Note 25: ${subCat} based on standard ICAI NCE classification.`,
    };
  }

  // Fallback heuristic based on Debit vs Credit with intelligent keyword detection
  if (netDebit > 0) {
    if (name.includes('land') || name.includes('building') || name.includes('plant') || name.includes('machine') || name.includes('equipment') || name.includes('furniture') || name.includes('vehicle') || name.includes('computer')) {
      return {
        noteNumber: 11,
        noteName: 'Property, Plant and Equipment and Intangible Assets',
        subCategory: 'Plant and Equipment',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.70,
        reasoning: 'Debit balance with fixed asset characteristics mapped to Note 11.',
      };
    }
    if (name.includes('stock') || name.includes('inventor')) {
      return {
        noteNumber: 15,
        noteName: 'Inventories',
        subCategory: '(a) Raw materials',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.70,
        reasoning: 'Debit balance with inventory characteristics mapped to Note 15.',
      };
    }
    if (name.includes('debtor') || name.includes('receivable')) {
      return {
        noteNumber: 16,
        noteName: 'Trade Receivables',
        subCategory: 'Outstanding < 6 months - Unsecured Considered good',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.70,
        reasoning: 'Debit balance with receivable characteristics mapped to Note 16.',
      };
    }
    if (name.includes('cash') || name.includes('bank')) {
      return {
        noteNumber: 17,
        noteName: 'Cash and Bank Balances',
        subCategory: 'A. (a) On current accounts',
        statement: 'BalanceSheet',
        nature: 'Asset',
        confidence: 0.70,
        reasoning: 'Debit balance with bank/cash characteristics mapped to Note 17.',
      };
    }
    return {
      noteNumber: 25,
      noteName: 'Other Expenses',
      subCategory: '(x) Miscellaneous expenses',
      statement: 'ProfitAndLoss',
      nature: 'Expense',
      confidence: 0.50,
      reasoning: 'Debit balance classified as Miscellaneous Expense pending CA verification.',
    };
  } else {
    if (name.includes('sale') || name.includes('revenue') || name.includes('turnover')) {
      return {
        noteNumber: 19,
        noteName: 'Revenue from Operations',
        subCategory: '(a) Sale of products',
        statement: 'ProfitAndLoss',
        nature: 'Income',
        confidence: 0.75,
        reasoning: 'Credit balance with revenue characteristics mapped to Note 19.',
      };
    }
    if (name.includes('income') || name.includes('receipt') || name.includes('discount') || name.includes('gain') || name.includes('interest')) {
      return {
        noteNumber: 20,
        noteName: 'Other Income',
        subCategory: '(d) Other non-operating income (Discounts, Rent)',
        statement: 'ProfitAndLoss',
        nature: 'Income',
        confidence: 0.75,
        reasoning: 'Credit balance with income characteristics mapped to Note 20.',
      };
    }
    if (name.includes('capital') || name.includes('partner') || name.includes('proprietor')) {
      return {
        noteNumber: 3,
        noteName: "Owners' Capital Account",
        subCategory: "Partners' Fixed Capital",
        statement: 'BalanceSheet',
        nature: 'Equity',
        confidence: 0.80,
        reasoning: 'Credit balance with capital characteristics mapped to Note 3.',
      };
    }
    if (name.includes('reserve') || name.includes('surplus')) {
      return {
        noteNumber: 4,
        noteName: 'Reserves and Surplus',
        subCategory: '(c) Other Reserve',
        statement: 'BalanceSheet',
        nature: 'Equity',
        confidence: 0.80,
        reasoning: 'Credit balance with reserve characteristics mapped to Note 4.',
      };
    }
    if (name.includes('loan') || name.includes('borrowing') || name.includes('credit') || name.includes('overdraft')) {
      return {
        noteNumber: 5,
        noteName: 'Borrowings (Long Term & Short Term)',
        subCategory: 'Secured - Term loans from banks',
        statement: 'BalanceSheet',
        nature: 'Liability',
        confidence: 0.75,
        reasoning: 'Credit balance with borrowing characteristics mapped to Note 5.',
      };
    }
    if (name.includes('creditor') || name.includes('payable') || name.includes('vendor') || name.includes('supplier')) {
      return {
        noteNumber: 9,
        noteName: 'Trade Payables',
        subCategory: '(b) Total outstanding dues of creditors other than micro, small and medium enterprises',
        statement: 'BalanceSheet',
        nature: 'Liability',
        confidence: 0.75,
        reasoning: 'Credit balance with trade payable characteristics mapped to Note 9.',
      };
    }
    return {
      noteNumber: 10,
      noteName: 'Other Current Liabilities',
      subCategory: '(h) Other payables (Salaries, Audit Fees, Electricity)',
      statement: 'BalanceSheet',
      nature: 'Liability',
      confidence: 0.50,
      reasoning: 'Credit balance classified as Other Current Liability pending CA verification.',
    };
  }
}


export function processTrialBalance(rawRows: TrialBalanceRow[]): {
  mappedLedgers: MappedLedger[];
  exceptions: AuditException[];
  totalDebit: number;
  totalCredit: number;
  isTallyBalanced: boolean;
  tallyDifference: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;
  const mappedLedgers: MappedLedger[] = [];
  const exceptions: AuditException[] = [];

  rawRows.forEach((row, index) => {
    const dr = Number(row.closingDebit) || 0;
    const cr = Number(row.closingCredit) || 0;

    totalDebit += dr;
    totalCredit += cr;

    const classification = classifyLedgerAccount(row.accountName, dr, cr);
    const netBal = Math.abs(dr - cr) || row.netBalance || (dr > 0 ? dr : cr);

    let auditFlag: string | undefined = undefined;

    // Check for abnormal signs
    // 1. Sundry Creditors with Debit balance
    if (classification.noteNumber === 9 && dr > 0 && cr === 0) {
      auditFlag = 'ABNORMAL_DEBIT_IN_CREDITORS';
      exceptions.push({
        id: `exc-cred-dr-${index}`,
        type: 'ABNORMAL_SIGN',
        severity: 'high',
        accountName: row.accountName,
        amount: dr,
        message: `Sundry Creditor "${row.accountName}" reflects a Debit balance of ₹${dr.toLocaleString('en-IN')}.`,
        recommendation: 'Verify if this represents an advance to supplier (reclassify to Note 13 Loans & Advances) or pending debit note for purchase returns.',
      });
    }

    // 2. Sundry Debtors with Credit balance
    if (classification.noteNumber === 16 && cr > 0 && dr === 0) {
      auditFlag = 'ABNORMAL_CREDIT_IN_DEBTORS';
      exceptions.push({
        id: `exc-debt-cr-${index}`,
        type: 'ABNORMAL_SIGN',
        severity: 'high',
        accountName: row.accountName,
        amount: cr,
        message: `Sundry Debtor "${row.accountName}" reflects a Credit balance of ₹${cr.toLocaleString('en-IN')}.`,
        recommendation: 'Verify if this represents customer advances (reclassify to Note 10 Other Current Liabilities) or credit notes issued.',
      });
    }

    // 3. Suspense account detection
    if (row.accountName.toLowerCase().includes('suspense') || row.accountName.toLowerCase().includes('unidentified')) {
      auditFlag = 'SUSPENSE_ACCOUNT';
      exceptions.push({
        id: `exc-suspense-${index}`,
        type: 'SUSPENSE_ACCOUNT',
        severity: 'high',
        accountName: row.accountName,
        amount: netBal,
        message: `Suspense / Unidentified account "${row.accountName}" has an unsettled balance of ₹${netBal.toLocaleString('en-IN')}.`,
        recommendation: 'Statutory audit requirement: Suspense balances must be analyzed and reconciled before final audit sign-off.',
      });
    }

    // 4. Zero balance account
    if (dr === 0 && cr === 0) {
      auditFlag = 'ZERO_BALANCE';
      exceptions.push({
        id: `exc-zero-${index}`,
        type: 'ZERO_CLOSING_TRANSACTED',
        severity: 'low',
        accountName: row.accountName,
        amount: 0,
        message: `Account "${row.accountName}" has a ₹0 closing balance in the Trial Balance.`,
        recommendation: 'Verify whether the account is dormant or if transactions netted to zero during year-end clearing.',
      });
    }

    // 5. Low confidence classification
    if (classification.confidence < 0.6) {
      exceptions.push({
        id: `exc-low-conf-${index}`,
        type: 'UNMAPPED_LEDGER',
        severity: 'medium',
        accountName: row.accountName,
        amount: netBal,
        message: `Ledger "${row.accountName}" has custom nomenclature with low classification confidence (${Math.round(classification.confidence * 100)}%).`,
        recommendation: 'Use the CA Semantic Re-Map tool or AI Assistant to verify the intended statutory schedule.',
      });
    }

    mappedLedgers.push({
      id: row.id || `mapped-${index}`,
      accountCode: row.accountCode,
      accountName: row.accountName,
      originalDebit: dr,
      originalCredit: cr,
      netBalance: netBal,
      nature: classification.nature,
      statement: classification.statement,
      noteNumber: classification.noteNumber,
      noteName: classification.noteName,
      subCategory: classification.subCategory,
      confidence: classification.confidence,
      mappingMethod: 'rule',
      auditFlag,
    });
  });

  const tallyDifference = Math.round((totalDebit - totalCredit) * 100) / 100;
  const isTallyBalanced = Math.abs(tallyDifference) < 0.01;

  if (!isTallyBalanced) {
    exceptions.unshift({
      id: 'exc-tb-unbalanced',
      type: 'TB_OUT_OF_BALANCE',
      severity: 'high',
      amount: Math.abs(tallyDifference),
      message: `Trial Balance does not tally! Total Debits: ₹${totalDebit.toLocaleString('en-IN')} vs Total Credits: ₹${totalCredit.toLocaleString('en-IN')}. Difference = ₹${Math.abs(tallyDifference).toLocaleString('en-IN')}.`,
      recommendation: 'Investigate one-sided journal vouchers, rounding differences, or unposted ledger balances before concluding audit.',
    });
  }

  return {
    mappedLedgers,
    exceptions,
    totalDebit,
    totalCredit,
    isTallyBalanced,
    tallyDifference,
  };
}

export const mapTrialBalanceLedgers = processTrialBalance;
