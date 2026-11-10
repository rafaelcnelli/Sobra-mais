import React, { useState } from 'react';
import { Zap, Plus, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';
import {
  formatBrlCents,
  calculateMonthlySummary,
  type FinancialCategory,
  type FinancialTransaction,
  type MonthlySurplusPlan,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS, NATURE_LABELS } from '../utils/seedData';

interface QuickLaunchTabProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  activeMonth: string;
  monthlyPlan: MonthlySurplusPlan;
  onQuickLaunchPreset: (category: FinancialCategory) => Promise<void>;
  onOpenNewModal: (defaultType?: 'income' | 'expense') => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onNavigateTab: (tab: 'overview' | 'quick_launch' | 'transactions' | 'categories' | 'analysis') => void;
  periodLabel?: string;
}

export function QuickLaunchTab({
  transactions,
  categories,
  activeMonth,
  monthlyPlan,
  onQuickLaunchPreset,
  onOpenNewModal,
  onDeleteTransaction,
  onNavigateTab,
  periodLabel,
}: QuickLaunchTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  const summary = calculateMonthlySummary(transactions, activeMonth, monthlyPlan);
  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;

  const allPresets = categories.filter((c) => c.isStandardPreset);
  const filteredPresets = allPresets.filter((c) =>
    filterType === 'all' ? true : c.type === filterType
  );

  const recentQuickTransactions = transactions
    .filter((t) => t.monthKey === activeMonth)
    .sort((a, b) => b.dateIso.localeCompare(a.dateIso))
    .slice(0, 1);

  return (
    <div className="space-y-2.5">
      {/* 1. Compact Header & Filter Bar */}
      <section className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#1456FF] text-[#E2FF1A] flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <h1 className="text-sm sm:text-base font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
              Gastos e Entradas Padrões — 1 Clique ({periodLabel ?? monthLabel})
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Dispare despesas ou receitas habituais com um clique sem preencher formulários
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-[#F4F6FB] dark:bg-[#080B12] rounded-full">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-[#1456FF] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({allPresets.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterType === 'expense'
                  ? 'bg-[#1456FF] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Saídas ({allPresets.filter((c) => c.type === 'expense').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('income')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                filterType === 'income'
                  ? 'bg-[#E2FF1A] text-[#0A0E17]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entradas ({allPresets.filter((c) => c.type === 'income').length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('categories')}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-[#1456FF] dark:text-[#E2FF1A] bg-[#F4F6FB] dark:bg-[#181F32] rounded-full hover:bg-slate-200 dark:hover:bg-[#222C46] transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Padrão
          </button>
        </div>
      </section>

      {/* 2. Compact 3x3 Grid of 1-Click Standard Presets */}
      <section
        aria-label="Grade de Lançamentos Rápidos em 1 Clique"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 content-start"
      >
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onQuickLaunchPreset(preset)}
            aria-label={`Lançar padrão ${preset.name}`}
            className="group bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] hover:border-[#1456FF] dark:hover:border-[#E2FF1A] hover:bg-[#1456FF] dark:hover:bg-[#1456FF] rounded-2xl p-3.5 flex flex-col justify-between text-left transition-colors"
          >
            <div className="flex items-start justify-between gap-2.5 w-full">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    preset.type === 'income'
                      ? 'bg-[#E2FF1A] text-[#0A0E17]'
                      : 'bg-[#1456FF] text-white group-hover:bg-white group-hover:text-[#1456FF]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold font-display text-[#0A0E17] dark:text-white group-hover:text-white truncate">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-blue-100 truncate">
                    {preset.type === 'income' ? 'Entrada' : 'Saída'} · {NATURE_LABELS[preset.nature]}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-[#0A0E17] bg-[#F4F6FB] dark:bg-[#181F32] dark:text-white group-hover:bg-[#E2FF1A] group-hover:text-[#0A0E17] rounded-full transition-colors whitespace-nowrap shrink-0">
                Lançar
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-[#1E273C] group-hover:border-white/20 flex items-center justify-between w-full">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 group-hover:text-blue-100 block">
                  Valor 1-Clique
                </span>
                <span className="text-sm font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white group-hover:text-white">
                  {formatBrlCents(preset.defaultAmountCents)}
                </span>
              </div>
              {preset.monthlyLimitCents > 0 && (
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 group-hover:text-blue-100 block">
                    Teto Mensal
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-slate-600 dark:text-slate-300 group-hover:text-blue-100">
                    {formatBrlCents(preset.monthlyLimitCents)}
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </section>

      {/* 3. Compact Bottom Status & Latest Launch Strip */}
      <section className="shrink-0 bg-[#1456FF] text-white rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#E2FF1A] shrink-0" />
            <span className="font-bold">Resumo do Mês:</span>
          </div>
          <span className="font-mono tabular-nums text-blue-100">
            Entradas: <strong className="text-white">{formatBrlCents(summary.totalIncomeCents)}</strong>
          </span>
          <span aria-hidden="true" className="text-blue-300">·</span>
          <span className="font-mono tabular-nums text-blue-100">
            Saídas: <strong className="text-white">{formatBrlCents(summary.totalExpenseCents)}</strong>
          </span>
          <span aria-hidden="true" className="text-blue-300">·</span>
          <span className="font-mono tabular-nums">
            Sobra:{' '}
            <strong className="text-[#E2FF1A]">
              {formatBrlCents(summary.netSurplusCents, true)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {recentQuickTransactions.map((tx) => (
            <div
              key={tx.id}
              className="hidden xl:inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-xs whitespace-nowrap"
            >
              <span className="text-blue-100">Último:</span>
              <span className="font-semibold truncate max-w-[130px]">{tx.description}</span>
              <span className="font-mono tabular-nums text-[#E2FF1A] font-bold">
                {formatBrlCents(tx.amountCents)}
              </span>
              <button
                type="button"
                onClick={() => onDeleteTransaction(tx.id)}
                aria-label={`Excluir ${tx.description}`}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onOpenNewModal('expense')}
            className="px-3.5 py-1.5 text-xs font-extrabold text-[#0A0E17] bg-[#E2FF1A] hover:bg-[#d5f20d] rounded-full transition-colors whitespace-nowrap shrink-0"
          >
            + Valor Personalizado
          </button>
        </div>
      </section>
    </div>
  );
}
