import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  Check,
  Share2,
  PlusSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [platform, setPlatform] = useState<'desktop' | 'ios' | 'android'>('desktop');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if already in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg ring-2 ring-emerald-400/40">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white">Install CA Financials</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PC &amp; Mobile
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Fast desktop &amp; mobile app with instant launch &amp; offline capability
              </p>
            </div>
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 p-2 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setPlatform('desktop')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              platform === 'desktop'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Monitor className="w-4 h-4 text-emerald-600" />
            <span>PC / Mac / Chrome</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              platform === 'android'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              platform === 'ios'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">App Already Installed!</p>
                <p className="text-xs text-emerald-700">
                  You are already running CA Financial Statement Agent in standalone application mode.
                </p>
              </div>
            </div>
          ) : deferredPrompt ? (
            <div className="text-center space-y-3 py-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Click below to install the application directly onto your computer or home screen with full multi-device synchronization.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install 1-Click Desktop App</span>
              </button>
            </div>
          ) : platform === 'desktop' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Install as a standalone Windows / macOS desktop application directly through Chrome, Edge, or Brave:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>Look at the right side of your browser address bar</span>
                </div>
                <p className="text-slate-600 pl-7 text-[11px]">
                  Click the <strong>Install</strong> or <strong>Computer Icon</strong> (or open Chrome Menu &rarr; <em>&ldquo;Save and Share&rdquo; &rarr; &ldquo;Install page as app&rdquo;</em>).
                </p>
                <div className="flex items-center gap-2 font-bold text-slate-800 pt-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
                  <span>Confirm &ldquo;Install&rdquo;</span>
                </div>
                <p className="text-slate-600 pl-7 text-[11px]">
                  An icon will be added to your Desktop and Taskbar for instant 1-click launch anytime.
                </p>
              </div>
            </div>
          ) : platform === 'ios' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Install on your iPhone or iPad home screen using Safari:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>1. Tap the Share button in Safari</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <PlusSquare className="w-4 h-4 text-emerald-600" />
                  <span>2. Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Check className="w-4 h-4 text-teal-600" />
                  <span>3. Tap &ldquo;Add&rdquo; in the top-right corner</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Install on Android using Chrome:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>Tap the Chrome menu (3 dots at top-right)</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
                  <span>Select &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;</span>
                </div>
              </div>
            </div>
          )}

          {/* Features Checklist */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Screen Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Offline Local Privacy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant App Launch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auto Cloud Sync</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Viva Project CA Suite • Progressive Web App
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
