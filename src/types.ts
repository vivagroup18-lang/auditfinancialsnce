export type AccountingNature = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export type StatementType = 'BalanceSheet' | 'ProfitAndLoss';

export interface TrialBalanceRow {
  id: string;
  accountCode?: string;
  accountName: string;
  openingDebit?: number;
  openingCredit?: number;
  transactionDebit?: number;
  transactionCredit?: number;
  closingDebit: number;
  closingCredit: number;
  netBalance: number; // positive = normal balance for nature, negative = abnormal
  rawLineIndex?: number;
}

export interface MappedLedger {
  id?: string;
  accountCode?: string;
  accountName: string;
  originalDebit: number;
  originalCredit: number;
  netBalance: number;
  nature?: AccountingNature;
  statement: StatementType;
  noteNumber: number; // 3 to 25
  noteName: string;
  subCategory: string;
  confidence?: number; // 0 to 1
  mappingConfidence?: number;
  mappingRuleUsed?: string;
  isUserOverridden?: boolean;
  mappingMethod?: 'rule' | 'ai' | 'manual';
  auditFlag?: string; // abnormal balance, etc.
  displayBalance?: number; // signed balance for statutory schedule display & totals
  previousYearBalance?: number; // signed balance for prior year disclosure
  pyDebit?: number;
  pyCredit?: number;
  linkedStatementItem?: string; // e.g. "Trade Payables - Creditors in uploaded Balance Sheet"
  aiReasoning?: string;
}

export interface UploadedFinancialLineItem {
  id: string;
  particulars: string;
  noteNumber?: number | string;
  currentPeriodAmount: number;
  previousPeriodAmount?: number;
  rawCategory?: string; // e.g. "Owners' Funds", "Current Liabilities", "Expenses"
  scheduleReference?: string;
}

export interface UploadedStatementDoc {
  fileName: string;
  fileType: 'BalanceSheet' | 'ProfitAndLoss' | 'CombinedFinancials' | 'PYBalanceSheet' | 'PYProfitAndLoss';
  period?: 'CY' | 'PY';
  financialYear?: string;
  uploadedAt: string;
  items: UploadedFinancialLineItem[];
  detectedTotal?: number;
  detectedPreviousTotal?: number;
  hasPreviousYear: boolean;
}

export interface NoteDefinition {
  noteNumber: number;
  name: string;
  statement: StatementType;
  nature: AccountingNature;
  description: string;
  subCategories: string[];
  mandatoryDisclosures?: string[];
}

export interface NoteScheduleData {
  noteNumber: number;
  noteName: string;
  statement: StatementType;
  totalAmount: number;
  previousYearAmount?: number;
  items: MappedLedger[];
  subTotals: Record<string, number>;
  pySubTotals?: Record<string, number>;
  statutoryNotes?: string[];
  partnerCapitalTable?: PartnerCapitalRecord[];
  pyPartnerCapitalTable?: PartnerCapitalRecord[];
}

export interface PartnerCapitalRecord {
  srNo: number;
  partnerName: string;
  profitSharePercent: number;
  profitShareRatio?: string;
  remunerationSharePercent?: number;
  remunerationShareRatio?: string;
  isWorkingPartner?: boolean;
  isDesignatedPartner?: boolean;
  openingBalance: number;
  openingNature?: 'Cr' | 'Dr';
  capitalIntroduced: number;
  remuneration: number;
  partnersRemuneration?: number;
  interestOnCapital: number;
  withdrawals: number;
  drawings?: number;
  shareOfProfit: number;
  shareOfProfitOrLoss?: number;
  closingBalance: number;
  pyOpeningBalance?: number;
  pyOpeningNature?: 'Cr' | 'Dr';
  pyCapitalIntroduced?: number;
  pyRemuneration?: number;
  pyInterestOnCapital?: number;
  pyWithdrawals?: number;
  pyShareOfProfit?: number;
  pyClosingBalance?: number;
}

export interface BalanceSheetData {
  // EQUITY AND LIABILITIES
  // Owners' Funds
  ownersCapital: number; // Note 3
  reservesAndSurplus: number; // Note 4
  totalOwnersFunds: number;

  // Non-current liabilities
  longTermBorrowings: number; // Note 5
  deferredTaxLiabilities: number; // Note 6
  otherLongTermLiabilities: number; // Note 7
  longTermProvisions: number; // Note 8
  totalNonCurrentLiabilities: number;

  // Current liabilities
  shortTermBorrowings: number; // Note 5
  tradePayables: number; // Note 9
  tradePayablesMsme?: number;
  tradePayablesOther?: number;
  otherCurrentLiabilities: number; // Note 10
  shortTermProvisions: number; // Note 8
  totalCurrentLiabilities: number;

