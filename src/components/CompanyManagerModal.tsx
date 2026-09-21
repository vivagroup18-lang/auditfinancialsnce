import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Check,
  Trash2,
  Copy,
  Edit3,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Save,
} from 'lucide-react';
import { Company, EntityConfig } from '../types';
import { PartnerConfigForm } from './PartnerConfigForm';

interface CompanyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onCreateCompany: (
    config: EntityConfig,
    starterType: 'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone',
    cloneSourceId?: string
  ) => void;
  onUpdateCompanyConfig: (companyId: string, updatedConfig: EntityConfig) => void;
  onDeleteCompany: (companyId: string) => void;
  onDuplicateCompany: (companyId: string) => void;
  initialTab?: 'list' | 'add' | 'edit';
  initialEditingCompanyId?: string;
  onOpenBackupRestore?: () => void;
}

export const CompanyManagerModal: React.FC<CompanyManagerModalProps> = ({
  isOpen,
  onClose,
  companies,
  activeCompanyId,
  onSelectCompany,
  onCreateCompany,
  onUpdateCompanyConfig,
  onDeleteCompany,
  onDuplicateCompany,
  initialTab = 'list',
  initialEditingCompanyId,
  onOpenBackupRestore,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>(initialTab);
  const [editingCompanyId, setEditingCompanyId] = useState<string>(
    initialEditingCompanyId || activeCompanyId
  );

  // New Company Form State
  const [newConfig, setNewConfig] = useState<EntityConfig>({
    entityName: '',
    entityType: 'Partnership Firm',
    financialYear: '2024-25',
    reportingPeriod: 'March 31, 2025',
    previousFinancialYear: '2023-24',
    previousReportingPeriod: 'March 31, 2024',
    currencyUnit: 'INR',
    taxRatePercent: 30,
    transferProfitTo: 'partners_capital',
    address: '',
    registeredAddress: '',
    placeOfSigning: '',
    dateOfSigning: '',
    proprietorName: '',
    signingPartnerName: '',
    auditorFirmName: '',
    auditorName: '',
    auditorRole: 'Partner',
    auditorMembershipNo: '',
    firmRegistrationNo: '',
    udin: '',
  });

  const [starterType, setStarterType] = useState<
    'blank' | 'sample_partnership' | 'sample_proprietorship' | 'clone'
  >('blank');
  const [cloneSourceId, setCloneSourceId] = useState<string>(activeCompanyId);

  // Custom In-App Modal State for Company Deletion (Bypasses iframe window.confirm blockage)
  const [deletingCompany, setDeletingCompany] = useState<{ id: string; name: string } | null>(null);

  // Edit Company Form State
  const companyToEdit = companies.find((c) => c.id === editingCompanyId) || companies[0];
  const [editFormData, setEditFormData] = useState<EntityConfig>(
    companyToEdit ? { ...companyToEdit.config } : newConfig
  );

  // When editing company changes, sync form data
  const handleStartEdit = (companyId: string) => {
    setEditingCompanyId(companyId);
    const comp = companies.find((c) => c.id === companyId);
    if (comp) {
      setEditFormData({
        ...comp.config,
        signingPartnerName: comp.config.signingPartnerName || comp.config.partners?.[0]?.name || '',
      });
    }
    setActiveTab('edit');
  };

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfig.entityName.trim()) return;

    onCreateCompany(newConfig, starterType, cloneSourceId);
    // Reset form
    setNewConfig({
      entityName: '',
      entityType: 'Partnership Firm',
      financialYear: '2024-25',
      reportingPeriod: 'March 31, 2025',
      previousFinancialYear: '2023-24',
      previousReportingPeriod: 'March 31, 2024',
      currencyUnit: 'INR',
      taxRatePercent: 30,
      transferProfitTo: 'partners_capital',
      address: '',
      registeredAddress: '',
      placeOfSigning: '',
      dateOfSigning: '',
      proprietorName: '',
      signingPartnerName: '',
      auditorFirmName: '',
      auditorName: '',
      auditorRole: 'Partner',
      auditorMembershipNo: '',
      firmRegistrationNo: '',
      udin: '',
    });
    setActiveTab('list');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.entityName.trim()) return;
    onUpdateCompanyConfig(editingCompanyId, editFormData);
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Company & Entity Manager</h3>
              <p className="text-xs text-slate-400">
                Manage multiple client entities, audit parameters, and financial years
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenBackupRestore && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackupRestore();
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Backup & Restore</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition rounded p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50 shrink-0">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>All Companies ({companies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'add'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add New Company</span>
            </button>

            {activeTab === 'edit' && (
              <button
                className="py-3 px-4 text-xs font-semibold border-b-2 border-emerald-600 text-emerald-700 bg-white flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Edit Parameters: {companyToEdit?.config.entityName || 'Company'}</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline-block">
            Active: <strong className="text-slate-800">{companies.find((c) => c.id === activeCompanyId)?.config.entityName}</strong>
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: LIST OF COMPANIES */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Configured Companies & Entities</h4>
                  <p className="text-xs text-slate-500">
                    Switch between entities to audit trial balances and generate statutory financial statements.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('add')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Company</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {companies.map((company) => {
                  const isActive = company.id === activeCompanyId;
                  const cyCount = company.mappedLedgers?.length || 0;
                  const pyCount = company.pyMappedLedgers?.length || 0;

                  return (
                    <div
                      key={company.id}
                      className={`rounded-xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-slate-900 text-sm truncate">
                            {company.config.entityName}
                          </h5>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Active Entity
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {company.config.entityType}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            FY {company.config.financialYear} ({company.config.reportingPeriod})
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>Comp. FY {company.config.previousFinancialYear || '2023-24'}</span>
                          <span className="text-slate-300">•</span>
                          <span>Tax Rate: {company.config.taxRatePercent}%</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                          <span className="text-slate-500">
                            CY Ledgers:{' '}
                            <strong className="text-slate-800">{cyCount}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">
                            PY Ledgers:{' '}
                            <strong className="text-slate-800">{pyCount}</strong>
                          </span>
                          {(company.config.auditorFirmName || company.config.auditorName) && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 truncate max-w-[260px]" title={`${company.config.auditorFirmName ? `${company.config.auditorFirmName} • ` : ''}${company.config.auditorName || ''} (${company.config.auditorRole || 'Partner'})`}>
                                Auditor: {company.config.auditorName || company.config.auditorFirmName}
                                {company.config.auditorRole ? ` (${company.config.auditorRole})` : ''}
                                {company.config.auditorMembershipNo ? ` • M:${company.config.auditorMembershipNo}` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {!isActive ? (
                          <button
                            onClick={() => {
                              onSelectCompany(company.id);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                          >
                            <span>Switch</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                            Selected
                          </span>
                        )}

                        <button
                          onClick={() => handleStartEdit(company.id)}
                          title="Edit Entity Configuration & Audit Parameters"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit Parameters</span>
                        </button>

                        <button
                          onClick={() => onDuplicateCompany(company.id)}
                          title="Duplicate Company"
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingCompany({ id: company.id, name: company.config.entityName })}
                          title="Delete Company"
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW COMPANY */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-slate-800 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-950">Add New Company / Client Entity</div>
                  <div className="text-[11px] text-emerald-800">
                    Provide the entity details and audit parameters. You can start with a fresh blank ledger set or pre-populate with an ICAI benchmark dataset.
                  </div>
                </div>
              </div>

              {/* Company Starter Template Selection */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Initial Data & Ledger Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`border rounded-lg p-3 cursor-pointer transition flex items-start gap-2.5 ${
                      starterType === 'blank'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starterType"
                      checked={starterType === 'blank'}
                      onChange={() => setStarterType('blank')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Blank Company</div>
                      <div className="text-[10px] text-slate-500">
                        Start fresh with zero ledgers; upload new CY & PY Trial Balances
                      </div>
                    </div>
                  </label>

                  <label
                    className={`border rounded-lg p-3 cursor-pointer transition flex items-start gap-2.5 ${
                      starterType === 'sample_partnership'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starterType"
                      checked={starterType === 'sample_partnership'}
                      onChange={() => {
                        setStarterType('sample_partnership');
                        setNewConfig((prev) => ({
                          ...prev,
                          entityType: 'Partnership Firm',
                          transferProfitTo: 'partners_capital',
                        }));
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Manufacturing Partnership Template</div>
                      <div className="text-[10px] text-slate-500">
                        Preloads 48 CY & PY ledgers with partners' capital, term loans, and GST
                      </div>
                    </div>
                  </label>

                  <label
                    className={`border rounded-lg p-3 cursor-pointer transition flex items-start gap-2.5 ${
                      starterType === 'sample_proprietorship'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starterType"
                      checked={starterType === 'sample_proprietorship'}
                      onChange={() => {
                        setStarterType('sample_proprietorship');
                        setNewConfig((prev) => ({
                          ...prev,
                          entityType: 'Sole Proprietorship',
                          transferProfitTo: 'partners_capital',
                        }));
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Trading Proprietorship Template</div>
                      <div className="text-[10px] text-slate-500">
                        Preloads trading ledgers, proprietor drawings, MSME payables, and debtors
                      </div>
                    </div>
                  </label>

                  <label
                    className={`border rounded-lg p-3 cursor-pointer transition flex items-start gap-2.5 ${
                      starterType === 'clone'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="starterType"
                      checked={starterType === 'clone'}
                      onChange={() => setStarterType('clone')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Clone Existing Company</div>
                      <div className="text-[10px] text-slate-500">
                        Copy mapped ledgers & parameters from an existing company
                      </div>
                    </div>
                  </label>
                </div>

                {starterType === 'clone' && (
                  <div className="mt-2 pl-2">
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Select Source Company to Clone From:
                    </label>
                    <select
                      value={cloneSourceId}
                      onChange={(e) => setCloneSourceId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.config.entityName} ({c.config.entityType} • FY {c.config.financialYear})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Basic Entity Information */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <h5 className="font-bold text-slate-800">Entity Details</h5>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Company / Entity Legal Name *
                  </label>
                  <input
                    type="text"
                    value={newConfig.entityName}
                    onChange={(e) => setNewConfig({ ...newConfig, entityName: e.target.value })}
                    placeholder="e.g. Shree Ganesh Textiles & Garments"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Constitution Type</label>
                    <select
                      value={newConfig.entityType}
                      onChange={(e) =>
                        setNewConfig({
                          ...newConfig,
                          entityType: e.target.value as any,
                          transferProfitTo:
                            e.target.value === 'LLP' ? 'reserves' : 'partners_capital',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Partnership Firm">Partnership Firm</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="LLP">Limited Liability Partnership (LLP)</option>
                      <option value="AOP/BOI">Association of Persons (AOP/BOI)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Currency Reporting Unit</label>
                    <select
                      value={newConfig.currencyUnit}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, currencyUnit: e.target.value as any })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="INR">Indian Rupees (₹)</option>
                      <option value="Lakhs">₹ in Lakhs</option>
                      <option value="Crores">₹ in Crores</option>
                    </select>
                  </div>
                </div>


                {/* Proprietor Name for Sole Proprietorship */}
                {newConfig.entityType === 'Sole Proprietorship' && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <label className="block font-semibold text-amber-950 mb-1">
                      Name of Proprietor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newConfig.proprietorName || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, proprietorName: e.target.value })}
                      placeholder="e.g. Shri Ramesh Kumar / Proprietor Legal Name"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-800 block mt-0.5">
                      Disclosed on Note 3 (Proprietor's Capital Account), Balance Sheet, and Statutory Sign-off
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Registered Office / Principal Place of Business</label>
                  <input
                    type="text"
                    value={newConfig.registeredAddress || newConfig.address || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, registeredAddress: e.target.value, address: e.target.value })}
                    placeholder="e.g. Shop No. 4, Market Yard, Pune - 411037"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Place of Signing</label>
                    <input
                      type="text"
                      value={newConfig.placeOfSigning || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, placeOfSigning: e.target.value })}
                      placeholder="e.g. Pune / Mumbai"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Date of Signing</label>
                    <input
                      type="text"
                      value={newConfig.dateOfSigning || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, dateOfSigning: e.target.value })}
                      placeholder="e.g. March 31, 2025"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Current Financial Year</label>
                    <input
                      type="text"
                      value={newConfig.financialYear}
                      onChange={(e) => setNewConfig({ ...newConfig, financialYear: e.target.value })}
                      placeholder="2024-25"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Current Reporting Period Date</label>
                    <input
                      type="text"
                      value={newConfig.reportingPeriod}
                      onChange={(e) => setNewConfig({ ...newConfig, reportingPeriod: e.target.value })}
                      placeholder="March 31, 2025"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Previous Financial Year (Comparative)</label>
                    <input
                      type="text"
                      value={newConfig.previousFinancialYear || '2023-24'}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, previousFinancialYear: e.target.value })
                      }
                      placeholder="2023-24"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Previous Reporting Period Date</label>
                    <input
                      type="text"
                      value={newConfig.previousReportingPeriod || 'March 31, 2024'}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, previousReportingPeriod: e.target.value })
                      }
                      placeholder="March 31, 2024"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Audit & Tax Parameters */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <h5 className="font-bold text-slate-800">Audit & Tax Parameters</h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Income Tax Rate (%)</label>
                    <input
                      type="number"
                      value={newConfig.taxRatePercent}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, taxRatePercent: Number(e.target.value) })
                      }
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Profit Transfer Destination</label>
                    <select
                      value={newConfig.transferProfitTo}
                      onChange={(e) =>
                        setNewConfig({
                          ...newConfig,
                          transferProfitTo: e.target.value as 'partners_capital' | 'reserves',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="partners_capital">Partners' / Proprietor Capital (Note 3)</option>
                      <option value="reserves">Reserves & Surplus (Note 4)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">CA / Audit Firm Name</label>
                    <input
                      type="text"
                      value={newConfig.auditorFirmName || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, auditorFirmName: e.target.value })}
                      placeholder="e.g. M/s Sutar & Associates, Chartered Accountants"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Chartered Accountant Name</label>
                    <input
                      type="text"
                      value={newConfig.auditorName || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, auditorName: e.target.value })}
                      placeholder="e.g. CA. Vishal Sutar"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Role / Designation</label>
                    <select
                      value={newConfig.auditorRole || 'Partner'}
                      onChange={(e) =>
                        setNewConfig({
                          ...newConfig,
                          auditorRole: e.target.value as 'Partner' | 'Proprietor',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="Partner">Partner</option>
                      <option value="Proprietor">Proprietor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">ICAI Membership No.</label>
                    <input
                      type="text"
                      value={newConfig.auditorMembershipNo || ''}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, auditorMembershipNo: e.target.value })
                      }
                      placeholder="e.g. 142536"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Firm Reg. No. (FRN)</label>
                    <input
                      type="text"
                      value={newConfig.firmRegistrationNo || ''}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, firmRegistrationNo: e.target.value })
                      }
                      placeholder="e.g. 109876W"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unique Document Identification Number (UDIN)</label>
                  <input
                    type="text"
                    value={newConfig.udin || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, udin: e.target.value })}
                    placeholder="e.g. 25142536AAAAAA1234 (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Partners & Sharing Ratios for Partnership Firm and LLP */}
              {(newConfig.entityType === 'Partnership Firm' || newConfig.entityType === 'LLP') && (
                <PartnerConfigForm
                  entityType={newConfig.entityType}
                  partners={newConfig.partners || [
                    { name: 'Partner 1', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0, openingNature: 'Cr' },
                    { name: 'Partner 2', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0, openingNature: 'Cr' },
                  ]}
                  onChange={(updated) => setNewConfig({ ...newConfig, partners: updated })}
                  signingPartnerName={newConfig.signingPartnerName}
                  onSigningPartnerChange={(name) => setNewConfig({ ...newConfig, signingPartnerName: name })}
                />
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Company</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EDIT EXISTING COMPANY PARAMETERS */}
          {activeTab === 'edit' && companyToEdit && (
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 text-slate-800 flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <Edit3 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-indigo-950">
                      Editing Parameters: {companyToEdit.config.entityName}
                    </div>
                    <div className="text-[11px] text-indigo-800">
                      Changes here directly update this company's Balance Sheet, P&L, Notes 1 to 25, and Tax Audit schedules.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold"
                >
                  Back to List
                </button>
              </div>

              {/* Entity Name & Constitution */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Company / Entity Legal Name *</label>
                <input
                  type="text"
                  value={editFormData.entityName}
                  onChange={(e) => setEditFormData({ ...editFormData, entityName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Constitution Type</label>
                  <select
                    value={editFormData.entityType}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, entityType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Partnership Firm">Partnership Firm</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="AOP/BOI">Association of Persons (AOP/BOI)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Currency Unit</label>
                  <select
                    value={editFormData.currencyUnit}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, currencyUnit: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="INR">Indian Rupees (₹)</option>
                    <option value="Lakhs">₹ in Lakhs</option>
                    <option value="Crores">₹ in Crores</option>
                  </select>
                </div>
              </div>

              {/* Proprietor Name for Sole Proprietorship */}
              {editFormData.entityType === 'Sole Proprietorship' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <label className="block font-semibold text-amber-950 mb-1">
                    Name of Proprietor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.proprietorName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, proprietorName: e.target.value })}
                    placeholder="e.g. Shri Ramesh Kumar / Proprietor Legal Name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-amber-800 block mt-0.5">
                    Disclosed on Note 3 (Proprietor's Capital Account), Balance Sheet, and Statutory Sign-off
                  </span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Registered Office / Principal Place of Business</label>
                <input
                  type="text"
                  value={editFormData.registeredAddress || editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, registeredAddress: e.target.value, address: e.target.value })}
                  placeholder="e.g. Shop No. 4, Market Yard, Pune - 411037"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Place of Signing</label>
                  <input
                    type="text"
                    value={editFormData.placeOfSigning || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, placeOfSigning: e.target.value })}
                    placeholder="e.g. Pune / Mumbai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date of Signing</label>
                  <input
                    type="text"
                    value={editFormData.dateOfSigning || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, dateOfSigning: e.target.value })}
                    placeholder="e.g. March 31, 2025"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reporting Periods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Current Financial Year</label>
                  <input
                    type="text"
                    value={editFormData.financialYear}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, financialYear: e.target.value })
                    }
                    placeholder="2024-25"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Current Reporting Period Date</label>
                  <input
                    type="text"
                    value={editFormData.reportingPeriod}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, reportingPeriod: e.target.value })
                    }
                    placeholder="March 31, 2025"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Previous Financial Year (Comparative)</label>
                  <input
                    type="text"
                    value={editFormData.previousFinancialYear || '2023-24'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, previousFinancialYear: e.target.value })
                    }
                    placeholder="2023-24"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Previous Reporting Period Date</label>
                  <input
                    type="text"
                    value={editFormData.previousReportingPeriod || 'March 31, 2024'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, previousReportingPeriod: e.target.value })
                    }
                    placeholder="March 31, 2024"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tax & Profit Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Income Tax Rate (%)</label>
                  <input
                    type="number"
                    value={editFormData.taxRatePercent}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, taxRatePercent: Number(e.target.value) })
                    }
                    step="0.5"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Profit Transfer Destination</label>
                  <select
                    value={editFormData.transferProfitTo}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        transferProfitTo: e.target.value as 'partners_capital' | 'reserves',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="partners_capital">Partners' / Proprietor Capital (Note 3)</option>
                    <option value="reserves">Reserves & Surplus (Note 4)</option>
                  </select>
                </div>
              </div>

              {/* Auditor Details */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <h5 className="font-bold text-slate-800">Auditor Credentials</h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">CA / Audit Firm Name</label>
                    <input
                      type="text"
                      value={editFormData.auditorFirmName || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, auditorFirmName: e.target.value })
                      }
                      placeholder="e.g. M/s Sutar & Associates, Chartered Accountants"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Chartered Accountant Name</label>
                    <input
                      type="text"
                      value={editFormData.auditorName || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, auditorName: e.target.value })
                      }
                      placeholder="e.g. CA. Vishal Sutar"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Role / Designation</label>
                    <select
                      value={editFormData.auditorRole || 'Partner'}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          auditorRole: e.target.value as 'Partner' | 'Proprietor',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="Partner">Partner</option>
                      <option value="Proprietor">Proprietor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">ICAI Membership No.</label>
                    <input
                      type="text"
                      value={editFormData.auditorMembershipNo || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, auditorMembershipNo: e.target.value })
                      }
                      placeholder="e.g. 142536"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Firm Reg. No. (FRN)</label>
                    <input
                      type="text"
                      value={editFormData.firmRegistrationNo || ''}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, firmRegistrationNo: e.target.value })
                      }
                      placeholder="e.g. 109876W"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unique Document Identification Number (UDIN)</label>
                  <input
                    type="text"
                    value={editFormData.udin || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, udin: e.target.value })}
                    placeholder="e.g. 25142536AAAAAA1234 (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Partners & Sharing Ratios for Partnership Firm and LLP */}
              {(editFormData.entityType === 'Partnership Firm' || editFormData.entityType === 'LLP') && (
                <PartnerConfigForm
                  entityType={editFormData.entityType}
                  partners={editFormData.partners || [
                    { name: 'Partner 1', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0, openingNature: 'Cr' },
                    { name: 'Partner 2', profitSharePercent: 50, remunerationSharePercent: 50, isWorkingPartner: true, isDesignatedPartner: true, openingBalance: 0, openingNature: 'Cr' },
                  ]}
                  onChange={(updated) => setEditFormData({ ...editFormData, partners: updated })}
                  signingPartnerName={editFormData.signingPartnerName}
                  onSigningPartnerChange={(name) => setEditFormData({ ...editFormData, signingPartnerName: name })}
                />
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Entity Parameters</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Company Confirmation Dialog */}
        {deletingCompany && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 text-left flex-1">
                  <h3 className="text-base font-bold text-slate-900">Delete Client Company</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {companies.length === 1 ? (
                      <>
                        Are you sure you want to delete <strong className="text-slate-900">{deletingCompany.name}</strong>? As this is the only client entity in the workspace, deleting it will clear all trial balances, mappings, and schedules, returning the workspace to a clean slate.
                      </>
                    ) : (
                      <>
                        Are you sure you want to delete <strong className="text-slate-900">{deletingCompany.name}</strong>? All mapped trial balances, adjustments, and statements for this entity will be removed.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCompany(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCompany(deletingCompany.id);
                    setDeletingCompany(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{companies.length === 1 ? 'Reset Workspace' : 'Delete Entity'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
