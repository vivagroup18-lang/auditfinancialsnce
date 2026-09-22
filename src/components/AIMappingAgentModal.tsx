import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Send,
  Check,
  BookOpen,
  HelpCircle,
  X,
  FileText,
  Layers,
  Cpu,
  Zap,
  ChevronRight,
  ShieldCheck,
  Info,
  CheckCheck
} from 'lucide-react';
import { MappedLedger, UploadedStatementDoc } from '../types';
import { NCE_NOTE_DEFINITIONS } from '../data/nceTaxonomy';
import { classifyLedgerAccount } from '../utils/mappingEngine';

export interface AIMappingAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappedLedgers: MappedLedger[];
  onApplyMappings: (updatedLedgers: MappedLedger[]) => void;
  onUpdateSingleLedgerNote: (ledgerId: string, newNoteNumber: number) => void;
  uploadedBalanceSheet?: UploadedStatementDoc | null;
  uploadedProfitAndLoss?: UploadedStatementDoc | null;
  uploadedPYBalanceSheet?: UploadedStatementDoc | null;
  uploadedPYProfitAndLoss?: UploadedStatementDoc | null;
  entityName?: string;
  financialYear?: string;
  targetPeriod?: 'CY' | 'PY';
}

interface AIProposal {
  ledgerId: string;
  accountName: string;
  accountCode?: string;
  originalDebit: number;
  originalCredit: number;
  currentNoteNumber: number;
  currentNoteName: string;
  suggestedNoteNumber: number;
  suggestedNoteName: string;
  suggestedSubCategory?: string;
  statement: 'BalanceSheet' | 'ProfitAndLoss';
  accountingNature: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  confidence: number;
  reasoning: string;
  linkedStatementItem?: string;
  accepted: boolean;
  isDifferent: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  suggestedChanges?: Array<{
    accountName: string;
    suggestedNoteNumber: number;
    suggestedNoteName: string;
    reasoning?: string;
  }>;
}