  totalEquityAndLiabilities: number;

  // ASSETS
  // Non-current assets
  // Property, Plant and Equipment and Intangible assets
  propertyPlantEquipment: number; // Note 11
  intangibleAssets: number; // Note 11
  capitalWorkInProgress: number; // Note 11
  intangibleAssetUnderDevelopment: number; // Note 11
  nonCurrentInvestments: number; // Note 12
  deferredTaxAssets: number; // Note 6
  longTermLoansAndAdvances: number; // Note 13
  otherNonCurrentAssets: number; // Note 14
  totalNonCurrentAssets: number;

  // Current assets
  currentInvestments: number; // Note 12
  inventories: number; // Note 15
  tradeReceivables: number; // Note 16
  cashAndBankBalances: number; // Note 17
  shortTermLoansAndAdvances: number; // Note 13
  otherCurrentAssets: number; // Note 18
  totalCurrentAssets: number;

  totalAssets: number;
  difference: number;
  isBalanced: boolean;
  isPreviousYearUploaded?: boolean;
  previousYearFileName?: string;

  // Prior Year Comparatives (31 March 20XX - PY)
  previousYear: {
    ownersCapital: number;
    reservesAndSurplus: number;
    totalOwnersFunds: number;
    longTermBorrowings: number;
    deferredTaxLiabilities: number;
    otherLongTermLiabilities: number;
    longTermProvisions: number;
    totalNonCurrentLiabilities: number;
    shortTermBorrowings: number;
    tradePayables: number;
    tradePayablesMsme?: number;
    tradePayablesOther?: number;
    otherCurrentLiabilities: number;
    shortTermProvisions: number;
    totalCurrentLiabilities: number;
    totalEquityAndLiabilities: number;
    propertyPlantEquipment: number;
    intangibleAssets: number;
    capitalWorkInProgress: number;
    intangibleAssetUnderDevelopment: number;
    nonCurrentInvestments: number;
    deferredTaxAssets: number;
    longTermLoansAndAdvances: number;
    otherNonCurrentAssets: number;
    totalNonCurrentAssets: number;
    currentInvestments: number;
    inventories: number;
    tradeReceivables: number;
    cashAndBankBalances: number;
    shortTermLoansAndAdvances: number;
    otherCurrentAssets: number;
    totalCurrentAssets: number;
    totalAssets: number;
  };
}

export interface ProfitAndLossData {
  revenueFromOperations: number; // Note 19
  otherIncome: number; // Note 20
  totalRevenue: number;

  // Expenses:
  costOfGoodsSold: number; // Note 21
  costOfMaterialsConsumed?: number; // Alias for costOfRawMaterialsConsumed
  costOfRawMaterialsConsumed: number; // Note 21 (A)
  purchasesOfStockInTrade: number; // Note 21 (B)
  changesInInventories: number; // Note 21 (C)
  employeeBenefitsExpense: number; // Note 22
  financeCosts: number; // Note 23
  depreciationExpense: number; // Note 24
  otherExpenses: number; // Note 25
  totalExpenses: number;

  profitBeforeExceptionalAndTax: number; // (III - IV)
  exceptionalItems: number;
  profitBeforeExtraordinaryAndTax: number; // (V - VI)
  extraordinaryItems: number;
  profitBeforePartnersRemunerationAndTax: number; // (VII - VIII)
  partnersRemuneration: number; // Partners' remuneration*
  partnersRemunerationItems?: MappedLedger[];
  profitBeforeTax: number; // (IX - X)

  // Tax expense
  currentTax: number;
  excessShortTaxEarlierYears: number;
  deferredTaxCharge: number; // Note 6
  deferredTax?: number; // Alias for deferredTaxCharge
  totalTaxExpense: number;

  profitFromContinuingOps: number;
  profitFromDiscontinuingOps: number;
  taxExpenseDiscontinuingOps: number;
  profitFromDiscontinuingOpsAfterTax: number;
  profitAfterTax: number; // Profit/(Loss) for the year
  isPreviousYearUploaded?: boolean;
  previousYearFileName?: string;

  // Prior Year Comparatives (31 March 20XX - PY)
  previousYear: {
    revenueFromOperations: number;
    otherIncome: number;
    totalRevenue: number;
    costOfGoodsSold: number;
    costOfMaterialsConsumed?: number;
    costOfRawMaterialsConsumed?: number;
    purchasesOfStockInTrade?: number;
    changesInInventories?: number;
    employeeBenefitsExpense: number;
    financeCosts: number;
    depreciationExpense: number;
    otherExpenses: number;
    totalExpenses: number;
    profitBeforeExceptionalAndTax: number;
    exceptionalItems: number;
    profitBeforeExtraordinaryAndTax: number;
    extraordinaryItems: number;
    profitBeforePartnersRemunerationAndTax: number;
    partnersRemuneration: number;
    partnersRemunerationItems?: MappedLedger[];
    profitBeforeTax: number;
    currentTax: number;
    excessShortTaxEarlierYears: number;
    deferredTaxCharge: number;
    deferredTax?: number;
    profitAfterTax: number;
  };
}

