import { EntityConfig, BalanceSheetReport, ProfitLossReport } from '../types';

export interface EmailTemplateOption {
  id: string;
  title: string;
  category: 'statutory' | 'audit' | 'confirmations' | 'management';
  description: string;
  defaultSubject: (config: EntityConfig) => string;
  generateHtml: (
    config: EntityConfig,
    bs?: BalanceSheetReport,
    pl?: ProfitLossReport,
    additionalInfo?: Record<string, any>
  ) => string;
}

export const CA_EMAIL_TEMPLATES: EmailTemplateOption[] = [
  {
    id: 'financial_statements_transmittal',
    title: 'Statutory Financial Statements Transmittal',
    category: 'statutory',
    description:
      'Transmittal email to Partners / Proprietor presenting the compiled ICAI Balance Sheet, P&L, and Notes 1 to 25.',
    defaultSubject: (config) =>
      `Financial Statements & Audit Schedules for FY ${config.financialYear} — ${config.entityName}`,
    generateHtml: (config, bs, pl) => {
      const bsTotal = bs?.totalEquityAndLiabilities
        ? `₹${bs.totalEquityAndLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : 'As per attached';
      const netProfit = pl?.profitAfterTax
        ? `₹${pl.profitAfterTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : 'As calculated';
      const revenue = pl?.totalRevenue
        ? `₹${pl.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : 'As computed';

      const addressee = config.entityType === 'Sole Proprietorship'
        ? (config.proprietorName ? `Dear ${config.proprietorName},` : 'Dear Sir / Madam,')
        : (config.signingPartnerName ? `Dear ${config.signingPartnerName} & Partners,` : 'Dear Partners / Management,');

      return `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #064e3b; color: #ffffff; padding: 20px 24px;">
    <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: bold;">Statutory Financial Statements — FY ${config.financialYear}</h2>
    <p style="margin: 0; font-size: 13px; opacity: 0.9;">Entity: <strong>${config.entityName}</strong> (${config.entityType})${(config.registeredAddress || config.address) ? ` • ${config.registeredAddress || config.address}` : ''}</p>
  </div>

  <div style="padding: 24px;">
    <p>${addressee}</p>

    <p>We have compiled the Financial Statements for <strong>${config.entityName}</strong> for the reporting period ending <strong>${config.reportingPeriod}</strong> (Financial Year ${config.financialYear}) in accordance with the Technical Guide on Financial Statements of Non-Corporate Entities issued by the Institute of Chartered Accountants of India (ICAI).</p>

    <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Key Financial Summary (${config.currencyUnit || 'INR'})</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; border-bottom: 1px dashed #cbd5e1;">Balance Sheet Total:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; border-bottom: 1px dashed #cbd5e1; color: #0f172a;">${bsTotal}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; border-bottom: 1px dashed #cbd5e1;">Revenue from Operations:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; border-bottom: 1px dashed #cbd5e1; color: #0f172a;">${revenue}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Net Profit / (Loss) for the Year:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #047857;">${netProfit}</td>
        </tr>
      </table>
    </div>

    <p>The compilation includes:</p>
    <ul style="padding-left: 20px; font-size: 13px; color: #334155;">
      <li><strong>Balance Sheet</strong> classified per ICAI Schedule format</li>
      <li><strong>Statement of Profit and Loss</strong></li>
      <li><strong>Notes to Accounts 1 to 25</strong> with detailed ledger breakdowns</li>
      <li>Accounting Policies and Significant Notes</li>
    </ul>

    <p>Kindly review the statements and convey your approval or any adjustments so we may finalize the audit sign-off and tax return preparations.</p>

    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 4px 0;"><strong>For ${config.auditorFirmName || config.auditorName || 'Chartered Accountants'}</strong></p>
      ${config.auditorFirmName ? '<p style="margin: 0 0 2px 0;">Chartered Accountants</p>' : ''}
      ${config.auditorName ? `<p style="margin: 0 0 2px 0; font-weight: bold; color: #0f172a;">${config.auditorName}${config.auditorRole ? ` (${config.auditorRole})` : ''}</p>` : ''}
      ${config.auditorMembershipNo ? `<p style="margin: 0 0 2px 0;">Membership No: ${config.auditorMembershipNo}</p>` : ''}
      ${config.firmRegistrationNo ? `<p style="margin: 0 0 2px 0;">Firm Reg. No (FRN): ${config.firmRegistrationNo}</p>` : ''}
      ${config.udin ? `<p style="margin: 0 0 2px 0;">UDIN: ${config.udin}</p>` : ''}
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Sent via CA Financial Automation &amp; Audit Workspace</p>
    </div>
  </div>
</div>
`;
    },
  },
  {
    id: 'balance_confirmation_request',
    title: 'External Balance Confirmation Request (SA 505)',
    category: 'confirmations',
    description:
      'Formal audit confirmation letter sent to Sundry Debtors, Creditors, or Banks for independent balance verification.',
    defaultSubject: (config) =>
      `Audit Confirmation of Balance as of ${config.reportingPeriod} — ${config.entityName}`,
    generateHtml: (config, _bs, _pl, additionalInfo) => {
      const partyName = additionalInfo?.partyName || '[Debtor / Creditor / Bank Name]';
      const balanceAmount = additionalInfo?.balanceAmount || '[₹ Balance Amount]';
      const balanceType = additionalInfo?.balanceType || 'Debit / Credit';

      return `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #1e293b; color: #ffffff; padding: 18px 24px;">
    <h2 style="margin: 0 0 4px 0; font-size: 18px;">Independent Balance Confirmation Request</h2>
    <p style="margin: 0; font-size: 12px; opacity: 0.85;">Standard on Auditing (SA 505) — External Confirmations</p>
  </div>

  <div style="padding: 24px;">
    <p>To,<br /><strong>${partyName}</strong></p>

    <p>Dear Sir / Madam,</p>

    <p>In connection with the annual audit of the financial statements of <strong>${config.entityName}</strong> for the period ending <strong>${config.reportingPeriod}</strong>, please confirm directly to our statutory auditors the correctness of the balance shown in their books of accounts as detailed below:</p>

    <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 14px 18px; margin: 18px 0; border-radius: 6px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #475569;">Party Name:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right;">${partyName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #475569;">As of Date:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right;">${config.reportingPeriod}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #475569;">Balance per Client Records:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #0369a1;">${balanceAmount} (${balanceType})</td>
        </tr>
      </table>
    </div>

    <p>If the above balance agrees with your records, please reply to this email confirming the same. If it does not agree, please indicate the discrepancy and attach your ledger statement as of <strong>${config.reportingPeriod}</strong>.</p>

    <p>Your prompt response will greatly assist in the timely completion of the audit.</p>

    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">For <strong>${config.entityName}</strong><br />Authorized Signatory / Audit Team</p>
    </div>
  </div>
</div>
`;
    },
  },
  {
    id: 'audit_queries_requisition',
    title: 'Audit Requisition & Pending Documentation Query',
    category: 'audit',
    description:
      'Requisition list sent to client for pending vouchers, GST/TDS reconciliations, closing stock certificates, and unmapped ledgers.',
    defaultSubject: (config) =>
      `Audit Queries & Pending Requisitions for FY ${config.financialYear} — ${config.entityName}`,
    generateHtml: (config) => {
      return `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #b45309; color: #ffffff; padding: 18px 24px;">
    <h2 style="margin: 0 0 4px 0; font-size: 18px;">Audit Requisition &amp; Query Memorandum</h2>
    <p style="margin: 0; font-size: 12px; opacity: 0.9;">Statutory Audit — ${config.entityName} (FY ${config.financialYear})</p>
  </div>

  <div style="padding: 24px;">
    <p>Dear Accounts Team,</p>

    <p>During the verification of the Trial Balance and draft financial statements for <strong>${config.entityName}</strong> for FY ${config.financialYear}, the audit team noted the following pending requirements and queries for your prompt resolution:</p>

    <ol style="padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
      <li><strong>Closing Stock Certificate:</strong> Signed physical inventory valuation sheet as of ${config.reportingPeriod}, valued at lower of cost or Net Realizable Value (AS 2).</li>
      <li><strong>Bank Statements &amp; BRS:</strong> Year-end bank confirmation certificates and reconciliation statements for all active bank accounts.</li>
      <li><strong>Statutory Dues Reconciliation:</strong> Proof of payment and returns for TDS, GST (GSTR-1 vs 3B vs 2B), and Professional Tax for March ${config.financialYear.split('-')[0]}.</li>
      <li><strong>Capital Introductions:</strong> Bank statements/source documentation for fresh capital introduced by partners/proprietor during the financial year.</li>
      <li><strong>Fixed Assets Additions:</strong> Invoices and proof of installation for plant/equipment additions exceeding ₹10,000 for depreciation verification.</li>
    </ol>

    <p>Kindly provide the above documents and clarifications at your earliest convenience to facilitate finalizing the tax audit report and financial statements.</p>

    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Audit &amp; Assurance Services Team</p>
    </div>
  </div>
</div>
`;
    },
  },
  {
    id: 'management_representation_letter',
    title: 'Management Representation Letter (MRL) Draft',
    category: 'management',
    description:
      'Formal representation letter from client management to statutory auditor affirming completeness of books and statutory compliance.',
    defaultSubject: (config) =>
      `Management Representation Letter Draft — FY ${config.financialYear} — ${config.entityName}`,
    generateHtml: (config, bs, pl) => {
      const bsTotal = bs?.totalEquityAndLiabilities
        ? `₹${bs.totalEquityAndLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : 'As calculated';
      const netProfit = pl?.profitAfterTax
        ? `₹${pl.profitAfterTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : 'As computed';
      const revenue = pl?.revenueFromOperations
        ? `₹${pl.revenueFromOperations.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : (pl?.totalRevenue ? `₹${pl.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'As per accounts');
      const stock = bs?.inventories
        ? `₹${bs.inventories.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null;
      const cashBank = bs?.cashAndBankBalances
        ? `₹${bs.cashAndBankBalances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null;
      const receivables = bs?.tradeReceivables
        ? `₹${bs.tradeReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null;
      const payables = bs?.tradePayables
        ? `₹${bs.tradePayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null;
      const capital = bs?.ownersCapital
        ? `₹${bs.ownersCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null;

      return `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0f766e; color: #ffffff; padding: 18px 24px;">
    <h2 style="margin: 0 0 4px 0; font-size: 18px;">Draft Management Representation Letter (ICAI SA 580)</h2>
    <p style="margin: 0; font-size: 12px; opacity: 0.9;">Carrying Prepared Financial Figures — Period Ended ${config.reportingPeriod}</p>
  </div>

  <div style="padding: 24px; font-size: 13px;">
    <p><strong>[To be printed on Client Letterhead]</strong></p>

    <p>To,<br />The Statutory Auditors,<br />${config.auditorFirmName || config.auditorName || 'Chartered Accountants'}<br />${config.registeredAddress || ''}</p>

    <p>Dear Sirs,</p>

    <p>This representation letter is provided in connection with your audit of the financial statements of <strong>${config.entityName}</strong> for the year ended <strong>${config.reportingPeriod}</strong> for the purpose of expressing an opinion on whether the financial statements give a true and fair view in accordance with the Guidance Note on Financial Statements of Non-Corporate Entities issued by ICAI.</p>

    <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 12px; color: #0f172a; text-transform: uppercase;">Key Financial Balances Confirmed by Management:</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Balance Sheet Total:</td>
          <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${bsTotal}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Revenue from Operations:</td>
          <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${revenue}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Net Profit / (Loss) for the Year:</td>
          <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${netProfit}</td>
        </tr>
        ${stock ? `<tr><td style="padding: 4px 0; color: #64748b;">Closing Inventories:</td><td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${stock}</td></tr>` : ''}
        ${cashBank ? `<tr><td style="padding: 4px 0; color: #64748b;">Cash &amp; Bank Balances:</td><td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${cashBank}</td></tr>` : ''}
        ${receivables ? `<tr><td style="padding: 4px 0; color: #64748b;">Trade Receivables:</td><td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${receivables}</td></tr>` : ''}
        ${payables ? `<tr><td style="padding: 4px 0; color: #64748b;">Trade Payables:</td><td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${payables}</td></tr>` : ''}
        ${capital ? `<tr><td style="padding: 4px 0; color: #64748b;">Owners' / Partners' Capital:</td><td style="padding: 4px 0; font-weight: bold; text-align: right; color: #0f172a;">${capital}</td></tr>` : ''}
      </table>
    </div>

    <p>We confirm, to the best of our knowledge and belief, the following statutory representations:</p>
    <ol style="padding-left: 20px; line-height: 1.7;">
      <li>We acknowledge our responsibility for preparing financial statements in conformity with the ICAI Guidance Note on Non-Corporate Entities.</li>
      <li>All books of account, registers, branch returns, contracts, bank statements, and vouchers have been made available to you.</li>
      <li>Closing inventories${stock ? ` amounting to <strong>${stock}</strong>` : ''} as of ${config.reportingPeriod} were physically verified and valued at the lower of cost or net realizable value on FIFO basis.</li>
      <li>Cash-in-hand${cashBank ? ` and bank balances totaling <strong>${cashBank}</strong>` : ''} were physically counted/reconciled and tallied with books as of ${config.reportingPeriod}.</li>
      <li>Trade receivables${receivables ? ` of <strong>${receivables}</strong>` : ''} and advances are considered good and recoverable; adequate provision for doubtful debts has been provided.</li>
      <li>Trade payables${payables ? ` of <strong>${payables}</strong>` : ''} have been identified under Section 22 of the MSMED Act, 2006, and no overdue interest is payable.</li>
      <li>No cash loans or deposits exceeding the ₹20,000 threshold under Sections 269SS/269T of the Income Tax Act were accepted or repaid.</li>
      <li>There are no material unrecorded liabilities, undisclosed contingent liabilities, or pending tax litigations other than disclosed.</li>
      <li>There have been no frauds, suspected frauds, or non-compliances with laws affecting the entity.</li>
      <li>Related party transactions and partners' remuneration comply strictly with the Partnership Deed and Section 40(b) limits.</li>
      <li>No events have occurred subsequent to the balance sheet date that require adjustments to the financial statements.</li>
    </ol>

    <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0;">For <strong>${config.entityName}</strong></p>
      <br /><br />
      <p style="margin: 0;">_____________________________</p>
      <p style="margin: 4px 0 0 0; color: #64748b;">${config.signingPartnerName || config.proprietorName || 'Partner / Proprietor / Authorized Signatory'}</p>
    </div>
  </div>
</div>
`;
    },
  },
];
