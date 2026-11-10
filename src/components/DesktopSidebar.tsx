/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { type User } from 'firebase/auth';
import {
  LayoutGrid,
  Zap,
  ArrowLeftRight,
  SlidersHorizontal,
  PiggyBank,
  Plus,
  Sun,
  Moon,
  LogOut,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { type ActiveTab, type ThemeMode } from '../App';
import { formatBrlCents } from '../utils/financeLogic';

interface DesktopSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeMonth: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenNewModal: (defaultType?: 'income' | 'expense') => void;
  categoriesCount: number;
  transactionsCount: number;
  netSurplusCents: number;
  activePeriodLabel: string;
}

export function DesktopSidebar({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  currentUser,
  onSignOut,
  onOpenNewModal,
  categoriesCount,
  transactionsCount,
  netSurplusCents,
  activePeriodLabel,
}: DesktopSidebarProps) {
  const isSurplusPositive = netSurplusCents >= 0;

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Visão Geral',
      icon: LayoutGrid,
      badge: null,
      description: 'Resumo financeiro e metas',
      group: 'main',
    },
    {
      id: 'transactions' as ActiveTab,
      label: 'Entradas e Saídas',
      icon: ArrowLeftRight,
      badge: `${transactionsCount}`,
      description: 'Extrato completo e lançamentos',
      group: 'main',
    },
    {
      id: 'quick_launch' as ActiveTab,
      label: 'Gastos Padrões',
      icon: Zap,
      badge: '1-Clique',
      badgeColor: 'bg-[#E2FF1A] text-[#0A0E17]',
      description: 'Automação de rotina',
      group: 'main',
    },
    {
      id: 'categories' as ActiveTab,
      label: 'Tipos de Gastos & Tetos',
      icon: SlidersHorizontal,
      badge: `${categoriesCount}`,
      description: 'Categorias e limites mensais',
      group: 'management',
    },
    {
      id: 'analysis' as ActiveTab,
      label: 'Análise & Sobras',
      icon: PiggyBank,
      badge: isSurplusPositive ? 'Positivo' : 'Atenção',
      badgeColor: isSurplusPositive
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      description: 'Direcionamento de sobra líquida',
      group: 'management',
    },
  ];

  return (
    <aside
      aria-label="Menu Lateral Desktop"
      className="hidden md:flex flex-col w-56 lg:w-64 h-screen shrink-0 bg-white dark:bg-[#111624] border-r border-slate-200/80 dark:border-[#1E273C] transition-colors z-20"
    >
      {/* 1. Header & Brand logo */}
      <div className="px-3.5 py-3 border-b border-slate-100 dark:border-[#1A2234] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center font-black text-xs shadow-sm font-display shrink-0">
            S+
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-[#1456FF] dark:text-white font-display block leading-none">
              SobraMais
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block mt-0.5">
              Controle de Sobras
            </span>
          </div>
        </div>
      </div>

      {/* 2. Primary CTA Button: Novo Lançamento */}
      <div className="p-3 pb-1.5">
        <button
          type="button"
          onClick={() => onOpenNewModal('expense')}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1456FF] hover:bg-[#0E43D6] text-white font-extrabold text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="whitespace-nowrap">Novo Lançamento</span>
        </button>
      </div>

      {/* 3. Navigation Links List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-3.5">
        {/* Group 1: Navegação Principal */}
        <div>
          <div className="px-2.5 mb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            Navegação Principal
          </div>
          <div className="space-y-0.5">
            {navItems
              .filter((item) => item.group === 'main')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-[#1456FF] text-white font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#F4F6FB] dark:hover:bg-[#192034] hover:text-[#0A0E17] dark:hover:text-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/15 text-[#E2FF1A]'
                            : 'bg-[#F4F6FB] dark:bg-[#192034] text-[#1456FF] dark:text-[#E2FF1A]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-snug truncate">{item.label}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-[#242F48] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Group 2: Gestão & Análise */}
        <div>
          <div className="px-2.5 mb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            Gestão & Sobras
          </div>
          <div className="space-y-0.5">
            {navItems
              .filter((item) => item.group === 'management')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-[#1456FF] text-white font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#F4F6FB] dark:hover:bg-[#192034] hover:text-[#0A0E17] dark:hover:text-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/15 text-[#E2FF1A]'
                            : 'bg-[#F4F6FB] dark:bg-[#192034] text-[#1456FF] dark:text-[#E2FF1A]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-snug truncate">{item.label}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-[#242F48] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* 4. Mini Card Summary Widget */}
        <div className="p-3 rounded-xl bg-[#F4F6FB] dark:bg-[#161D2F] border border-slate-200/70 dark:border-[#242F48]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Sobra ({activePeriodLabel})
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-[#1456FF] dark:text-[#E2FF1A]" />
          </div>
          <div
            className={`text-base font-black font-mono tabular-nums tracking-tight ${
              isSurplusPositive
                ? 'text-[#1456FF] dark:text-[#E2FF1A]'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isSurplusPositive ? `+ ${formatBrlCents(netSurplusCents)}` : formatBrlCents(netSurplusCents)}
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('analysis')}
            className="mt-1 text-[11px] font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Planejar alocação</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 5. Footer: Preferences & Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-[#1A2234] bg-slate-50/50 dark:bg-[#0E131F]/50 space-y-2">
        {/* Theme Mode Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1E273C] transition-colors"
        >
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#E2FF1A]" />
            ) : (
              <Moon className="w-4 h-4 text-[#1456FF]" />
            )}
            <span>{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#242F48] text-slate-500 dark:text-slate-400">
            {theme}
          </span>
        </button>

        {/* User Account / Guest & Logout */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-[#161D2F] border border-slate-200/70 dark:border-[#242F48]">
          <div className="flex items-center gap-2 min-w-0">
            {currentUser ? (
              <>
                <div className="w-7 h-7 rounded-full bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center text-xs font-black shrink-0 uppercase shadow-xs">
                  {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>Nuvem Firebase</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    Convidado
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                    Dados Locais
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onSignOut}
            title={currentUser ? 'Sair da conta' : 'Sair do modo convidado e fazer login'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
