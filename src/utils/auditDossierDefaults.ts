import { EntityConfig, AuditAppointmentConfig, CoverPageConfig, ManagementRepresentationConfig } from '../types';

export function getDefaultAuditAppointment(config: EntityConfig): AuditAppointmentConfig {
  const existing = config.auditAppointment || {};
  const currentFY = config.financialYear || '2025-26';
  const startYear = parseInt(currentFY.slice(0, 4), 10) || 2025;
  const assessmentYear = `${startYear + 1}-${(startYear + 2).toString().slice(2)}`;

  const isProprietor = config.entityType === 'Sole Proprietorship';
  const signingPerson = isProprietor
    ? config.proprietorName || 'Proprietor'
    : config.signingPartnerName || config.partners?.find((p) => p.isSigningPartner)?.name || config.partners?.[0]?.name || 'Managing Partner';

  return {
    appointmentDate: existing.appointmentDate || `15-09-${startYear}`,
    resolutionNumber: existing.resolutionNumber || `AUD/APPT/${currentFY}/01`,
    appointingAuthority: existing.appointingAuthority || (isProprietor ? 'Sole Proprietor' : 'Partners of the Firm'),
    auditTenure: existing.auditTenure || `Financial Year ${currentFY} (Assessment Year ${assessmentYear})`,
    statutorySection: existing.statutorySection || 'Section 44AB of the Income Tax Act, 1961 read with ICAI Non-Corporate Entity Guidance Note',
    proposedAuditFees: existing.proposedAuditFees ?? 25000,
    auditFeeTerms: existing.auditFeeTerms || 'Plus applicable GST and reimbursement of actual out-of-pocket expenses incurred.',
    priorAuditorName: existing.priorAuditorName || '',
    hasPriorAuditorNoc: existing.hasPriorAuditorNoc ?? true,
    nocReference: existing.nocReference || 'NOC obtained / continuing appointment under ICAI Code of Ethics',
    scopeDescription: existing.scopeDescription || 'Audit of Balance Sheet, Statement of Profit & Loss, 25 Statutory Notes to Accounts, and Form 3CB/3CD Tax Audit Annexures.',
    acceptanceDate: existing.acceptanceDate || `20-09-${startYear}`,
    acceptanceLetterRef: existing.acceptanceLetterRef || `CA/AUD/ACC/${currentFY}/01`,
    appointeeSignatory: existing.appointeeSignatory || signingPerson,
  };
}

export function getDefaultCoverPage(config: EntityConfig): CoverPageConfig {
  const existing = config.coverPageConfig || {};
  const currentFY = config.financialYear || '2025-26';
  const startYear = parseInt(currentFY.slice(0, 4), 10) || 2025;
  const assessmentYear = `${startYear + 1}-${(startYear + 2).toString().slice(2)}`;

  return {
    reportTitle: existing.reportTitle || 'STATUTORY AUDIT REPORT & FINANCIAL STATEMENTS',
    reportSubtitle: existing.reportSubtitle || `For the Financial Year Ended ${config.reportingPeriod || 'March 31, 2026'} | Assessment Year ${assessmentYear}`,
    theme: existing.theme || 'navy',
    includeIndex: existing.includeIndex ?? true,
    includeUdinBanner: existing.includeUdinBanner ?? true,
    includeFirmBadge: existing.includeFirmBadge ?? true,
    confidentialNotice: existing.confidentialNotice || 'PRIVILEGED & CONFIDENTIAL • PREPARED IN ACCORDANCE WITH ICAI GUIDANCE NOTE ON NON-CORPORATE ENTITIES',
    customDossierNotes: existing.customDossierNotes || `Audited under the Standards on Auditing (SAs) issued by the Institute of Chartered Accountants of India (ICAI).`,
    documentDate: existing.documentDate || config.dateOfSigning || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
  };
}

export function getDefaultManagementRepresentation(config: EntityConfig): ManagementRepresentationConfig {
  const existing = config.managementRepresentation || {};
  const isProprietor = config.entityType === 'Sole Proprietorship';
  const signingPerson = isProprietor
    ? config.proprietorName || 'Proprietor'
    : config.signingPartnerName || config.partners?.find((p) => p.isSigningPartner)?.name || config.partners?.[0]?.name || 'Managing Partner';

  return {
    letterDate: existing.letterDate || config.dateOfSigning || '31-03-2026',
    signatoryName: existing.signatoryName || signingPerson,
    signatoryDesignation: existing.signatoryDesignation || (isProprietor ? 'Sole Proprietor' : 'Managing Partner'),
    coSignatoryName: existing.coSignatoryName || (config.partners?.[1]?.name || ''),
    coSignatoryDesignation: existing.coSignatoryDesignation || (config.partners?.[1] ? 'Partner' : ''),
    inventoryValuationMethod: existing.inventoryValuationMethod || 'Valued at lower of cost or net realizable value on FIFO basis, physically verified by management as on year-end.',
    physicalVerificationConfirmed: existing.physicalVerificationConfirmed ?? true,
    cashInHandVerified: existing.cashInHandVerified ?? true,
    receivablesRecoverableConfirmed: existing.receivablesRecoverableConfirmed ?? true,
    msmeComplianceConfirmed: existing.msmeComplianceConfirmed ?? true,
    sec269ComplianceConfirmed: existing.sec269ComplianceConfirmed ?? true,
    fraudDeclarationConfirmed: existing.fraudDeclarationConfirmed ?? true,
    litigationDetails: existing.litigationDetails || 'No disputed tax demands or court litigations outstanding against the entity.',
    contingentLiabilitiesDetails: existing.contingentLiabilitiesDetails || 'There are no contingent liabilities or capital commitments that require disclosure.',
    relatedPartyConfirmed: existing.relatedPartyConfirmed ?? true,
    subsequentEventsConfirmed: existing.subsequentEventsConfirmed ?? true,
    customRepresentations: existing.customRepresentations || 'All transactions have been recorded in the accounting records and are reflected in the financial statements in accordance with applicable deed and regulations.',
    includeFinancialFiguresInClauses: existing.includeFinancialFiguresInClauses ?? true,
    includeFinancialSummaryTable: existing.includeFinancialSummaryTable ?? true,
  };
}
