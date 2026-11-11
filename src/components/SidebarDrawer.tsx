import React, { useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Compass,
  LayoutGrid,
  ArrowLeftRight,
  Sun,
  Moon,
  Cloud,
  LogOut,
  Calendar,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { AVAILABLE_MONTHS } from '../utils/seedData';
import { formatBrlCents } from '../utils/financeLogic';
import { PWAInstallButton } from './PWAInstallButton';
import type { ActiveTab, ThemeMode } from '../App';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeMonth: string;
  onChangeMonth: (monthKey: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  currentUser: User | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onOpenNewModal: (type?: 'income' | 'expense', initialTab?: 'quick' | 'detailed') => void;
  categoriesCount: number;
  transactionsCount: number;
  netSurplusCents: number;
}

export function SidebarDrawer({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  activeMonth,
  onChangeMonth,
  theme,
  onToggleTheme,
  currentUser,
  onSignOut,
  onOpenNewModal,
  categoriesCount,
  transactionsCount,
  netSurplusCents,
}: SidebarDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu Rápido SobraMais"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative w-full max-w-md bg-white dark:bg-[#111624] border-l border-slate-200/80 dark:border-[#1E273C] text-[#000000] dark:text-white shadow-2xl flex flex-col justify-between h-full z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-[#1E273C] flex items-center justify-between gap-4 bg-white dark:bg-[#111624]">
          <div className="flex items-center gap-3">
            <img
              src="./logo-icon.png"
              alt="SobraMais"
              className="w-10 h-10 object-contain dark:hidden shrink-0"
            />
            <img
              src="./logo-icon-dark.png"
              alt="SobraMais"
              className="w-10 h-10 object-contain hidden dark:block shrink-0"
            />
            <div>
              <h2 className="text-base font-extrabold font-display text-[#000000] dark:text-white">
                SobraMais · Navegação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesso rápido às 4 páginas e preferências
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="p-2 text-slate-400 hover:text-[#000000] dark:hover:text-white rounded-full hover:bg-[#F8FAFC] dark:hover:bg-[#181F32] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onSelectTab('dashboard');
                onClose();
              }}
              className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-[#1860FC] bg-[#1860FC] text-white font-bold'
                  : 'border-slate-200 dark:border-[#1E273C] bg-[#F8FAFC] dark:bg-[#181F32] text-xs font-semibold hover:border-[#1860FC]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mb-1.5" />
              <span className="text-xs font-extrabold block truncate">Visão Geral</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('planner');
                onClose();
              }}
              className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                activeTab === 'planner'
                  ? 'border-[#1860FC] bg-[#1860FC] text-white font-bold'
                  : 'border-slate-200 dark:border-[#1E273C] bg-[#F8FAFC] dark:bg-[#181F32] text-xs font-semibold hover:border-[#1860FC]'
              }`}
            >
              <Compass className="w-4 h-4 mb-1.5" />
              <span className="text-xs font-extrabold block truncate">Planejador & Metas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('transactions');
                onClose();
              }}
              className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                activeTab === 'transactions'
                  ? 'border-[#1860FC] bg-[#1860FC] text-white font-bold'
                  : 'border-slate-200 dark:border-[#1E273C] bg-[#F8FAFC] dark:bg-[#181F32] text-xs font-semibold hover:border-[#1860FC]'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 mb-1.5" />
              <span className="text-xs font-extrabold block truncate">
                Extrato ({transactionsCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('settings');
                onClose();
              }}
              className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-[#1860FC] bg-[#1860FC] text-white font-bold'
                  : 'border-slate-200 dark:border-[#1E273C] bg-[#F8FAFC] dark:bg-[#181F32] text-xs font-semibold hover:border-[#1860FC]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 mb-1.5" />
              <span className="text-xs font-extrabold block truncate">
                Ajustes ({categoriesCount})
              </span>
            </button>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-[#181F32] p-4 rounded-3xl border border-slate-200/80 dark:border-[#1E273C]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
              <Calendar className="w-4 h-4 text-[#1860FC] dark:text-[#D4F907]" />
              <span>Competência Mensal Ativa: {monthLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MONTHS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChangeMonth(m.key)}
                  className={`px-3 py-2 text-xs font-bold rounded-2xl transition-colors whitespace-nowrap cursor-pointer ${
                    activeMonth === m.key
                      ? 'bg-[#1860FC] text-white shadow-xs'
                      : 'bg-white dark:bg-[#000000] border border-slate-200 dark:border-[#242F48] text-slate-700 dark:text-slate-300 hover:border-[#1860FC]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <PWAInstallButton variant="drawer" />

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#1E273C] rounded-2xl text-xs font-bold hover:border-[#1860FC] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#D4F907]" />
                ) : (
                  <Moon className="w-4 h-4 text-[#1860FC]" />
                )}
                <span>Aparência da Interface</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#F8FAFC] dark:bg-[#000000] text-xs">
                {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
              </span>
            </button>

            <div className="p-3.5 bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#1E273C] rounded-2xl text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cloud className="w-4 h-4 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
                <div className="truncate">
                  {currentUser ? (
                    <>
                      <div className="font-bold truncate text-[#000000] dark:text-white">
                        {currentUser.email}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-[#D4F907] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Nuvem sincronizada
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-[#000000] dark:text-white">Modo Demo</div>
                      <div className="text-[11px] text-slate-400">Salvo neste navegador</div>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-[#242F48] hover:bg-slate-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Sair
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-5 border-t border-slate-200 dark:border-[#1E273C] bg-white dark:bg-[#111624] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewModal('expense', 'quick');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-extrabold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Novo Lançamento
          </button>
          <div className="text-center text-[11px] text-slate-400 font-medium">
            Sobra Atual do Mês:{' '}
            <strong className="text-[#1860FC] dark:text-[#D4F907] font-mono tabular-nums">
              {formatBrlCents(netSurplusCents, true)}
            </strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