export interface AuditException {
  id: string;
  type: 'UNMAPPED_LEDGER' | 'TB_OUT_OF_BALANCE' | 'BS_OUT_OF_BALANCE' | 'ABNORMAL_SIGN' | 'ZERO_CLOSING_TRANSACTED' | 'SUSPENSE_ACCOUNT' | 'MSME_DISCLOSURE';
  severity: 'high' | 'medium' | 'low';
  accountName?: string;
  amount?: number;
  message: string;
  recommendation: string;
  resolved?: boolean;
}

export interface CustomAdjustmentEntry {
  id: string;
  particulars: string;
  amount: number;
  isDebit: boolean;
  noteNumber: number;
  statement: StatementType;
}

export interface YearEndAdjustments {
  closingStockCY?: number;
  closingStockPY?: number;
  provisionForTaxCY?: number;
  provisionForTaxPY?: number;
  depreciationCY?: number;
  depreciationPY?: number;
  partnerRemunerationCY?: number;
  customAdjustments?: CustomAdjustmentEntry[];
}

export interface TradePayablesMsmeConfig {
  // Statutory Sub-classification (CY & PY)
  msmeAmountCY?: number;
  msmeAmountPY?: number;
  othersAmountCY?: number;
  othersAmountPY?: number;

  // MSMED Act Section 22 Disclosures (CY & PY)
  // Clause (a): Principal & Interest
  msmeSec22PrincipalCY?: number;
  msmeSec22PrincipalPY?: number;
  msmeSec22InterestCY?: number;
  msmeSec22InterestPY?: number;

  // Clause (b): Delayed payments & Interest paid under Sec 16
  msmeSec22DelayedPaymentsCY?: number;
  msmeSec22DelayedPaymentsPY?: number;
  msmeSec22InterestPaidCY?: number;
  msmeSec22InterestPaidPY?: number;

  // Clause (c): Interest due and payable for delay without MSMED interest
  msmeSec22InterestDueDelayCY?: number;
  msmeSec22InterestDueDelayPY?: number;

  // Clause (d): Interest accrued and remaining unpaid
  msmeSec22InterestAccruedCY?: number;
  msmeSec22InterestAccruedPY?: number;

  // Clause (e): Further interest remaining due in succeeding years
  msmeSec22FurtherInterestCY?: number;
  msmeSec22FurtherInterestPY?: number;

  // Trade Payables Aging Schedule (CY)
  agingMsmeLess1Yr?: number;
  agingMsme1To2Yrs?: number;
  agingMsme2To3Yrs?: number;
  agingMsmeMore3Yrs?: number;

  agingOthersLess1Yr?: number;
  agingOthers1To2Yrs?: number;
  agingOthers2To3Yrs?: number;
  agingOthersMore3Yrs?: number;

  agingDisputedMsmeLess1Yr?: number;
  agingDisputedMsme1To2Yrs?: number;
  agingDisputedMsme2To3Yrs?: number;
  agingDisputedMsmeMore3Yrs?: number;

  agingDisputedOthersLess1Yr?: number;
  agingDisputedOthers1To2Yrs?: number;
  agingDisputedOthers2To3Yrs?: number;
  agingDisputedOthersMore3Yrs?: number;
}

