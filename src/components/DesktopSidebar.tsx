/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { type User } from 'firebase/auth';
import {
  LayoutGrid,
  Compass,
  ArrowLeftRight,
  SlidersHorizontal,
  Plus,
  Sun,
  Moon,
  LogOut,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { type ActiveTab, type ThemeMode } from '../App';
import { formatBrlCents } from '../utils/financeLogic';
import { PWAInstallButton } from './PWAInstallButton';

interface DesktopSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeMonth: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenNewModal: (defaultType?: 'income' | 'expense', initialTab?: 'quick' | 'detailed') => void;
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

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string | null;
    badgeColor?: string;
    description: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Visão Geral',
      icon: LayoutGrid,
      badge: null,
      description: 'Dashboard, sobra e gráficos',
    },
    {
      id: 'planner',
      label: 'Planejador & Metas',
      icon: Compass,
      badge: isSurplusPositive ? 'Positivo' : 'Atenção',
      badgeColor: isSurplusPositive
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#D4F907] border border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      description: 'Meta mensal, caixinhas e 12M',
    },
    {
      id: 'transactions',
      label: 'Extrato',
      icon: ArrowLeftRight,
      badge: `${transactionsCount}`,
      description: 'Gestão de transações e CSV',
    },
    {
      id: 'settings',
      label: 'Ajustes & Categorias',
      icon: SlidersHorizontal,
      badge: `${categoriesCount}`,
      description: 'Tetos, atalhos ⚡ e sistema',
    },
  ];

  return (
    <aside
      aria-label="Menu Lateral Desktop"
      className="hidden md:flex flex-col w-60 lg:w-64 h-screen shrink-0 bg-white dark:bg-[#111624] border-r border-slate-200/80 dark:border-[#1E273C] transition-colors z-20"
    >
      {/* 1. Header & Brand logo */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2234] flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2 text-left cursor-pointer"
        >
          <img
            src="./logo-sobramais.png"
            alt="SobraMais"
            className="h-9 w-auto object-contain dark:hidden"
          />
          <img
            src="./logo-sobramais-dark.png"
            alt="SobraMais"
            className="h-9 w-auto object-contain hidden dark:block"
          />
        </button>
      </div>

      {/* 2. Botão de Destaque no Topo: + Novo Lançamento */}
      <div className="p-3 pb-1.5">
        <button
          type="button"
          onClick={() => onOpenNewModal('expense', 'quick')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-2xl bg-[#1860FC] hover:bg-[#0D48D9] text-white font-extrabold text-xs transition-all cursor-pointer shadow-sm group"
        >
          <Plus className="w-4 h-4 text-[#D4F907] shrink-0" />
          <span>+ Novo Lançamento</span>
        </button>
      </div>

      {/* 3. Os 4 Itens Principais de Navegação */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3.5">
        <div>
          <div className="px-2.5 mb-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Navegação (4 Abas)
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1860FC] text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-[#192034] hover:text-[#000000] dark:hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-white/20 text-[#D4F907]'
                          : 'bg-[#F8FAFC] dark:bg-[#192034] text-[#1860FC] dark:text-[#D4F907]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold leading-snug truncate">
                        {item.label}
                      </div>
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

        {/* 4. Mini Card de Sobra Líquida */}
        <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#161D2F] border border-slate-200/70 dark:border-[#242F48]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              Sobra ({activePeriodLabel})
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
          </div>
          <div
            className={`text-base font-black font-mono tabular-nums tracking-tight ${
              isSurplusPositive
                ? 'text-[#1860FC] dark:text-[#D4F907]'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isSurplusPositive
              ? `+ ${formatBrlCents(netSurplusCents)}`
              : formatBrlCents(netSurplusCents)}
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('planner')}
            className="mt-1 text-[11px] font-bold text-[#1860FC] dark:text-[#D4F907] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Alocar nas caixinhas</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 5. Rodapé: Alternância Dark/Light Mode, Instalação PWA & Sair */}
      <div className="p-3 border-t border-slate-100 dark:border-[#1A2234] bg-slate-50/50 dark:bg-[#0E131F]/50 space-y-1.5">
        <PWAInstallButton variant="sidebar" />

        {/* Alternância Dark/Light Mode */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1E273C] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#D4F907]" />
            ) : (
              <Moon className="w-4 h-4 text-[#1860FC]" />
            )}
            <span>{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#242F48] text-slate-500 dark:text-slate-400">
            {theme}
          </span>
        </button>

        {/* Conta & Sair */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-[#161D2F] border border-slate-200/70 dark:border-[#242F48]">
          <div className="flex items-center gap-2 min-w-0">
            {currentUser ? (
              <>
                <div className="w-7 h-7 rounded-full bg-[#1860FC] text-white flex items-center justify-center text-xs font-black shrink-0 uppercase shadow-xs">
                  {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] font-medium text-emerald-600 dark:text-[#D4F907] flex items-center gap-0.5 truncate">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>Nuvem Firebase</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-[#D4F907] text-[#000000] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    Modo Demo
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
            title={currentUser ? 'Sair da conta' : 'Sair do modo demo e ir para login'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
