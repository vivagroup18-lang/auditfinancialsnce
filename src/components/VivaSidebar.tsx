import React from 'react';
import {
  LayoutGrid,
  FileSpreadsheet,
  Scale,
  Landmark,
  Package,
  Download,
  Building2,
  Bot,
  BookOpen,
  UserCheck,
  LogOut,
} from 'lucide-react';

export type VivaNavId =
  | 'home'
  | 'cy_tb'
  | 'accounts'
  | 'notes'
  | 'stock'
  | 'reports'
  | 'companies'
  | 'smart_ai';

interface VivaSidebarProps {
  activeNav: VivaNavId;
  onSelectNav: (nav: VivaNavId) => void;
  onOpenUserProfile: () => void;
  onOpenAICopilot?: () => void;
  onOpenUserManual?: () => void;
  onLogoutOrSwitch: () => void;
  exceptionCount?: number;
}

export const VivaSidebar: React.FC<VivaSidebarProps> = ({
  activeNav,
  onSelectNav,
  onOpenUserProfile,
  onOpenAICopilot,
  onOpenUserManual,
  onLogoutOrSwitch,
  exceptionCount = 0,
}) => {
  const navItems: {
    id: VivaNavId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'home', label: 'Dashboard', icon: LayoutGrid },
    { id: 'cy_tb', label: 'Trial Bal', icon: FileSpreadsheet },
    { id: 'accounts', label: 'BS & P&L', icon: Scale },
    {
      id: 'notes',
      label: 'Notes 1-25',
      icon: Landmark,
      badge: exceptionCount > 0 ? exceptionCount : undefined,
    },
    { id: 'stock', label: 'Adjustments', icon: Package },
    { id: 'reports', label: 'Export', icon: Download },
    { id: 'companies', label: 'Clients', icon: Building2 },
  ];

  return (
    <aside className="w-[78px] h-screen sticky top-0 bg-[#0F172A] text-slate-400 flex flex-col items-center py-4 select-none shrink-0 z-40 border-r border-slate-800/80 print:hidden">
      {/* Top Brand Monogram */}
      <button
        type="button"
        onClick={() => onSelectNav('home')}
        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-5 transition hover:scale-105 cursor-pointer shrink-0"
        title="ICAI Financial Statement Suite — Home Dashboard"
      >
        <span className="font-black text-lg tracking-tight">CA</span>
      </button>

      {/* Main Navigation Rail */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3 px-2 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectNav(item.id)}
              className="w-full flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none relative"
              title={item.label}
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/35 ring-2 ring-indigo-400/40'
                    : 'bg-slate-800/70 text-slate-400 group-hover:bg-slate-800 group-hover:text-white border border-slate-700/60'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-slate-400 font-medium group-hover:text-slate-200'
                }`}
              >
                {item.label}
              </span>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-2.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-xs">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom AI Copilot, Manual & Profile Controls */}
      <div className="pt-3 mt-2 border-t border-slate-800 flex flex-col items-center gap-2.5 w-full px-2 shrink-0">
        {onOpenUserManual && (
          <button
            type="button"
            onClick={onOpenUserManual}
            className="w-11 h-11 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 flex flex-col items-center justify-center transition cursor-pointer"
            title="AuditFinancials User Manual & ICAI CA Guide"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        )}

        {onOpenAICopilot && (
          <button
            type="button"
            onClick={onOpenAICopilot}
            className="w-11 h-11 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex flex-col items-center justify-center transition cursor-pointer"
            title="Ask AI CA Copilot"
          >
            <Bot className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenUserProfile}
          className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 flex items-center justify-center transition cursor-pointer relative"
          title="Auditor Profile & Account Settings"
        >
          <UserCheck className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>

        <button
          type="button"
          onClick={onLogoutOrSwitch}
          className="w-10 h-8 rounded-xl hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 flex items-center justify-center transition cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
