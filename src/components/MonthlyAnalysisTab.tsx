import React, { useState, useEffect } from 'react';
import {
  Check,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Target,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  calculateMonthlySummary,
  calculateDynamicSummary,
  calculateCategoryBreakdown,
  calculateDynamicCategoryBreakdown,
  simulateSurplusAllocation,
  type FinancialTransaction,
  type FinancialCategory,
  type MonthlySurplusPlan,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS } from '../utils/seedData';

interface MonthlyAnalysisTabProps {
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  activeMonth: string;
  monthlyPlan: MonthlySurplusPlan;
  onSaveMonthlyPlan: (updatedPlan: Omit<MonthlySurplusPlan, 'id' | 'uid'>) => Promise<void>;
  onRecordSurplusAllocation: (amountCents: number, label: string) => Promise<void>;
  filteredTransactions?: FinancialTransaction[];
  periodLabel?: string;
}

const AUDIT_PAGE_SIZE = 5;

export function MonthlyAnalysisTab({
  transactions,
  categories,
  activeMonth,
  monthlyPlan,
  onSaveMonthlyPlan,
  onRecordSurplusAllocation,
  filteredTransactions,
  periodLabel,
}: MonthlyAnalysisTabProps) {
  const [subView, setSubView] = useState<'simulator' | 'audit'>('simulator');
  const [auditPage, setAuditPage] = useState(1);

  const [targetPercent, setTargetPercent] = useState(monthlyPlan.targetSurplusPercent);
  const [targetCentsInput, setTargetCentsInput] = useState(
    (monthlyPlan.targetSurplusCents / 100).toFixed(2).replace('.', ',')
  );
  const [emergencyShare, setEmergencyShare] = useState(monthlyPlan.emergencySharePercent);
  const [investmentsShare, setInvestmentsShare] = useState(monthlyPlan.investmentsSharePercent);
  const [goalsShare, setGoalsShare] = useState(monthlyPlan.goalsSharePercent);
  const [planSavedFeedback, setPlanSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    setTargetPercent(monthlyPlan.targetSurplusPercent);
    setTargetCentsInput((monthlyPlan.targetSurplusCents / 100).toFixed(2).replace('.', ','));
    setEmergencyShare(monthlyPlan.emergencySharePercent);
    setInvestmentsShare(monthlyPlan.investmentsSharePercent);
    setGoalsShare(monthlyPlan.goalsSharePercent);
  }, [monthlyPlan]);

  useEffect(() => {
    setAuditPage(1);
  }, [activeMonth]);

  const planConfig = {
    ...monthlyPlan,
    targetSurplusPercent: targetPercent,
    targetSurplusCents: parseInputToCents(targetCentsInput),
  };

  const summary = filteredTransactions
    ? calculateDynamicSummary(filteredTransactions, periodLabel ?? activeMonth, planConfig)
    : calculateMonthlySummary(transactions, activeMonth, planConfig);

  const expenseBreakdown = filteredTransactions
    ? calculateDynamicCategoryBreakdown(filteredTransactions, categories, 'expense')
    : calculateCategoryBreakdown(transactions, categories, activeMonth, 'expense');

  const totalShares = emergencyShare + investmentsShare + goalsShare;
  const normEmergency = totalShares > 0 ? Math.round((emergencyShare / totalShares) * 100) : 40;
  const normInvestments = totalShares > 0 ? Math.round((investmentsShare / totalShares) * 100) : 40;
  const normGoals = Math.max(0, 100 - normEmergency - normInvestments);

  const simulation = simulateSurplusAllocation(
    summary.freeUnallocatedSurplusCents,
    normEmergency,
    normInvestments,
    normGoals
  );

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSavedFeedback(null);
    const parsedTargetCents = parseInputToCents(targetCentsInput);
    await onSaveMonthlyPlan({
      monthKey: activeMonth,
      targetSurplusPercent: targetPercent,
      targetSurplusCents: parsedTargetCents,
      emergencySharePercent: normEmergency,
      investmentsSharePercent: normInvestments,
      goalsSharePercent: normGoals,
    });
    setPlanSavedFeedback('Plano mensal de sobras atualizado!');
  };

  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;
  const totalAuditPages = Math.max(1, Math.ceil(expenseBreakdown.length / AUDIT_PAGE_SIZE));
  const safeAuditPage = Math.min(auditPage, totalAuditPages);
  const paginatedAudit = expenseBreakdown.slice(
    (safeAuditPage - 1) * AUDIT_PAGE_SIZE,
    safeAuditPage * AUDIT_PAGE_SIZE
  );

  return (
    <div className="space-y-2.5">
      {/* Top Sub-Navigation Bar */}
      <section className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
            Análise Mensal & Planejador de Sobras ({periodLabel ?? monthLabel})
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Simule a alocação da sobra líquida em 3 caixinhas ou audite os tetos por categoria
          </p>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-[#F4F6FB] dark:bg-[#080B12] rounded-full self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSubView('simulator')}
            className={`px-3 py-1 text-xs font-extrabold rounded-full transition-colors whitespace-nowrap ${
              subView === 'simulator'
                ? 'bg-[#1456FF] text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Planejador 12M
          </button>
          <button
            type="button"
            onClick={() => setSubView('audit')}
            className={`px-3 py-1 text-xs font-extrabold rounded-full transition-colors whitespace-nowrap ${
              subView === 'audit'
                ? 'bg-[#E2FF1A] text-[#0A0E17]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Auditoria de Tetos ({expenseBreakdown.length})
          </button>
        </div>
      </section>

      {subView === 'simulator' ? (
        /* Sub-View 1: Surplus Command Center & Allocation Simulator */
        <section
          aria-label="Planejador de Controle de Sobras"
          className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
                Planejador de Sobras & Destinação Inteligente ({periodLabel ?? monthLabel})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Transforme o saldo positivo em patrimônio protegido e metas reais
              </p>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums shrink-0">
              <span>Sobra Livre: </span>
              <strong className="text-[#1456FF] dark:text-[#E2FF1A] text-sm">
                {formatBrlCents(summary.freeUnallocatedSurplusCents)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left 5 cols: Configuration of Target & Distribution Rules */}
            <form onSubmit={handleSavePlan} className="lg:col-span-5 space-y-3">
              {planSavedFeedback && (
                <div className="flex items-center gap-2 p-2 text-xs font-bold text-[#0A0E17] bg-[#E2FF1A] rounded-xl">
                  <Check className="w-3.5 h-3.5 shrink-0 text-[#0A0E17]" />
                  <span>{planSavedFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="plan-target-brl" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta no Mês (R$)
                  </label>
                  <input
                    id="plan-target-brl"
                    type="text"
                    value={targetCentsInput}
                    onChange={(e) => setTargetCentsInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1456FF]"
                  />
                </div>

                <div>
                  <label htmlFor="plan-target-pct" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta da Renda (%)
                  </label>
                  <input
                    id="plan-target-pct"
                    type="number"
                    min={5}
                    max={85}
                    value={targetPercent}
                    onChange={(e) => setTargetPercent(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1456FF]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Regra de Divisão da Sobra Líquida (Total = 100%)
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                    <label htmlFor="slider-emergency">1. Reserva de Emergência</label>
                    <span className="font-mono tabular-nums font-bold text-[#1456FF] dark:text-[#E2FF1A]">
                      {normEmergency}%
                    </span>
                  </div>
                  <input
                    id="slider-emergency"
                    type="range"
                    min={0}
                    max={100}
                    value={emergencyShare}
                    onChange={(e) => setEmergencyShare(Number(e.target.value))}
                    className="w-full accent-[#1456FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                    <label htmlFor="slider-investments">2. Investimentos & Futuro</label>
                    <span className="font-mono tabular-nums font-bold text-[#1456FF] dark:text-[#E2FF1A]">
                      {normInvestments}%
                    </span>
                  </div>
                  <input
                    id="slider-investments"
                    type="range"
                    min={0}
                    max={100}
                    value={investmentsShare}
                    onChange={(e) => setInvestmentsShare(Number(e.target.value))}
                    className="w-full accent-[#1456FF]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                    <label htmlFor="slider-goals">3. Objetivos & Projetos</label>
                    <span className="font-mono tabular-nums font-bold text-[#1456FF] dark:text-[#E2FF1A]">
                      {normGoals}%
                    </span>
                  </div>
                  <input
                    id="slider-goals"
                    type="range"
                    min={0}
                    max={100}
                    value={goalsShare}
                    onChange={(e) => setGoalsShare(Number(e.target.value))}
                    className="w-full accent-[#1456FF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Diretriz de Sobras
              </button>
            </form>

            {/* Right 7 cols: Concrete Bucket Allocation Grid & 12-Month Electric Cobalt Showcase */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Bucket 1: Reserva */}
                <div className="p-3.5 bg-[#F4F6FB] dark:bg-[#181F32] rounded-2xl flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="font-semibold truncate">Reserva ({normEmergency}%)</span>
                      <span className="w-6 h-6 rounded-full bg-[#E2FF1A] text-[#0A0E17] flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-sm xl:text-base font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white truncate">
                      {formatBrlCents(simulation.emergencyCents)}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Liquidez diária (CDB 100% CDI / Selic)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={simulation.emergencyCents <= 0}
                    onClick={() =>
                      onRecordSurplusAllocation(
                        simulation.emergencyCents,
                        'Aporte Reserva de Emergência'
                      )
                    }
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors disabled:opacity-40"
                  >
                    Efetivar Aporte
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Bucket 2: Investimentos */}
                <div className="p-3.5 bg-[#F4F6FB] dark:bg-[#181F32] rounded-2xl flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="font-semibold truncate">Invest. ({normInvestments}%)</span>
                      <span className="w-6 h-6 rounded-full bg-[#1456FF] text-white flex items-center justify-center shrink-0">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-sm xl:text-base font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white truncate">
                      {formatBrlCents(simulation.investmentsCents)}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Multiplicação (IPCA+, FIIs, Ações)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={simulation.investmentsCents <= 0}
                    onClick={() =>
                      onRecordSurplusAllocation(
                        simulation.investmentsCents,
                        'Aporte Carteira de Investimentos'
                      )
                    }
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors disabled:opacity-40"
                  >
                    Efetivar Aporte
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Bucket 3: Metas */}
                <div className="p-3.5 bg-[#F4F6FB] dark:bg-[#181F32] rounded-2xl flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="font-semibold truncate">Objetivos ({normGoals}%)</span>
                      <span className="w-6 h-6 rounded-full bg-[#E2FF1A] text-[#0A0E17] flex items-center justify-center shrink-0">
                        <Target className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-sm xl:text-base font-extrabold font-mono tabular-nums text-[#0A0E17] dark:text-white truncate">
                      {formatBrlCents(simulation.goalsCents)}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      Viagens, projetos ou compras à vista
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={simulation.goalsCents <= 0}
                    onClick={() =>
                      onRecordSurplusAllocation(
                        simulation.goalsCents,
                        'Caixinha Projetos & Objetivos'
                      )
                    }
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors disabled:opacity-40"
                  >
                    Efetivar Aporte
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 12-Month Wealth Accumulation Row in Signature Electric Cobalt + Volt Lime */}
              <div className="p-3.5 bg-[#1456FF] text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[#E2FF1A] text-[#0A0E17] flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold font-display text-white truncate">
                      Projeção de Acúmulo de Sobras em 12 Meses
                    </div>
                    <p className="text-[11px] text-blue-100 truncate">
                      Mantendo este ritmo mensal com rendimento conservador de 0,85% a.m.
                    </p>
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#E2FF1A] shrink-0">
                  {formatBrlCents(simulation.projected12MonthsCents)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200/80 dark:border-[#1E273C] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Já alocado em caixinhas neste mês:{' '}
              <strong className="font-mono tabular-nums text-[#0A0E17] dark:text-white">
                {formatBrlCents(summary.surplusAssignedCents)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setSubView('audit')}
              className="font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline"
            >
              Ver Auditoria de Tetos por Categoria →
            </button>
          </div>
        </section>
      ) : (
        /* Sub-View 2: Paginated Category Budget vs. Actual Table */
        <section
          aria-label="Auditoria Mensal por Categoria"
          className="flex-1 min-h-0 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl flex flex-col justify-between overflow-hidden"
        >
          <div className="shrink-0 px-4 py-3 border-b border-slate-200/80 dark:border-[#1E273C] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold font-display text-[#0A0E17] dark:text-white truncate">
                Auditoria Mensal por Tipo de Gasto vs. Teto Planejado
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Identifique onde estão os maiores desvios para ampliar sua margem de sobra
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubView('simulator')}
              className="text-xs font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline whitespace-nowrap shrink-0"
            >
              ← Simulador 12M
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E273C] bg-[#F4F6FB]/70 dark:bg-[#0C101C] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4">Categoria de Saída</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Natureza</th>
                  <th className="py-2.5 px-3 text-right">Realizado</th>
                  <th className="py-2.5 px-3 text-right hidden md:table-cell">Teto</th>
                  <th className="py-2.5 px-3 text-right">Margem / Excesso</th>
                  <th className="py-2.5 px-4 w-40">Consumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-[#1E273C] text-xs">
                {paginatedAudit.map((item) => {
                  const diffCents = item.monthlyLimitCents - item.spentCents;
                  return (
                    <tr key={item.categoryId} className="hover:bg-[#F4F6FB]/60 dark:hover:bg-[#181F32]/60 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#0A0E17] dark:text-white">
                        {item.categoryName}
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({item.transactionCount})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {item.nature === 'fixed' ? 'Fixo' : 'Variável'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0A0E17] dark:text-white">
                        {formatBrlCents(item.spentCents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 hidden md:table-cell">
                        {item.monthlyLimitCents > 0
                          ? formatBrlCents(item.monthlyLimitCents)
                          : 'Sem teto'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums text-[11px] font-bold ${
                          item.monthlyLimitCents === 0
                            ? 'text-slate-400'
                            : diffCents >= 0
                            ? 'text-[#1456FF] dark:text-[#E2FF1A]'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.monthlyLimitCents === 0
                          ? '—'
                          : diffCents >= 0
                          ? `Folga ${formatBrlCents(diffCents)}`
                          : `Excesso ${formatBrlCents(Math.abs(diffCents))}`}
                      </td>
                      <td className="py-2.5 px-4">
                        {item.monthlyLimitCents > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#F4F6FB] dark:bg-[#181F32] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.isOverLimit
                                    ? 'bg-red-600'
                                    : item.limitUsagePercent >= 85
                                    ? 'bg-amber-500'
                                    : 'bg-[#1456FF]'
                                }`}
                                style={{ width: `${Math.min(100, item.limitUsagePercent)}%` }}
                              />
                            </div>
                            <span className="font-mono tabular-nums text-[11px] font-bold text-slate-700 dark:text-slate-300 w-9 text-right">
                              {item.limitUsagePercent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {item.shareOfTypePercent}% das saídas
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 px-4 py-2.5 bg-[#F4F6FB]/60 dark:bg-[#0C101C] border-t border-slate-200 dark:border-[#1E273C] flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              Pág. <strong className="text-[#0A0E17] dark:text-white">{safeAuditPage}</strong>/{totalAuditPages} ({expenseBreakdown.length} categorias)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeAuditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#0A0E17] dark:text-white disabled:opacity-40 hover:border-[#1456FF] transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Ant.
              </button>
              <button
                type="button"
                disabled={safeAuditPage >= totalAuditPages}
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#0A0E17] dark:text-white disabled:opacity-40 hover:border-[#1456FF] transition-colors"
              >
                Próx.
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