export interface EntityConfig {
  entityName: string;
  entityType: 'Partnership Firm' | 'Sole Proprietorship' | 'LLP' | 'AOP/BOI';
  reportingPeriod: string; // e.g. "March 31, 2026"
  previousReportingPeriod?: string; // e.g. "March 31, 2025"
  financialYear: string; // "2025-26"
  previousFinancialYear?: string; // "2024-25"
  natureOfBusiness?: string;
  pan?: string;
  gstin?: string;
  address?: string;
  registeredAddress?: string;
  placeOfSigning?: string;
  dateOfSigning?: string;
  proprietorName?: string;
  signingPartnerName?: string;
  currencyUnit?: 'INR' | 'Lakhs' | 'Crores';
  auditorFirmName?: string;
  auditorName?: string;
  auditorRole?: 'Partner' | 'Proprietor';
  auditorMembershipNo?: string;
  firmRegistrationNo?: string;
  udin?: string;
  taxRatePercent: number;
  transferProfitTo: 'reserves' | 'partners_capital' | 'proprietor_capital';
  yearEndAdjustments?: YearEndAdjustments;
  partnerCapitalSchedule?: PartnerCapitalRecord[];
  pyPartnerCapitalSchedule?: PartnerCapitalRecord[];
  tradePayablesConfig?: TradePayablesMsmeConfig;
  partners?: Array<{
    name: string;
    profitSharePercent?: number;
    remunerationSharePercent?: number;
    isWorkingPartner?: boolean;
    isDesignatedPartner?: boolean;
    isSigningPartner?: boolean;
    openingBalance?: number;
    openingNature?: 'Cr' | 'Dr';
    capitalIntroduced?: number;
    remuneration?: number;
    interestOnCapital?: number;
    withdrawals?: number;
    shareOfProfit?: number;
    closingBalance?: number;
    pyOpeningBalance?: number;
    pyCapitalIntroduced?: number;
    pyRemuneration?: number;
    pyInterestOnCapital?: number;
    pyWithdrawals?: number;
    pyShareOfProfit?: number;
    pyClosingBalance?: number;
  }>;
}

export interface Company {
  id: string;
  config: EntityConfig;
  tbFileName?: string;
  rawRows: TrialBalanceRow[];
  mappedLedgers: MappedLedger[];
  mappingExceptions: AuditException[];
  pyFileName?: string;
  pyRawRows: TrialBalanceRow[];
  pyMappedLedgers: MappedLedger[];
  pyMappingExceptions: AuditException[];
  uploadedBalanceSheet?: UploadedStatementDoc;
  uploadedProfitAndLoss?: UploadedStatementDoc;
  uploadedPYBalanceSheet?: UploadedStatementDoc;
  uploadedPYProfitAndLoss?: UploadedStatementDoc;
  yearEndAdjustments?: YearEndAdjustments;
  createdAt?: string;
  updatedAt?: string;
  userEmail?: string; // Owning CA/user email (e.g. "ca.user@gmail.com")
  userId?: string;    // Owning user profile ID
}

export type SubscriptionTier = 'free_trial' | 'professional' | 'enterprise';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'canceled';

export type BillingCycle = 'monthly' | 'yearly';

export interface UserUsage {
  companiesCount: number;
  maxCompanies: number;
  aiMappingsUsed: number;
  maxAiMappings: number;
}

export interface UserInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  planName: string;
  planTier: SubscriptionTier;
  billingCycle: BillingCycle;
  subtotal: number;
  gstAmount: number; // 18% GST (CGST + SGST or IGST)
  totalAmount: number;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Demo' | 'Razorpay';
  transactionId: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  creditsGranted?: number;
  discountAmount?: number;
  promoCode?: string;
  firmName?: string;
  gstin?: string;
  notes?: string;
}

export interface CreditTransaction {
  id: string;
  date: string; // ISO date string
  amount: number; // positive = added, negative = consumed
  type: 'SIGNUP_BONUS' | 'REFERRAL_REWARD' | 'REFERRED_WELCOME_BONUS' | 'SUBSCRIPTION_GRANT' | 'TOPUP' | 'AI_MAPPING' | 'AUDIT_DIAGNOSTICS' | 'EXCEL_EXPORT';
  description: string;
  balanceAfter: number;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceINR: number;
  popular?: boolean;
  tagline: string;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  maxCompanies: number;
  maxAiMappings: number;
  popular?: boolean;
  badge?: string;
  features: { text: string; included: boolean; highlight?: boolean }[];
  limitations?: string[];
}

export interface PromoCode {
  code: string;
  discountPercent: number;
  description: string;
  validUntil?: string;
}

export interface UserProfile {
  id: string; // unique internal ID
  userId: string; // unique public User ID / handle, e.g. "ca_balaji" or "audit_pro_01"
  fullName: string;
  email: string;
  mobile: string;
  password?: string;
  firmName?: string;
  membershipNo?: string;
  pan?: string;
  gstin?: string;
  avatarUrl?: string;
  planTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string; // ISO date string
  billingCycle: BillingCycle;
  credits: number; // Current available credit balance (Claude-style)
  referralCode: string; // Unique shareable referral code, e.g. "REF-BALAJI24"
  referredBy?: string; // Referral code of person who referred this user
  referralsCount: number; // Total colleagues invited
  totalReferralCredits: number; // Total credits earned from referrals (500 * count)
  creditTransactions: CreditTransaction[]; // Ledger of credit activities
  usage: UserUsage;
  invoices?: UserInvoice[];
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  user: UserProfile;
  isLoggedIn: boolean;
}

// Type aliases for report structures
export type BalanceSheetReport = BalanceSheetData;
export type ProfitLossReport = ProfitAndLossData;


