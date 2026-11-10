import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  formatBrlCents,
  calculateMonthlySummary,
  calculateCategoryBreakdown,
  calculateDynamicCategoryBreakdown,
  type FinancialCategory,
  type FinancialTransaction,
  type MonthlySurplusPlan,
  type MonthlyFinancialSummary,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS } from '../utils/seedData';

interface OverviewTabProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  activeMonth: string;
  monthlyPlan: MonthlySurplusPlan;
  onQuickLaunchPreset: (category: FinancialCategory) => Promise<void>;
  onOpenNewModal: (defaultType?: 'income' | 'expense') => void;
  onEditTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onNavigateTab: (tab: 'overview' | 'quick_launch' | 'transactions' | 'categories' | 'analysis') => void;
  filteredTransactions?: FinancialTransaction[];
  summary?: MonthlyFinancialSummary;
  periodLabel?: string;
}

export function OverviewTab({
  transactions,
  categories,
  activeMonth,
  monthlyPlan,
  onOpenNewModal,
  onNavigateTab,
  filteredTransactions,
  summary,
  periodLabel,
}: OverviewTabProps) {
  const currentSummary: MonthlyFinancialSummary =
    summary ?? calculateMonthlySummary(transactions, activeMonth, monthlyPlan);

  const monthTransactions = filteredTransactions ?? transactions.filter((t) => t.monthKey === activeMonth);
  const standardPresetsCount = categories.filter((c) => c.isStandardPreset).length;

  const topExpenseCategories = (
    filteredTransactions
      ? calculateDynamicCategoryBreakdown(filteredTransactions, categories, 'expense')
      : calculateCategoryBreakdown(transactions, categories, activeMonth, 'expense')
  ).slice(0, 4);

  const multiMonthSeries = AVAILABLE_MONTHS.map((m) => {
    const s = calculateMonthlySummary(transactions, m.key, monthlyPlan);
    return {
      ...m,
      incomeCents: s.totalIncomeCents,
      expenseCents: s.totalExpenseCents,
      surplusCents: s.netSurplusCents,
      surplusRate: s.surplusRatePercent,
    };
  });

  const rawMaxVal = Math.max(
    1000000,
    ...multiMonthSeries.map((d) => Math.max(d.incomeCents, d.expenseCents, Math.abs(d.surplusCents)))
  );
  const maxChartVal = Math.ceil(rawMaxVal / 400000) * 400000;

  return (
    <div className="space-y-3">
      {/* Row 1: Flagship Electric Cobalt Hero Card + 3-KPI & Action Hub */}
      <section
        aria-label="Indicadores Financeiros do Mês"
        className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch"
      >
        {/* Left 5 cols: Signature Electric Cobalt Blue Hero Card */}
        <div className="lg:col-span-5 bg-[#1456FF] text-white rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-blue-100 tracking-wide block truncate">
                Controle de Sobras · {periodLabel ?? (AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth)}
              </span>
              <h1 className="text-base sm:text-lg font-extrabold font-display tracking-tight mt-0.5 truncate">
                Sobra Líquida {periodLabel && periodLabel !== activeMonth ? '(Período Ativo)' : 'do Mês'}
              </h1>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {currentSummary.netSurplusCents >= 0 ? (
                <CheckCircle2 className="w-4 h-4 text-[#E2FF1A]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#E2FF1A]" />
              )}
            </div>
          </div>

          <div className="my-2">
            <div
              data-testid="kpi-net-surplus"
              className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-white truncate"
            >
              {formatBrlCents(currentSummary.netSurplusCents, true)}
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5 leading-snug">
              {currentSummary.netSurplusCents >= 0
                ? `Retendo ${currentSummary.surplusRatePercent}% da renda mensal livre de gastos.`
                : 'Atenção: as saídas deste mês superaram as entradas.'}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigateTab('analysis')}
              className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-extrabold text-[#0A0E17] bg-[#E2FF1A] hover:bg-[#d5f20d] rounded-xl transition-colors whitespace-nowrap"
            >
              <span className="truncate">Planejar sobras e investimentos</span>
              <span aria-hidden="true" className="text-xs font-mono ml-2">→</span>
            </button>

            {/* Floating White/Dark 3-Metric Dock inside Cobalt Card */}
            <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-[#1E273C] bg-white dark:bg-[#0D1322] text-[#0A0E17] dark:text-white rounded-xl py-1.5 px-1">
              <div className="px-1.5 text-center min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Retenção</div>
                <div className="text-xs font-bold font-mono tabular-nums mt-0.5 truncate">
                  {currentSummary.surplusRatePercent}%
                </div>
              </div>
              <div className="px-1.5 text-center min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Meta Mês</div>
                <div className="text-xs font-bold font-mono tabular-nums mt-0.5 truncate">
                  {currentSummary.targetProgressPercent}%
                </div>
              </div>
              <div className="px-1.5 text-center min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Livre</div>
                <div className="text-xs font-bold font-mono tabular-nums text-[#1456FF] dark:text-[#E2FF1A] mt-0.5 truncate">
                  {formatBrlCents(currentSummary.freeUnallocatedSurplusCents).replace(',00', '')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Clean White / Dark Surface KPI & Quick Action Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* KPI 1: Entradas */}
            <div className="bg-[#F4F6FB] dark:bg-[#181F32] rounded-xl p-2.5 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Entradas no Mês
                </span>
                <span className="w-6 h-6 rounded-full bg-[#E2FF1A] text-[#0A0E17] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                data-testid="kpi-total-income"
                className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white truncate"
              >
                {formatBrlCents(currentSummary.totalIncomeCents)}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">Receita</span>
                <button
                  type="button"
                  onClick={() => onOpenNewModal('income')}
                  className="text-[#1456FF] dark:text-[#E2FF1A] hover:underline font-bold whitespace-nowrap shrink-0"
                >
                  + Entrada
                </button>
              </div>
            </div>

            {/* KPI 2: Saídas Totais */}
            <div className="bg-[#F4F6FB] dark:bg-[#181F32] rounded-xl p-2.5 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Saídas (Gastos)
                </span>
                <span className="w-6 h-6 rounded-full bg-[#1456FF] text-white flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                data-testid="kpi-total-expense"
                className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white truncate"
              >
                {formatBrlCents(currentSummary.totalExpenseCents)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                Fixo: {formatBrlCents(currentSummary.fixedExpenseCents).replace(',00', '')} · Var: {formatBrlCents(currentSummary.variableExpenseCents).replace(',00', '')}
              </div>
            </div>

            {/* KPI 3: Meta Mensal de Sobra */}
            <div className="bg-[#F4F6FB] dark:bg-[#181F32] rounded-xl p-2.5 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Meta de Sobra
                </span>
                <span className="w-6 h-6 rounded-full bg-white dark:bg-[#111624] text-[#1456FF] dark:text-[#E2FF1A] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white truncate">
                {formatBrlCents(currentSummary.targetSurplusCents)}
              </div>
              <div className="mt-1 text-[11px] font-mono tabular-nums font-bold text-[#1456FF] dark:text-[#E2FF1A] truncate">
                {currentSummary.targetProgressPercent}% da meta atingido
              </div>
            </div>
          </div>

          {/* Triple Action Row inside KPI Card */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-200/80 dark:border-[#1E273C] grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onOpenNewModal('expense')}
              className="flex items-center justify-between px-3.5 py-1.5 text-xs font-bold text-white bg-[#1456FF] hover:bg-[#0D44D9] rounded-xl transition-colors whitespace-nowrap"
            >
              <span className="truncate">+ Nova Saída</span>
              <span aria-hidden="true" className="ml-1">→</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNewModal('income')}
              className="flex items-center justify-between px-3.5 py-1.5 text-xs font-bold text-[#0A0E17] dark:text-white bg-[#F4F6FB] dark:bg-[#181F32] hover:bg-slate-200 dark:hover:bg-[#242F49] rounded-xl transition-colors whitespace-nowrap"
            >
              <span className="truncate">+ Nova Entrada</span>
              <span aria-hidden="true" className="ml-1">→</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('quick_launch')}
              className="flex items-center justify-between px-3.5 py-1.5 text-xs font-extrabold text-[#0A0E17] bg-[#E2FF1A] hover:bg-[#d5f20d] rounded-xl transition-colors whitespace-nowrap"
            >
              <span className="inline-flex items-center gap-1 truncate">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1-Clique ({standardPresetsCount})</span>
              </span>
              <span aria-hidden="true" className="ml-1">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Row 2: Two-Column Split — Multi-Month Cash Flow SVG Chart + Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left 7 cols: Multi-month Evolution of Entradas, Saídas, and Sobras */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-3.5 flex flex-col justify-between min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
                Evolução Mensal: Entradas, Saídas e Sobras
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Geração de caixa livre por competência
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1456FF]" />
                Entradas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-slate-400" />
                Saídas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C8E600]" />
                Sobra
              </span>
            </div>
          </div>

          {/* Contained Custom SVG Bar Chart (No overflow-visible) */}
          <div className="flex items-center justify-center py-2">
            <svg
              viewBox="0 0 600 165"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-36 max-h-40"
              role="img"
              aria-label="Gráfico comparativo de entradas, saídas e sobras mensais"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 138 - ratio * 108;
                const val = Math.round(maxChartVal * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1="68"
                      y1={y}
                      x2="585"
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-[#1E273C]"
                      strokeDasharray={ratio === 0 ? undefined : '3 3'}
                      strokeWidth="1"
                    />
                    <text
                      x="62"
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
                    >
                      {formatBrlCents(val).replace(',00', '')}
                    </text>
                  </g>
                );
              })}

              {multiMonthSeries.map((item, idx) => {
                const groupX = 100 + idx * 122;
                const incHeight = Math.max(2, (item.incomeCents / maxChartVal) * 108);
                const expHeight = Math.max(2, (item.expenseCents / maxChartVal) * 108);
                const surpHeight = Math.max(
                  2,
                  (Math.max(0, item.surplusCents) / maxChartVal) * 108
                );
                const isCurrent = item.key === activeMonth;

                return (
                  <g key={item.key}>
                    {isCurrent && (
                      <rect
                        x={groupX - 14}
                        y={14}
                        width={92}
                        height={130}
                        rx={10}
                        className="fill-[#F4F6FB] dark:fill-[#181F32]"
                      />
                    )}

                    <rect
                      x={groupX}
                      y={138 - incHeight}
                      width={18}
                      height={incHeight}
                      rx={4}
                      fill="#1456FF"
                    />

                    <rect
                      x={groupX + 22}
                      y={138 - expHeight}
                      width={18}
                      height={expHeight}
                      rx={4}
                      className="fill-slate-700 dark:fill-slate-400"
                    />

                    <rect
                      x={groupX + 44}
                      y={138 - surpHeight}
                      width={18}
                      height={surpHeight}
                      rx={4}
                      fill={item.surplusCents >= 0 ? '#C8E600' : '#dc2626'}
                    />

                    <text
                      x={groupX + 31}
                      y={Math.max(24, Math.min(138 - incHeight, 138 - expHeight) - 5)}
                      textAnchor="middle"
                      className="fill-slate-800 dark:fill-slate-200 text-[9px] font-mono font-bold"
                    >
                      {item.surplusCents >= 0 ? `+${item.surplusRate}%` : 'Déficit'}
                    </text>

                    <text
                      x={groupX + 31}
                      y={156}
                      textAnchor="middle"
                      className={`text-[10px] ${
                        isCurrent
                          ? 'fill-[#1456FF] dark:fill-[#E2FF1A] font-extrabold'
                          : 'fill-slate-500 dark:fill-slate-400 font-medium'
                      }`}
                    >
                      {item.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Summary diagnostic row */}
          <div className="pt-2.5 border-t border-slate-200/80 dark:border-[#1E273C] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div>
              <span>Fixo: </span>
              <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                {currentSummary.fixedCommitmentPercent}%
              </strong>
              <span aria-hidden="true"> · </span>
              <span>Variável: </span>
              <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                {currentSummary.variableCommitmentPercent}%
              </strong>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('transactions')}
              className="font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline whitespace-nowrap"
            >
              Livro Caixa ({monthTransactions.length}) →
            </button>
          </div>
        </section>

        {/* Right 5 cols: Top 4 Expense Categories & Limit Usage */}
        <section className="lg:col-span-5 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-[#1E273C]">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
                  Maiores Saídas por Categoria
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Consumo frente ao teto mensal
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('analysis')}
                className="text-[11px] font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline whitespace-nowrap shrink-0"
              >
                Ver análise →
              </button>
            </div>

            {topExpenseCategories.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Nenhuma saída registrada neste mês.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenNewModal('expense')}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors"
                >
                  Registrar Primeiro Gasto
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#1E273C] pt-1">
                {topExpenseCategories.map((cat, index) => {
                  const barWidth =
                    cat.monthlyLimitCents > 0
                      ? Math.min(100, cat.limitUsagePercent)
                      : Math.min(100, cat.shareOfTypePercent);

                  return (
                    <div key={cat.categoryId} className="py-2">
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-[#1456FF] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            0{index + 1}
                          </span>
                          <span className="font-bold text-[#0A0E17] dark:text-white truncate text-xs">
                            {cat.categoryName}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-right shrink-0 text-[11px]">
                          <span
                            className={`font-bold ${
                              cat.isOverLimit
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-[#0A0E17] dark:text-white'
                            }`}
                          >
                            {formatBrlCents(cat.spentCents)}
                          </span>
                          {cat.monthlyLimitCents > 0 && (
                            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
                              {' '}
                              / {formatBrlCents(cat.monthlyLimitCents).replace(',00', '')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#F4F6FB] dark:bg-[#181F32] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cat.isOverLimit
                              ? 'bg-red-600'
                              : cat.limitUsagePercent >= 85
                              ? 'bg-amber-500'
                              : 'bg-[#1456FF]'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-200/80 dark:border-[#1E273C] flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate">Controle de tetos por categoria</span>
            <button
              type="button"
              onClick={() => onNavigateTab('categories')}
              className="font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline whitespace-nowrap shrink-0"
            >
              Ajustar tetos →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