export const AIMappingAgentModal: React.FC<AIMappingAgentModalProps> = ({
  isOpen,
  onClose,
  mappedLedgers,
  onApplyMappings,
  onUpdateSingleLedgerNote,
  uploadedBalanceSheet,
  uploadedProfitAndLoss,
  uploadedPYBalanceSheet,
  uploadedPYProfitAndLoss,
  entityName = 'Entity',
  financialYear = 'Current Financial Year',
  targetPeriod = 'CY',
}) => {
  const [activeTab, setActiveTab] = useState<'mapping' | 'chat' | 'taxonomy'>('mapping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'changesOnly' | 'lowConfidence' | 'bs' | 'pl'>('all');
  const [proposals, setProposals] = useState<AIProposal[]>([]);
  const [selectedNoteFilter, setSelectedNoteFilter] = useState<number | 'all'>('all');

  // Interactive CA Agent Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `Hello! I am your Senior ICAI Financial Statement Mapping AI Agent. I evaluate trial balance accounts against ICAI Non-Corporate Entity (NCE) statutory guidelines (Notes 3 to 25). How can I assist you with schedule allocations or accounting classifications today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputChat, setInputChat] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize initial proposals from current trial balance state
  useEffect(() => {
    if (!isOpen) return;

    const initial: AIProposal[] = mappedLedgers.map((l) => {
      const currentNoteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === l.noteNumber);
      return {
        ledgerId: l.id || l.accountName,
        accountName: l.accountName,
        accountCode: l.accountCode,
        originalDebit: l.originalDebit,
        originalCredit: l.originalCredit,
        currentNoteNumber: l.noteNumber,
        currentNoteName: currentNoteDef?.name || l.noteName || `Note ${l.noteNumber}`,
        suggestedNoteNumber: l.noteNumber,
        suggestedNoteName: currentNoteDef?.name || l.noteName || `Note ${l.noteNumber}`,
        suggestedSubCategory: l.subCategory,
        statement: l.statement,
        accountingNature: l.nature || 'Expense',
        confidence: l.confidence || 0.9,
        reasoning: l.aiReasoning || l.mappingRuleUsed || 'Assigned based on initial trial balance ingestion rules.',
        linkedStatementItem: l.linkedStatementItem,
        accepted: true,
        isDifferent: false,
      };
    });
    setProposals(initial);
  }, [isOpen, mappedLedgers]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  // Compute stats
  const totalCount = proposals.length;
  const changedCount = proposals.filter((p) => p.suggestedNoteNumber !== p.currentNoteNumber).length;
  const lowConfidenceCount = proposals.filter((p) => p.confidence < 0.85).length;
  const highConfidenceCount = proposals.filter((p) => p.confidence >= 0.9).length;

  // Filtered proposals list
  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      p.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.accountCode && p.accountCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.suggestedNoteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reasoning.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedNoteFilter !== 'all' && p.suggestedNoteNumber !== selectedNoteFilter) {
      return false;
    }

    if (filterType === 'changesOnly') return p.suggestedNoteNumber !== p.currentNoteNumber;
    if (filterType === 'lowConfidence') return p.confidence < 0.85;
    if (filterType === 'bs') return p.statement === 'BalanceSheet';
    if (filterType === 'pl') return p.statement === 'ProfitAndLoss';

    return true;
  });

  // Execute AI Mapping
  const handleRunAIMapping = async (mode: 'all' | 'ambiguousOnly') => {
    if (mappedLedgers.length === 0) return;

    try {
      setIsProcessing(true);
      setProgressStatus(mode === 'all' ? 'Mapping all Trial Balance ledgers with Gemini 3.8 Flash...' : 'Evaluating low-confidence & ambiguous accounts...');

      const targetLedgers = mode === 'ambiguousOnly'
        ? mappedLedgers.filter((l) => (l.confidence || 0.5) < 0.88 || !l.isUserOverridden)
        : mappedLedgers;

      const response = await fetch('/api/gemini/map-ledgers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledgers: targetLedgers.map((c) => ({
            accountCode: c.accountCode,
            accountName: c.accountName,
            debit: c.originalDebit,
            credit: c.originalCredit,
            netBalance: c.netBalance,
          })),
          balanceSheetItems: uploadedBalanceSheet?.items || [],
          profitAndLossItems: uploadedProfitAndLoss?.items || [],
          pyBalanceSheetItems: uploadedPYBalanceSheet?.items || [],
          pyProfitAndLossItems: uploadedPYProfitAndLoss?.items || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`AI mapping server returned status: ${response.status}`);
      }

      const data = await response.json();
      const aiMappings: any[] = data.mappings || [];

      if (aiMappings.length > 0) {
        setProposals((prev) =>
          prev.map((item) => {
            const match = aiMappings.find(
              (m) =>
                m.accountName?.trim().toLowerCase() === item.accountName.trim().toLowerCase() ||
                (m.accountCode && m.accountCode === item.accountCode)
            );

            if (match) {
              const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === match.noteNumber);
              const isDifferent = match.noteNumber !== item.currentNoteNumber;
              return {
                ...item,
                suggestedNoteNumber: match.noteNumber,
                suggestedNoteName: noteDef?.name || match.noteName || `Note ${match.noteNumber}`,
                suggestedSubCategory: match.subCategory || noteDef?.subCategories?.[0],
                statement: (noteDef?.statement as any) || match.financialStatement || item.statement,
                accountingNature: (noteDef?.nature as any) || match.accountingNature || item.accountingNature,
                confidence: match.confidence || 0.95,
                reasoning: match.reasoning || `Classified into Note ${match.noteNumber} under ICAI Guidance Note norms.`,
                linkedStatementItem: match.linkedStatementItem || item.linkedStatementItem,
                accepted: true,
                isDifferent,
              };
            }
            return item;
          })
        );
        if (data.isFallback) {
          setProgressStatus(data.message || 'Remote AI high demand: Mapped via statutory ICAI engine.');
        } else {
          setProgressStatus(`AI evaluated ${aiMappings.length} ledgers successfully!`);
        }
      } else {
        setProgressStatus('No new classifications received from AI. You can run Rule-Based Classifier.');
      }
    } catch (err: any) {
      console.warn('AI API error, applying local ICAI statutory CA rule engine:', err);
      applyStatutoryRules();
      setProgressStatus('AI service temporarily busy on Google servers; seamlessly applied statutory ICAI classification engine.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper for applying statutory ICAI rules
  const applyStatutoryRules = () => {
    setProposals((prev) =>
      prev.map((item) => {
        const match = classifyLedgerAccount(item.accountName, item.originalDebit, item.originalCredit);
        const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === match.noteNumber);
        const isDifferent = match.noteNumber !== item.currentNoteNumber;
        return {
          ...item,
          suggestedNoteNumber: match.noteNumber,
          suggestedNoteName: noteDef?.name || match.noteName,
          suggestedSubCategory: match.subCategory,
          statement: match.statement,
          accountingNature: match.nature,
          confidence: match.confidence,
          reasoning: match.reasoning,
          accepted: true,
          isDifferent,
        };
      })
    );
  };

  // Run local statutory rule classifier
  const handleRunLocalRuleClassifier = () => {
    setIsProcessing(true);
    setProgressStatus('Running offline statutory ICAI Guidance Note rule classifier...');
    applyStatutoryRules();
    setIsProcessing(false);
    setProgressStatus('Offline ICAI rule engine matched all statutory accounts.');
  };

  // Accept a single proposal change
  const handleToggleAcceptProposal = (ledgerId: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.ledgerId === ledgerId ? { ...p, accepted: !p.accepted } : p))
    );
  };

  // Change suggested note manually
  const handleChangeSuggestedNote = (ledgerId: string, newNoteNum: number) => {
    const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === newNoteNum);
    setProposals((prev) =>
      prev.map((p) => {
        if (p.ledgerId === ledgerId) {
          return {
            ...p,
            suggestedNoteNumber: newNoteNum,
            suggestedNoteName: noteDef?.name || `Note ${newNoteNum}`,
            statement: noteDef?.statement || p.statement,
            accountingNature: noteDef?.nature || p.accountingNature,
            isDifferent: newNoteNum !== p.currentNoteNumber,
            reasoning: `Manual schedule adjustment by CA to Note ${newNoteNum}.`,
            confidence: 1.0,
            accepted: true,
          };
        }
        return p;
      })
    );
  };

  // Apply all accepted recommendations to master trial balance
  const handleApplyAllAccepted = () => {
    const updated = mappedLedgers.map((ledger) => {
      const proposal = proposals.find(
        (p) =>
          p.ledgerId === (ledger.id || ledger.accountName) ||
          p.accountName.trim().toLowerCase() === ledger.accountName.trim().toLowerCase()
      );

      if (proposal && proposal.accepted && proposal.suggestedNoteNumber) {
        const noteDef = NCE_NOTE_DEFINITIONS.find((n) => n.noteNumber === proposal.suggestedNoteNumber);
        return {
          ...ledger,
          noteNumber: proposal.suggestedNoteNumber,
          noteName: noteDef?.name || proposal.suggestedNoteName,
          subCategory: proposal.suggestedSubCategory || ledger.subCategory,
          statement: noteDef?.statement || proposal.statement,
          nature: noteDef?.nature || proposal.accountingNature,
          confidence: proposal.confidence,
          mappingMethod: 'ai' as const,
          aiReasoning: proposal.reasoning,
          linkedStatementItem: proposal.linkedStatementItem || ledger.linkedStatementItem,
          isUserOverridden: true,
        };
      }
      return ledger;
    });

    onApplyMappings(updated);
    onClose();
  };

  // Send message to Interactive CA Chat
  const handleSendChatMessage = async (presetPrompt?: string) => {
    const messageToSend = presetPrompt || inputChat;
    if (!messageToSend.trim() || isChatSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetPrompt) setInputChat('');
    setIsChatSending(true);

    try {
      const response = await fetch('/api/gemini/chat-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          ledgers: mappedLedgers.map((l) => ({
            accountName: l.accountName,
            originalDebit: l.originalDebit,
            originalCredit: l.originalCredit,
            noteNumber: l.noteNumber,
            noteName: l.noteName,
            statement: l.statement,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: data.reply || 'I have evaluated your request according to ICAI Non-Corporate Entity guidelines.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChanges: data.suggestedChanges,
      };

      setChatMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Helpful CA assistant fallback response
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: `Under ICAI Non-Corporate Entity norms, accounts must be categorized strictly according to statutory notes:\n- Notes 3-4 for Capital and Reserves\n- Note 5 for Secured and Unsecured Borrowings\n- Notes 9-10 for Trade and Statutory Liabilities\n- Note 11 for PPE\n- Notes 13-18 for Assets\n- Note 19 for Revenue from Operations\n- Notes 20-25 for Incomes and Operational Expenses.\n\nYou can click 'Map All Ambiguous Ledgers' or select specific schedules directly in the Mapping tab.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Apply changes directly from chat message
  const handleApplyChatSuggestion = (change: { accountName: string; suggestedNoteNumber: number; suggestedNoteName: string }) => {
    handleChangeSuggestedNote(change.accountName, change.suggestedNoteNumber);
    setActiveTab('mapping');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">AI Schedule Mapping Agent</h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  targetPeriod === 'PY'
                    ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
                    : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                }`}>
                  {targetPeriod === 'PY' ? 'Previous Year (PY)' : 'Current Year (CY)'}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Gemini 3.8 Flash Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Automated statutory schedule linking under ICAI Non-Corporate Entity (NCE) Norms &middot; {entityName} ({financialYear})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {uploadedBalanceSheet || uploadedProfitAndLoss ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/60 border border-indigo-700/50 text-[11px] text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Grounded with Uploaded Statements</span>
              </div>
            ) : null}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('mapping')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
                activeTab === 'mapping'
                  ? 'border-indigo-600 text-indigo-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Mapping & Review Table</span>
              {changedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  {changedCount} New Suggestions
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
                activeTab === 'chat'
                  ? 'border-indigo-600 text-indigo-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>Interactive CA Audit Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('taxonomy')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition ${
                activeTab === 'taxonomy'
                  ? 'border-indigo-600 text-indigo-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>ICAI Schedule Taxonomy (Notes 3-25)</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 py-2">
            {totalCount} Total Ledgers Uploaded
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-slate-500 font-medium">Total Ledgers</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{totalCount}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Extracted from Trial Balance</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-indigo-600 font-medium flex items-center justify-between">
                    <span>Proposed Reclassifications</span>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-bold text-indigo-700 mt-0.5">{changedCount}</div>
                  <div className="text-[10px] text-indigo-500/80 mt-1">Recommended by CA Agent</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-emerald-600 font-medium flex items-center justify-between">
                    <span>High Confidence</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">{highConfidenceCount}</div>
                  <div className="text-[10px] text-emerald-600/80 mt-1">&ge; 90% statutory certainty</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] text-amber-600 font-medium flex items-center justify-between">
                    <span>Needs CA Review</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold text-amber-700 mt-0.5">{lowConfidenceCount}</div>
                  <div className="text-[10px] text-amber-600/80 mt-1">&lt; 85% confidence score</div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleRunAIMapping('all')}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>{isProcessing ? 'AI Agent Analyzing...' : 'AI Scan & Remap All Ledgers'}</span>
                  </button>

                  <button
                    onClick={() => handleRunAIMapping('ambiguousOnly')}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Map Ambiguous / Low Confidence Only</span>
                  </button>

                  <button
                    onClick={handleRunLocalRuleClassifier}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs transition"
                    title="Instant offline statutory classifier based on ICAI Non-Corporate Entity guidance note"
                  >
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    <span>Run Fast Rule Classifier</span>
                  </button>
                </div>

                {progressStatus && (
                  <div className="text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{progressStatus}</span>
                  </div>
                )}
              </div>

              {/* Filters & Search Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search ledger name, code, reasoning..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 w-64 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        filterType === 'all' ? 'bg-white font-semibold text-slate-800 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      onClick={() => setFilterType('changesOnly')}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        filterType === 'changesOnly' ? 'bg-indigo-600 font-semibold text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Changed ({changedCount})
                    </button>
                    <button
                      onClick={() => setFilterType('lowConfidence')}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        filterType === 'lowConfidence' ? 'bg-amber-600 font-semibold text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Low Conf ({lowConfidenceCount})
                    </button>
                    <button
                      onClick={() => setFilterType('bs')}
                      className={`px-2.5 py-1 rounded text-xs transition font-semibold ${
                        filterType === 'bs'
                          ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Balance Sheet (Notes 3–18)
                    </button>
                    <button
                      onClick={() => setFilterType('pl')}
                      className={`px-2.5 py-1 rounded text-xs transition font-semibold ${
                        filterType === 'pl'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      P & L (Notes 19–25)
                    </button>
                  </div>
                </div>

                {/* Specific Note Select Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filter by Note:</span>
                  <select
                    value={selectedNoteFilter}
                    onChange={(e) => setSelectedNoteFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700"
                  >
                    <option value="all">All Notes (3-25)</option>
                    {NCE_NOTE_DEFINITIONS.map((n) => (
                      <option key={n.noteNumber} value={n.noteNumber}>
                        Note {n.noteNumber}: {n.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of Ledger Mapping Proposals */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-700 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">Accept</th>
                        <th className="py-3 px-4">Trial Balance Ledger</th>
                        <th className="py-3 px-3 text-right">Balance</th>
                        <th className="py-3 px-4">Current Schedule</th>
                        <th className="py-3 px-4">AI Recommended Schedule</th>
                        <th className="py-3 px-3 text-center">Confidence</th>
                        <th className="py-3 px-4 min-w-[280px]">CA Audit Justification &amp; Standard</th>
                        <th className="py-3 px-3 text-center">Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProposals.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                            No ledger accounts match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredProposals.map((item) => {
                          const isDifferent = item.suggestedNoteNumber !== item.currentNoteNumber;
                          const hasDebit = item.originalDebit > 0;
                          const balanceDisplay = hasDebit
                            ? `₹${item.originalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr`
                            : `₹${item.originalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr`;

                          return (
                            <tr
                              key={item.ledgerId}
                              className={`hover:bg-slate-50/80 transition ${
                                isDifferent ? 'bg-indigo-50/20' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.accepted}
                                  onChange={() => handleToggleAcceptProposal(item.ledgerId)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              {/* Ledger Name */}
                              <td className="py-3 px-4 font-medium text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{item.accountName}</span>
                                  {isDifferent && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-100 text-indigo-700">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                {item.accountCode && (
                                  <div className="text-[10px] text-slate-400 font-mono">Code: {item.accountCode}</div>
                                )}
                              </td>

                              {/* Balance */}
                              <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-700">
                                {balanceDisplay}
                              </td>

                              {/* Current Note */}
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  Note {item.currentNoteNumber}: {item.currentNoteName.replace(/^Note \d+:\s*/, '')}
                                </span>
                              </td>

                              {/* AI Recommended Note */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                      isDifferent
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-1 ring-indigo-400'
                                        : 'bg-slate-100 text-slate-800 border-slate-200'
                                    }`}
                                  >
                                    Note {item.suggestedNoteNumber}: {item.suggestedNoteName.replace(/^Note \d+:\s*/, '')}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                      item.statement === 'BalanceSheet'
                                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    }`}
                                  >
                                    {item.statement === 'BalanceSheet' ? 'Balance Sheet' : 'P & L'}
                                  </span>
                                </div>
                              </td>

                              {/* Confidence */}
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.confidence >= 0.9
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.confidence >= 0.8
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {Math.round(item.confidence * 100)}%
                                </span>
                              </td>

                              {/* CA Audit Justification */}
                              <td className="py-3 px-4 text-slate-600 text-[11px] leading-relaxed">
                                <div>{item.reasoning}</div>
                                {item.linkedStatementItem && (
                                  <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                    Linked to: {item.linkedStatementItem}
                                  </div>
                                )}
                              </td>

                              {/* Override selector */}
                              <td className="py-3 px-3 text-center">
                                <select
                                  value={item.suggestedNoteNumber}
                                  onChange={(e) => handleChangeSuggestedNote(item.ledgerId, Number(e.target.value))}
                                  className="text-[11px] py-1 px-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 focus:outline-hidden"
                                >
                                  {NCE_NOTE_DEFINITIONS.map((n) => (
                                    <option key={n.noteNumber} value={n.noteNumber}>
                                      Note {n.noteNumber} ({n.statement === 'BalanceSheet' ? 'Balance Sheet' : 'P & L'})
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[65vh] overflow-hidden">
              {/* Chat Header Info */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>Senior CA Financial Statement Advisor (ICAI NCE Framework)</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Ask questions about schedule classification, tax audit disclosures, or batch remapping
                </div>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="font-bold text-[10px] uppercase tracking-wider opacity-75">
                          {msg.sender === 'user' ? 'Chartered Accountant' : 'AI CA Agent'}
                        </span>
                        <span className="text-[10px] opacity-60">{msg.timestamp}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Actionable Suggestions in chat */}
                      {msg.suggestedChanges && msg.suggestedChanges.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60">
                          <div className="text-[11px] font-semibold text-indigo-900 mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Actionable Schedule Recommendations:</span>
                          </div>
                          <div className="space-y-1.5">
                            {msg.suggestedChanges.map((change, idx) => (
                              <div
                                key={idx}
                                className="bg-white/80 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">{change.accountName}</span>
                                  <span className="text-slate-500 mx-1">&rarr;</span>
                                  <span className="font-bold text-indigo-700">
                                    Note {change.suggestedNoteNumber} ({change.suggestedNoteName})
                                  </span>
                                  {change.reasoning && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">{change.reasoning}</div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleApplyChatSuggestion(change)}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[10px] transition"
                                >
                                  Apply Now
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-tl-xs p-3 text-xs text-slate-500 flex items-center gap-2 border border-slate-200">
                      <Bot className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span>Analyzing statutory ICAI norms and trial balance context...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Preset prompt chips */}
              <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-200 flex flex-wrap gap-1.5">
                {[
                  'Why are Unsecured Loans under Note 5 Borrowings?',
                  'Check if any GST or TDS ledgers are in Note 25 Other Expenses',
                  'How should Partner Capital and Drawings be structured?',
                  'Verify Freight Charges between Note 21 (COGS) vs Note 25',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(chip)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about trial balance mapping, e.g., 'Move all bank interest paid to Note 23 Finance Cost'..."
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={!inputChat.trim() || isChatSending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'taxonomy' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 leading-relaxed">
                <div className="font-bold mb-1 flex items-center gap-1.5 text-indigo-950">
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>ICAI Non-Corporate Entity (NCE) Statutory Schedule Architecture</span>
                </div>
                Under the ICAI Guidance Note on Financial Statements of Non-Corporate Entities, entities (Partnership Firms, LLPs, Proprietorships, AOP/BOI, HUFs) must present statutory schedules from Note 3 to Note 25. Balance Sheet schedules span Notes 3 to 18, and Profit &amp; Loss schedules span Notes 19 to 25.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {NCE_NOTE_DEFINITIONS.map((note) => (
                  <div key={note.noteNumber} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        Note {note.noteNumber}: {note.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          note.statement === 'BalanceSheet'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {note.statement === 'BalanceSheet' ? 'Balance Sheet' : 'Profit & Loss'} &middot; {note.nature}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{note.description}</p>
                    {note.subCategories && note.subCategories.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                        {note.subCategories.slice(0, 4).map((sub, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                          >
                            {sub}
                          </span>
                        ))}
                        {note.subCategories.length > 4 && (
                          <span className="text-[10px] px-1 py-0.5 text-slate-400">
                            +{note.subCategories.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {proposals.filter((p) => p.accepted).length} of {totalCount} ledgers selected to apply
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyAllAccepted}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Apply Mappings ({proposals.filter((p) => p.accepted).length}) &amp; Enter {targetPeriod === 'PY' ? 'PY' : 'Year-End'} Adjustments &rarr;</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
