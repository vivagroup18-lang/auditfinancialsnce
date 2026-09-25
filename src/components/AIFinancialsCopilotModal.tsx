import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  X,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  Lightbulb,
  Maximize2,
  Minimize2,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { EntityConfig } from '../types';

export interface AIFinancialsCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EntityConfig;
  trialBalanceSummary?: {
    totalDebits: number;
    totalCredits: number;
    isTallied: boolean;
    ledgerCount: number;
  };
  currentStep?: number;
  driveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  userEmail?: string;
  initialPrompt?: string;
  onNavigateStep?: (step: number) => void;
  onOpenModal?: (modalName: string) => void;
  onOpenManualSection?: (sectionKey?: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  suggestedActions?: Array<{
    label: string;
    actionType: string;
    step?: number;
    modal?: string;
    section?: string;
  }>;
}

// Lightweight Markdown Renderer for clean CA responses
function formatMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pl-2 text-slate-700">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1.5 flex items-center gap-1.5">
          <span>{parseInline(trimmed.slice(4))}</span>
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5 key={idx} className="font-bold text-slate-800 text-xs mt-2.5 mb-1 uppercase tracking-wide">
          {parseInline(trimmed.slice(5))}
        </h5>
      );
      return;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(
        <li key={idx} className="text-xs leading-relaxed">
          {parseInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
      if (match) {
        elements.push(
          <div key={idx} className="flex items-start gap-1.5 my-1 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-emerald-700 shrink-0">{match[1]}</span>
            <span>{parseInline(match[2])}</span>
          </div>
        );
      }
      return;
    }

    if (!trimmed) {
      flushList();
      elements.push(<div key={idx} className="h-1.5" />);
      return;
    }

    flushList();
    elements.push(
      <p key={idx} className="text-xs text-slate-700 my-1 leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

function parseInline(text: string): React.ReactNode {
  // Replace **bold**
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-emerald-800 border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const AIFinancialsCopilotModal: React.FC<AIFinancialsCopilotModalProps> = ({
  isOpen,
  onClose,
  config,
  trialBalanceSummary,
  currentStep = 1,
  driveSyncStatus = 'idle',
  userEmail,
  initialPrompt,
  onNavigateStep,
  onOpenModal,
  onOpenManualSection,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `### Welcome to your Senior ICAI Financials & App Copilot 👋\n\nI am your specialized Chartered Accountant AI Assistant for **${config.entityName || 'Non-Corporate Entities'}**.\n\nI can assist you with:\n* **App Guidance**: Trial Balance uploads, AI ledger mapping, previous year comparatives, and Excel exports.\n* **ICAI NCE Taxonomy**: Notes 1 to 28 schedule definitions and financial statement linkages.\n* **Tax Audits & Disclosures**: Partner remuneration under **Section 40(b)**, 12% interest on capital, and **MSME Trade Payables** disclosures under Form 3CD Clause 22.\n* **Accounting Standards**: Level IV entity exemptions and standards applicability.\n\nHow can I help you today?`,
      timestamp: 'Just now',
      suggestedActions: [
        { label: '5-Step Workflow Guide', actionType: 'open_manual', section: 'workflow' },
        { label: 'Partner Remuneration u/s 40(b)', actionType: 'open_modal', modal: 'partner_capital' },
        { label: 'MSME Disclosures', actionType: 'open_modal', modal: 'trade_payables_msme' },
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle initial prompt if passed
  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const promptSuggestions = useMemo(
    () => [
      'How do I use this app from start to finish?',
      'How is partner remuneration calculated u/s 40(b)?',
      'Which Accounting Standards apply to Level IV entities?',
      'How to resolve Trial Balance debit/credit mismatch?',
      'What are the mandatory disclosures for MSME Trade Payables?',
      'How do I reconnect Google Drive when session expires?',
      'How do I enter closing stock for AS-2 compliance?',
    ],
    []
  );

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputQuery('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/gemini/nce-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: messages.slice(-5).map((m) => ({ sender: m.sender, text: m.text })),
          context: {
            activeCompany: {
              entityName: config.entityName,
              entityType: config.entityType,
              financialYear: config.financialYear,
              pan: config.pan,
            },
            trialBalanceSummary,
            currentStep,
            driveSyncStatus,
            userEmail,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const agentReply: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: data.reply || 'I have analyzed your query under ICAI guidelines.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: Array.isArray(data.suggestedActions) ? data.suggestedActions : [],
      };

      setMessages((prev) => [...prev, agentReply]);
    } catch (err: any) {
      console.error('AI Copilot request error:', err);
      const fallbackReply: Message = {
        id: `agent-fallback-${Date.now()}`,
        sender: 'agent',
        text: `### ICAI Guidance Note Advisory\n\nUnder ICAI Non-Corporate Entity guidelines:\n* Ensure financial statements comply with applicable Accounting Standards (AS-1, AS-2, AS-10, AS-16).\n* For detailed schedule configurations, refer to Notes 1 to 28 in the User Manual.\n* You can click the buttons below to jump directly into the workspace tools.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: 'Open User Manual', actionType: 'open_manual', section: 'overview' },
          { label: 'Go to Step 1 (Trial Balance)', actionType: 'navigate_step', step: 1 },
        ],
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleActionClick = (action: { label: string; actionType: string; step?: number; modal?: string; section?: string }) => {
    if (action.actionType === 'navigate_step' && typeof action.step === 'number' && onNavigateStep) {
      onNavigateStep(action.step);
      onClose();
    } else if (action.actionType === 'open_modal' && action.modal && onOpenModal) {
      onOpenModal(action.modal);
      onClose();
    } else if (action.actionType === 'open_manual' && onOpenManualSection) {
      onOpenManualSection(action.section);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5">
      <div
        className={`bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden transition-all duration-200 ${
          isMaximized ? 'w-[96vw] h-[94vh]' : 'w-full max-w-3xl h-[85vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>AI NCE Financials &amp; App Copilot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Context: <strong className="text-white">{config.entityName || 'Unnamed Firm'}</strong> • {config.entityType} ({config.financialYear || '2025-26'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={isMaximized ? 'Restore Size' : 'Maximize Window'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    id: 'cleared',
                    sender: 'agent',
                    text: `Conversation reset. How can I assist you with **${config.entityName || 'Non-Corporate Entity Financials'}**?`,
                    timestamp: 'Just now',
                  },
                ]);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Reset Conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Context Status Ribbon */}
        <div className="bg-slate-50 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              Trial Balance:{' '}
              {trialBalanceSummary?.isTallied ? (
                <span className="font-bold text-emerald-700">Tallied ({trialBalanceSummary.ledgerCount} ledgers)</span>
              ) : (
                <span className="font-bold text-amber-600">Pending / Needs Review</span>
              )}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Workspace: <strong className="text-slate-800">Step {currentStep}</strong>
            </span>
          </div>

          {onOpenManualSection && (
            <button
              type="button"
              onClick={() => onOpenManualSection('overview')}
              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Complete Manual</span>
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <div
                key={message.id}
                className={`flex gap-3 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    isUser
                      ? 'bg-slate-800 text-white'
                      : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                  }`}
                >
                  {isUser ? <span className="font-black text-xs">YOU</span> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl shadow-xs border text-xs ${
                    isUser
                      ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-xs'
                      : 'bg-white text-slate-800 border-slate-200 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  ) : (
                    <div>{formatMarkdown(message.text)}</div>
                  )}

                  {/* Suggested Quick Actions */}
                  {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2">
                      {message.suggestedActions.map((action, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => handleActionClick(action)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{action.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div
                    className={`mt-2 flex items-center justify-between text-[10px] ${
                      isUser ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{message.timestamp}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(message.id, message.text)}
                        className="hover:text-slate-700 flex items-center gap-1 cursor-pointer transition ml-2"
                        title="Copy text"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs flex items-center gap-2 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span className="text-slate-600 font-medium">Analyzing ICAI standards and financial statements...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="bg-slate-100/90 px-4 py-2 border-t border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span>Suggested:</span>
          </span>
          {promptSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition whitespace-nowrap cursor-pointer shrink-0 shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask any question about using the app, ICAI standards, Section 40(b), MSME, or schedules..."
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-800 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isProcessing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
