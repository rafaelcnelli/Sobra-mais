import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  ArrowRight,
  Lightbulb,
  Brain,
  Clock,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  formatBrlCents,
  calculateMonthlySummary,
  calculateCategoryBreakdown,
  calculateDynamicCategoryBreakdown,
  generatePersonalizedSavingsTips,
  calculatePredictiveInsights,
  type FinancialCategory,
  type FinancialTransaction,
  type MonthlySurplusPlan,
  type MonthlyFinancialSummary,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS } from '../utils/seedData';
import type { ActiveTab } from '../App';

interface OverviewTabProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  activeMonth: string;
  monthlyPlan: MonthlySurplusPlan;
  onQuickLaunchPreset: (category: FinancialCategory) => Promise<void>;
  onOpenNewModal: (defaultType?: 'income' | 'expense', initialTab?: 'quick' | 'detailed') => void;
  onEditTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onNavigateTab: (tab: ActiveTab) => void;
  onFilterByCategory?: (categoryId: string) => void;
  filteredTransactions?: FinancialTransaction[];
  summary?: MonthlyFinancialSummary;
  periodLabel?: string;
  isPrivacyMode?: boolean;
  isPredictiveEnabled?: boolean;
  onTogglePredictive?: (enabled: boolean) => void;
}

export function OverviewTab({
  transactions,
  categories,
  activeMonth,
  monthlyPlan,
  onOpenNewModal,
  onNavigateTab,
  onFilterByCategory,
  filteredTransactions,
  summary,
  periodLabel,
  isPredictiveEnabled = true,
  onTogglePredictive,
}: OverviewTabProps) {
  const currentSummary: MonthlyFinancialSummary =
    summary ?? calculateMonthlySummary(transactions, activeMonth, monthlyPlan);

  const monthTransactions =
    filteredTransactions ?? transactions.filter((t) => t.monthKey === activeMonth);

  const predictive = calculatePredictiveInsights(transactions, activeMonth, monthlyPlan);

  const smartTips = generatePersonalizedSavingsTips(
    transactions,
    categories,
    activeMonth,
    currentSummary,
    monthlyPlan.targetSurplusCents
  );

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
    ...multiMonthSeries.map((d) =>
      Math.max(d.incomeCents, d.expenseCents, Math.abs(d.surplusCents))
    )
  );
  const maxChartVal = Math.ceil(rawMaxVal / 400000) * 400000;

  const handlePieCategoryClick = (categoryId: string) => {
    if (categoryId === 'others') {
      onNavigateTab('transactions');
      return;
    }
    if (onFilterByCategory) {
      onFilterByCategory(categoryId);
    } else {
      onNavigateTab('transactions');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* =====================================================================
          1. DOBRA 1 (DESTAQUE): CARD HERO DA SOBRA LÍQUIDA (SALDO REAL VS PREVISTO) + 3 KPIs ESTRATÉGICOS
      ===================================================================== */}
      <section
        aria-label="Indicadores Financeiros do Mês"
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch"
      >
        {/* Left 5 cols: Card Hero da Sobra Líquida */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1860FC] to-[#0D48D9] text-white rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-blue-100 tracking-wide block truncate">
                Visão Geral ·{' '}
                {periodLabel ??
                  (AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth)}
              </span>
              <h1 className="text-base sm:text-lg font-extrabold font-display tracking-tight mt-1 truncate">
                Saldo Real Atual{' '}
                {periodLabel && periodLabel !== activeMonth ? '(Período Ativo)' : '(Sobra Efetivada)'}
              </h1>
            </div>
            <div className="px-3 py-1 rounded-full bg-white/15 flex items-center gap-1.5 shrink-0">
              {currentSummary.netSurplusCents >= 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D4F907]" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-[#D4F907]" />
              )}
              <span className="text-xs font-extrabold font-mono text-[#D4F907]">
                {currentSummary.surplusRatePercent}% retido
              </span>
            </div>
          </div>

          <div className="my-4 space-y-2.5">
            <div
              data-testid="kpi-net-surplus"
              className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight text-white truncate"
            >
              {formatBrlCents(currentSummary.netSurplusCents, true)}
            </div>

            {/* Indicador Secundário: Saldo Previsto (considerando contas fixas e receitas pendentes do mês) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/12 border border-white/15 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-blue-100">
                <Clock className="w-3.5 h-3.5 text-[#D4F907] shrink-0" />
                <span>Saldo Previsto (c/ pendentes):</span>
              </span>
              <span
                data-testid="kpi-projected-surplus"
                className="font-mono font-black tabular-nums text-[#D4F907]"
              >
                {formatBrlCents(currentSummary.projectedNetSurplusCents, true)}
              </span>
            </div>

            <p className="text-xs text-blue-100 leading-relaxed pt-0.5">
              {currentSummary.pendingCount > 0 ? (
                <span>
                  Há <strong>{currentSummary.pendingCount}</strong> lançamento
                  {currentSummary.pendingCount === 1 ? '' : 's'} pendente
                  {currentSummary.pendingCount === 1 ? '' : 's'} no mês (+
                  {formatBrlCents(currentSummary.pendingIncomeCents)} / -
                  {formatBrlCents(currentSummary.pendingExpenseCents)}).
                </span>
              ) : currentSummary.netSurplusCents >= 0 ? (
                `Taxa de retenção de ${currentSummary.surplusRatePercent}% da renda mensal (${currentSummary.targetProgressPercent}% da meta atingido).`
              ) : (
                'Atenção: as saídas deste mês superaram as entradas.'
              )}
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onNavigateTab('planner')}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-extrabold text-[#000000] bg-[#D4F907] hover:bg-[#C0E206] rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <span className="truncate">Planejar sobras e metas do mês</span>
              <span aria-hidden="true" className="text-xs font-mono ml-2">
                →
              </span>
            </button>

            {/* Floating White/Dark 3-Metric Dock inside Hero Card */}
            <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-[#1E273C] bg-white dark:bg-[#000000] text-[#000000] dark:text-white rounded-xl py-2.5 px-1.5">
              <div className="px-2 text-center min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Retenção
                </div>
                <div className="text-xs font-bold font-mono tabular-nums mt-0.5 truncate">
                  {currentSummary.surplusRatePercent}%
                </div>
              </div>
              <div className="px-2 text-center min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Meta Mês
                </div>
                <div className="text-xs font-bold font-mono tabular-nums mt-0.5 truncate">
                  {currentSummary.targetProgressPercent}%
                </div>
              </div>
              <div className="px-2 text-center min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Já Alocado
                </div>
                <div className="text-xs font-bold font-mono tabular-nums text-[#1860FC] dark:text-[#D4F907] mt-0.5 truncate">
                  {formatBrlCents(currentSummary.surplusAssignedCents).replace(',00', '')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 cols: Os 3 KPIs Estratégicos (Entradas, Saídas e Sobras Livres não alocadas) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* KPI 1: Entradas */}
            <div className="bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/60 dark:border-[#1E273C] rounded-2xl p-4 flex flex-col justify-between min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                  Entradas (Efetivadas)
                </span>
                <span className="w-6 h-6 rounded-full bg-[#D4F907] text-[#000000] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                data-testid="kpi-total-income"
                className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#000000] dark:text-white truncate"
              >
                {formatBrlCents(currentSummary.totalIncomeCents)}
              </div>
              <div className="mt-1 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                Previsto: <strong className="text-emerald-600 dark:text-[#D4F907]">{formatBrlCents(currentSummary.projectedIncomeCents)}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">
                  {currentSummary.pendingIncomeCents > 0
                    ? `⏳ +${formatBrlCents(currentSummary.pendingIncomeCents)}`
                    : '100% recebido'}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenNewModal('income', 'detailed')}
                  className="text-[#1860FC] dark:text-[#D4F907] hover:underline font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Entrada
                </button>
              </div>
            </div>

            {/* KPI 2: Saídas */}
            <div className="bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/60 dark:border-[#1E273C] rounded-2xl p-4 flex flex-col justify-between min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                  Saídas (Pagas)
                </span>
                <span className="w-6 h-6 rounded-full bg-[#1860FC] text-white flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                data-testid="kpi-total-expense"
                className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#000000] dark:text-white truncate"
              >
                {formatBrlCents(currentSummary.totalExpenseCents)}
              </div>
              <div className="mt-1 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                Previsto: <strong className="text-[#000000] dark:text-white">{formatBrlCents(currentSummary.projectedExpenseCents)}</strong>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                {currentSummary.pendingExpenseCents > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    ⏳ Pendente: {formatBrlCents(currentSummary.pendingExpenseCents)}
                  </span>
                ) : (
                  <>
                    Fixo: {formatBrlCents(currentSummary.fixedExpenseCents).replace(',00', '')} · Var:{' '}
                    {formatBrlCents(currentSummary.variableExpenseCents).replace(',00', '')}
                  </>
                )}
              </div>
            </div>

            {/* KPI 3: Sobras Livres não alocadas + Micro-interação "Alocar nas Caixinhas →" */}
            <div className="bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/60 dark:border-[#1E273C] rounded-2xl p-4 flex flex-col justify-between min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                  Sobras Livres
                </span>
                <span className="w-6 h-6 rounded-full bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907] flex items-center justify-center shrink-0">
                  <PiggyBank className="w-3.5 h-3.5" />
                </span>
              </div>
              <div
                data-testid="kpi-free-surplus"
                className={`text-base xl:text-lg font-extrabold font-mono tabular-nums truncate ${
                  currentSummary.freeUnallocatedSurplusCents > 0
                    ? 'text-emerald-600 dark:text-[#D4F907]'
                    : currentSummary.freeUnallocatedSurplusCents < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#000000] dark:text-white'
                }`}
              >
                {formatBrlCents(currentSummary.freeUnallocatedSurplusCents)}
              </div>
              <div className="mt-1 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                Previsto livre: <strong>{formatBrlCents(currentSummary.projectedFreeSurplusCents)}</strong>
              </div>
              <div className="mt-1">
                {currentSummary.freeUnallocatedSurplusCents > 0 ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('planner')}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#1860FC] dark:text-[#D4F907] hover:underline cursor-pointer"
                  >
                    <span>Alocar nas Caixinhas</span>
                    <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    {currentSummary.surplusAssignedCents > 0
                      ? `Alocado: ${formatBrlCents(currentSummary.surplusAssignedCents)}`
                      : 'Nenhuma sobra livre pendente'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações Rápidas (2-Cliques) */}
          <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-[#1E273C] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenNewModal('expense', 'quick')}
              className="col-span-2 sm:col-span-1 flex items-center justify-between px-4 py-2.5 text-xs font-extrabold text-[#000000] bg-[#D4F907] hover:bg-[#C0E206] rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="truncate">Lançamento Rápido</span>
              </span>
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNewModal('expense', 'detailed')}
              className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-white bg-[#1860FC] hover:bg-[#0D48D9] rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <span className="truncate">+ Nova Saída</span>
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNewModal('income', 'detailed')}
              className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-[#000000] dark:text-white bg-[#F8FAFC] dark:bg-[#181F32] hover:bg-slate-200 dark:hover:bg-[#242F49] rounded-xl transition-colors whitespace-nowrap cursor-pointer border border-slate-200/70 dark:border-[#1E273C]"
            >
              <span className="truncate">+ Nova Entrada</span>
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          1.5. INTELIGÊNCIA PREDITIVA: "ORÇAMENTO DIÁRIO SEGURO" & "PREVISÃO DE FECHAMENTO"
               (Exibido APENAS quando isPredictiveEnabled === true)
      ===================================================================== */}
      {isPredictiveEnabled && (
        <section
          aria-label="Inteligência Preditiva de Sobras"
          data-testid="predictive-intelligence-card"
          className="bg-white dark:bg-[#111624] border-2 border-[#1860FC]/30 dark:border-[#1860FC]/50 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-[#D4F907] flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white truncate">
                    Inteligência Preditiva · Orçamento Diário & Fechamento
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1860FC]/10 dark:bg-[#1860FC]/25 text-[#1860FC] dark:text-[#D4F907]">
                    {predictive.monthStatus === 'current'
                      ? `${predictive.remainingDays} dias restantes no mês`
                      : predictive.monthStatus === 'past'
                      ? 'Competência encerrada'
                      : 'Planejamento futuro'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Cálculo de gasto diário seguro (Safe-to-Spend) e projeção automática de fechamento (Run-rate)
                </p>
              </div>
            </div>

            {onTogglePredictive && (
              <button
                type="button"
                onClick={() => onTogglePredictive(false)}
                title="Ocultar Inteligência Preditiva (pode ser reativada em Ajustes & Categorias)"
                aria-label="Ocultar card de Inteligência Preditiva"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/80 dark:border-[#242F48] rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Ocultar</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Orçamento Diário Seguro (Safe-to-Spend) */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
                  <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                    1. Orçamento Diário Seguro (Safe-to-Spend)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full ${
                    predictive.isAboveOrAtTarget
                      ? 'bg-[#D4F907] text-[#000000]'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {predictive.isAboveOrAtTarget
                    ? `${formatBrlCents(predictive.safeDailySpendCents)}/dia`
                    : `Economizar ${formatBrlCents(predictive.dailyRecoveryNeededCents)}/dia`}
                </span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {predictive.isAboveOrAtTarget ? (
                  <p>
                    Para garantir sua meta de{' '}
                    <strong className="font-mono text-[#1860FC] dark:text-[#D4F907]">
                      {formatBrlCents(predictive.targetSurplusCents)}
                    </strong>
                    , você pode gastar até{' '}
                    <strong className="font-mono text-emerald-600 dark:text-[#D4F907]">
                      {formatBrlCents(predictive.safeDailySpendCents)}/dia
                    </strong>{' '}
                    nos próximos <strong>{predictive.remainingDays} dias</strong>.
                  </p>
                ) : (
                  <p>
                    Sua sobra atual está{' '}
                    <strong className="font-mono text-amber-600 dark:text-amber-400">
                      {formatBrlCents(Math.abs(predictive.availableMarginCents))}
                    </strong>{' '}
                    abaixo da meta de{' '}
                    <strong className="font-mono">
                      {formatBrlCents(predictive.targetSurplusCents)}
                    </strong>
                    . Economize ou gere renda extra de{' '}
                    <strong className="font-mono text-[#1860FC] dark:text-[#D4F907]">
                      {formatBrlCents(predictive.dailyRecoveryNeededCents)}/dia
                    </strong>{' '}
                    nos próximos <strong>{predictive.remainingDays} dias</strong> para recuperar a meta.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200/70 dark:border-[#242F48] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>
                  Margem s/ Meta:{' '}
                  <strong className="text-[#000000] dark:text-white">
                    {formatBrlCents(predictive.availableMarginCents, true)}
                  </strong>
                </span>
                <span>
                  Restam: <strong>{predictive.remainingDays}d</strong> de {predictive.daysInMonth}d
                </span>
              </div>
            </div>

            {/* Bloco 2: Previsão de Fechamento (Run-rate Mensal) */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
                  <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                    2. Previsão de Fechamento (Run-rate Mensal)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full ${
                    predictive.isForecastAboveTarget
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#D4F907]'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {predictive.isForecastAboveTarget ? 'Acima da Meta' : 'Abaixo da Meta'}
                </span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                <p>
                  No ritmo atual, sua sobra estimada no fim do mês será de{' '}
                  <strong
                    className={`font-mono ${
                      predictive.estimatedClosingSurplusCents >= 0
                        ? 'text-emerald-600 dark:text-[#D4F907]'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatBrlCents(predictive.estimatedClosingSurplusCents, true)}
                  </strong>{' '}
                  (
                  <strong>
                    {predictive.isForecastAboveTarget ? 'Acima' : 'Abaixo'} da sua meta
                  </strong>{' '}
                  em{' '}
                  <span className="font-mono font-bold">
                    {formatBrlCents(Math.abs(predictive.forecastVsTargetDiffCents))}
                  </span>
                  ).
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/70 dark:border-[#242F48] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <span>
                  Ritmo variável:{' '}
                  <strong className="text-[#000000] dark:text-white">
                    {formatBrlCents(predictive.averageDailyVariableExpenseCents)}/dia
                  </strong>
                </span>
                <span>
                  Variável projetado:{' '}
                  <strong className="text-[#000000] dark:text-white">
                    {formatBrlCents(predictive.projectedVariableExpenseCents)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          2. FAIXA INTELIGENTE: DICAS E ALERTAS DE ECONOMIA AUTOMÁTICOS
      ===================================================================== */}
      <section
        aria-label="Faixa Inteligente de Dicas e Alertas de Economia"
        className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-200/80 dark:border-[#1E273C]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-[#D4F907] flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white truncate">
                Faixa Inteligente · Dicas e Alertas de Economia
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Análise automática do seu comportamento financeiro em relação aos tetos e metas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('planner')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1860FC] dark:text-[#D4F907] hover:underline shrink-0 cursor-pointer"
          >
            <span>Ir para Planejador & Metas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {smartTips.map((tip) => {
            const isAlert = tip.type === 'alert';
            const isWarning = tip.type === 'warning';
            const isSuccess = tip.type === 'success';

            return (
              <div
                key={tip.id}
                className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-extrabold text-[#000000] dark:text-white truncate">
                      {tip.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isAlert
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : isSuccess
                          ? 'bg-[#D4F907] text-[#000000]'
                          : 'bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907]'
                      }`}
                    >
                      {tip.highlightText}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {tip.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-[#242F48] flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 truncate">
                    {tip.actionHint ?? 'Ação recomendada'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('planner')}
                    className="font-extrabold text-[#1860FC] dark:text-[#D4F907] hover:underline shrink-0 cursor-pointer"
                  >
                    Otimizar →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          3. DOBRA 2 (GRÁFICOS): GRÁFICO DE PIZZA DE GASTOS POR CATEGORIA + GRÁFICO DE BARRAS MULTI-MÊS
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Left 5 cols: Gráfico de Pizza de Gastos por Categoria (Com micro-interação de clique -> Extrato filtrado) */}
        <section className="lg:col-span-5 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 flex flex-col justify-between min-w-0 shadow-sm">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-[#1E273C]">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white truncate">
                  Gastos por Categoria (Proporção)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Clique em uma categoria para abrir o Extrato filtrado
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('settings')}
                className="text-[11px] font-bold text-[#1860FC] dark:text-[#D4F907] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Tetos →
              </button>
            </div>

            {(() => {
              const allExpenseCategories = (
                filteredTransactions
                  ? calculateDynamicCategoryBreakdown(filteredTransactions, categories, 'expense')
                  : calculateCategoryBreakdown(transactions, categories, activeMonth, 'expense')
              ).filter((c) => c.spentCents > 0);

              const totalExpenseCents = allExpenseCategories.reduce(
                (sum, c) => sum + c.spentCents,
                0
              );

              if (totalExpenseCents === 0) {
                return (
                  <div className="py-8 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Nenhuma saída registrada neste período.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenNewModal('expense', 'quick')}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors cursor-pointer shadow-xs"
                    >
                      Registrar Primeiro Gasto
                    </button>
                  </div>
                );
              }

              const topList = allExpenseCategories.slice(0, 4);
              const othersSpentCents = allExpenseCategories
                .slice(4)
                .reduce((sum, c) => sum + c.spentCents, 0);

              const pieData = topList.map((item) => ({
                id: item.categoryId,
                label: item.categoryName,
                spentCents: item.spentCents,
                percent: Math.round((item.spentCents / totalExpenseCents) * 1000) / 10,
              }));

              if (othersSpentCents > 0) {
                pieData.push({
                  id: 'others',
                  label: 'Outros Gastos',
                  spentCents: othersSpentCents,
                  percent: Math.round((othersSpentCents / totalExpenseCents) * 1000) / 10,
                });
              }

              const pieColors = [
                '#1860FC', // Primary Electric Blue
                '#3B82F6', // Sky Blue
                '#D4F907', // Neon Lime Accent
                '#F59E0B', // Amber
                '#8B5CF6', // Purple (Outros)
              ];

              const radius = 38;
              const circumference = 2 * Math.PI * radius;
              let accumulatedAngle = 0;

              return (
                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Donut Chart SVG */}
                    <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                      <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full -rotate-90 transform"
                        role="img"
                        aria-label="Gráfico de pizza proporcional dos principais gastos"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="currentColor"
                          className="text-slate-100 dark:text-[#181F32]"
                          strokeWidth="15"
                        />
                        {pieData.map((slice, idx) => {
                          const sliceRatio = slice.spentCents / totalExpenseCents;
                          const strokeDasharray = `${sliceRatio * circumference} ${circumference}`;
                          const strokeDashoffset = -accumulatedAngle * circumference;
                          accumulatedAngle += sliceRatio;

                          return (
                            <circle
                              key={slice.id}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke={pieColors[idx % pieColors.length]}
                              strokeWidth="15"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              onClick={() => handlePieCategoryClick(slice.id)}
                              className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                            >
                              <title>{`${slice.label}: ${formatBrlCents(slice.spentCents)} (${slice.percent}%) — Clique para filtrar no Extrato`}</title>
                            </circle>
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-tight">
                          Total
                        </span>
                        <span className="text-xs font-black font-mono tabular-nums text-[#000000] dark:text-white leading-tight">
                          {formatBrlCents(totalExpenseCents).replace(',00', '')}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Proportional Legend List */}
                    <div className="flex-1 w-full space-y-1.5 min-w-0">
                      {pieData.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handlePieCategoryClick(item.id)}
                          title={`Ver lançamentos de ${item.label} no Extrato`}
                          className="w-full flex items-center justify-between gap-1.5 text-xs px-2 py-1 rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-[#181F32] transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                            />
                            <span className="font-bold text-[#000000] dark:text-white group-hover:text-[#1860FC] dark:group-hover:text-[#D4F907] truncate text-[11px] transition-colors">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono tabular-nums text-right shrink-0 text-[11px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {formatBrlCents(item.spentCents)}
                            </span>
                            <span
                              className="text-[10px] font-black px-1.5 py-0.2 rounded-full"
                              style={{
                                backgroundColor: `${pieColors[idx % pieColors.length]}20`,
                                color: pieColors[idx % pieColors.length],
                              }}
                            >
                              {item.percent}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="pt-2.5 mt-2 border-t border-slate-200/80 dark:border-[#1E273C] flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate">Clique numa fatia para auditar os gastos</span>
            <button
              type="button"
              onClick={() => onNavigateTab('transactions')}
              className="font-bold text-[#1860FC] dark:text-[#D4F907] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Extrato completo →
            </button>
          </div>
        </section>

        {/* Right 7 cols: Gráfico de Barras Multi-mês */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-3xl p-5 sm:p-6 flex flex-col justify-between min-w-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#000000] dark:text-white truncate">
                Evolução Multi-Mês: Entradas, Saídas e Sobras
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Geração de caixa livre por competência
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1860FC]" />
                Entradas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-slate-400" />
                Saídas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D4F907]" />
                Sobra
              </span>
            </div>
          </div>

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
                        className="fill-[#F8FAFC] dark:fill-[#181F32]"
                      />
                    )}

                    <rect
                      x={groupX}
                      y={138 - incHeight}
                      width={18}
                      height={incHeight}
                      rx={4}
                      fill="#1860FC"
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
                      fill={item.surplusCents >= 0 ? '#D4F907' : '#dc2626'}
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
                          ? 'fill-[#1860FC] dark:fill-[#D4F907] font-extrabold'
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

          <div className="pt-2.5 border-t border-slate-200/80 dark:border-[#1E273C] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div>
              <span>Fixo: </span>
              <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                {currentSummary.fixedCommitmentPercent}%
              </strong>
              <span aria-hidden="true"> · </span>
              <span>Variável: </span>
              <strong className="font-mono tabular-nums text-[#000000] dark:text-white">
                {currentSummary.variableCommitmentPercent}%
              </strong>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('transactions')}
              className="font-bold text-[#1860FC] dark:text-[#D4F907] hover:underline whitespace-nowrap cursor-pointer"
            >
              Ver no Extrato ({monthTransactions.length}) →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
