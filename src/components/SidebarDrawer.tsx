import React, { useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  PiggyBank,
  LayoutGrid,
  Zap,
  ArrowLeftRight,
  Sun,
  Moon,
  Cloud,
  LogOut,
  Calendar,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { AVAILABLE_MONTHS } from '../utils/seedData';
import { formatBrlCents } from '../utils/financeLogic';

export type ActiveTab = 'overview' | 'quick_launch' | 'transactions' | 'categories' | 'analysis';
export type ThemeMode = 'light' | 'dark';

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
  onOpenNewModal: (type?: 'income' | 'expense') => void;
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
  onGoogleSignIn,
  onSignOut,
  onOpenNewModal,
  categoriesCount,
  transactionsCount,
  netSurplusCents,
}: SidebarDrawerProps) {
  // Close on Escape key press
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
      aria-label="Aba Lateral com Opções e Páginas do SobraMais"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Lateral Panel */}
      <aside className="relative w-full max-w-md bg-white dark:bg-[#111624] border-l border-slate-200/80 dark:border-[#1E273C] text-[#0A0E17] dark:text-white shadow-2xl flex flex-col justify-between h-full z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-200 dark:border-[#1E273C] flex items-center justify-between gap-4 bg-white dark:bg-[#111624]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold font-display text-[#0A0E17] dark:text-white">
                Aba Lateral
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Páginas extras, tetos, metas e ajustes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aba lateral"
            className="p-2 text-slate-400 hover:text-[#0A0E17] dark:hover:text-white rounded-full hover:bg-[#F4F6FB] dark:hover:bg-[#181F32] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Páginas Principais da Aba Lateral */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              <span>Módulos Extras da Aba Lateral</span>
            </div>

            <div className="space-y-3">
              {/* Card 1: Tipos de Gastos */}
              <button
                type="button"
                onClick={() => {
                  onSelectTab('categories');
                  onClose();
                }}
                className={`w-full group p-4 rounded-3xl border text-left transition-all flex items-start justify-between gap-3 ${
                  activeTab === 'categories'
                    ? 'border-[#1456FF] bg-[#1456FF] text-white shadow-md'
                    : 'border-slate-200/80 dark:border-[#1E273C] bg-[#F4F6FB] dark:bg-[#181F32] hover:border-[#1456FF]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      activeTab === 'categories'
                        ? 'bg-[#E2FF1A] text-[#0A0E17]'
                        : 'bg-[#1456FF] text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold font-display truncate">
                      Tipos de Gastos & Categorias
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        activeTab === 'categories'
                          ? 'text-blue-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Criar tipos personalizados, definir tetos mensais e valores padrões ({categoriesCount} tipos).
                    </div>
                  </div>
                </div>
                <ArrowRight
                  className={`w-4 h-4 shrink-0 mt-2 transition-transform group-hover:translate-x-0.5 ${
                    activeTab === 'categories' ? 'text-[#E2FF1A]' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Card 2: Análise & Sobras */}
              <button
                type="button"
                onClick={() => {
                  onSelectTab('analysis');
                  onClose();
                }}
                className={`w-full group p-4 rounded-3xl border text-left transition-all flex items-start justify-between gap-3 ${
                  activeTab === 'analysis'
                    ? 'border-[#1456FF] bg-[#1456FF] text-white shadow-md'
                    : 'border-slate-200/80 dark:border-[#1E273C] bg-[#F4F6FB] dark:bg-[#181F32] hover:border-[#1456FF]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      activeTab === 'analysis'
                        ? 'bg-[#E2FF1A] text-[#0A0E17]'
                        : 'bg-[#1456FF] text-white'
                    }`}
                  >
                    <PiggyBank className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold font-display truncate">
                      Análise & Planejador de Sobras
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        activeTab === 'analysis'
                          ? 'text-blue-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Simulador de divisão da sobra (Reserva, Ações, Metas) e projeção de 12 meses.
                    </div>
                  </div>
                </div>
                <ArrowRight
                  className={`w-4 h-4 shrink-0 mt-2 transition-transform group-hover:translate-x-0.5 ${
                    activeTab === 'analysis' ? 'text-[#E2FF1A]' : 'text-slate-400'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Atalhos Rápidos para as outras páginas */}
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Atalhos de Navegação
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('overview');
                  onClose();
                }}
                className={`p-2.5 rounded-2xl border text-center transition-colors ${
                  activeTab === 'overview'
                    ? 'border-[#1456FF] bg-[#1456FF] text-white font-bold'
                    : 'border-slate-200 dark:border-[#1E273C] bg-white dark:bg-[#080B12] text-xs font-semibold hover:border-[#1456FF]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 mx-auto mb-1" />
                <span className="text-[11px] block truncate">Visão Geral</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('quick_launch');
                  onClose();
                }}
                className={`p-2.5 rounded-2xl border text-center transition-colors ${
                  activeTab === 'quick_launch'
                    ? 'border-[#1456FF] bg-[#1456FF] text-white font-bold'
                    : 'border-slate-200 dark:border-[#1E273C] bg-white dark:bg-[#080B12] text-xs font-semibold hover:border-[#1456FF]'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1" />
                <span className="text-[11px] block truncate">1-Clique</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('transactions');
                  onClose();
                }}
                className={`p-2.5 rounded-2xl border text-center transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-[#1456FF] bg-[#1456FF] text-white font-bold'
                    : 'border-slate-200 dark:border-[#1E273C] bg-white dark:bg-[#080B12] text-xs font-semibold hover:border-[#1456FF]'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 mx-auto mb-1" />
                <span className="text-[11px] block truncate">Livro Caixa</span>
              </button>
            </div>
          </div>

          {/* Section 3: Seleção de Competência Mensal */}
          <div className="bg-[#F4F6FB] dark:bg-[#181F32] p-4 rounded-3xl border border-slate-200/80 dark:border-[#1E273C]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
              <Calendar className="w-4 h-4 text-[#1456FF] dark:text-[#E2FF1A]" />
              <span>Competência Mensal Ativa: {monthLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MONTHS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChangeMonth(m.key)}
                  className={`px-3 py-2 text-xs font-bold rounded-2xl transition-colors whitespace-nowrap ${
                    activeMonth === m.key
                      ? 'bg-[#1456FF] text-white shadow-xs'
                      : 'bg-white dark:bg-[#080B12] border border-slate-200 dark:border-[#242F48] text-slate-700 dark:text-slate-300 hover:border-[#1456FF]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Preferências & Nuvem */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Preferências & Nuvem
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#1E273C] rounded-2xl text-xs font-bold hover:border-[#1456FF] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#E2FF1A]" />
                ) : (
                  <Moon className="w-4 h-4 text-[#1456FF]" />
                )}
                <span>Aparência da Interface</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#F4F6FB] dark:bg-[#080B12] text-xs">
                {theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}
              </span>
            </button>

            {/* Cloud Sync */}
            <div className="p-3.5 bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#1E273C] rounded-2xl text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cloud className="w-4 h-4 text-[#1456FF] dark:text-[#E2FF1A] shrink-0" />
                <div className="truncate">
                  {currentUser ? (
                    <>
                      <div className="font-bold truncate text-[#0A0E17] dark:text-white">
                        {currentUser.email}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-[#E2FF1A] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Nuvem sincronizada
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-[#0A0E17] dark:text-white">Modo Local</div>
                      <div className="text-[11px] text-slate-400">Salvo neste navegador</div>
                    </>
                  )}
                </div>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-[#242F48] hover:bg-slate-200 transition-colors shrink-0 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sair
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#1456FF] text-white hover:bg-[#0D44D9] transition-colors shrink-0 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Fazer Login
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Bottom CTA */}
        <div className="shrink-0 p-5 border-t border-slate-200 dark:border-[#1E273C] bg-white dark:bg-[#111624] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewModal('expense');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-extrabold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
          <div className="text-center text-[11px] text-slate-400 font-medium">
            Sobra Atual do Mês: <strong className="text-[#1456FF] dark:text-[#E2FF1A] font-mono tabular-nums">{formatBrlCents(netSurplusCents, true)}</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
