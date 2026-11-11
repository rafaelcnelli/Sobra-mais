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
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Percent,
  Wallet,
  Compass,
  Layers,
  Award,
  Lock,
  Edit3,
  Brain,
  X,
} from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  calculateMonthlySummary,
  calculateDynamicSummary,
  calculateCategoryBreakdown,
  calculateDynamicCategoryBreakdown,
  simulateSurplusAllocation,
  calculatePredictiveInsights,
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
  isPrivacyMode?: boolean;
  isPredictiveEnabled?: boolean;
  onTogglePredictive?: (enabled: boolean) => void;
}

const AUDIT_PAGE_SIZE = 6;

const SAVINGS_PRESETS = [
  { label: 'R$ 500', cents: 50000 },
  { label: 'R$ 1.000', cents: 100000 },
  { label: 'R$ 1.500', cents: 150000 },
  { label: 'R$ 2.000', cents: 200000 },
  { label: 'R$ 3.000', cents: 300000 },
  { label: 'R$ 5.000', cents: 500000 },
];

export function MonthlyAnalysisTab({
  transactions,
  categories,
  activeMonth,
  monthlyPlan,
  onSaveMonthlyPlan,
  onRecordSurplusAllocation,
  filteredTransactions,
  periodLabel,
  isPredictiveEnabled = true,
  onTogglePredictive,
}: MonthlyAnalysisTabProps) {
  const [auditPage, setAuditPage] = useState(1);

  const [targetPercent, setTargetPercent] = useState(monthlyPlan.targetSurplusPercent);
  const [targetCentsInput, setTargetCentsInput] = useState(
    (monthlyPlan.targetSurplusCents / 100).toFixed(2).replace('.', ',')
  );
  const [emergencyShare, setEmergencyShare] = useState(monthlyPlan.emergencySharePercent);
  const [investmentsShare, setInvestmentsShare] = useState(monthlyPlan.investmentsSharePercent);
  const [goalsShare, setGoalsShare] = useState(monthlyPlan.goalsSharePercent);
  const [planSavedFeedback, setPlanSavedFeedback] = useState<string | null>(null);
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);

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

  const predictive = calculatePredictiveInsights(transactions, activeMonth, planConfig);

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

  const parsedTargetCents = parseInputToCents(targetCentsInput);
  const effectiveTargetCents =
    parsedTargetCents > 0 ? parsedTargetCents : summary.targetSurplusCents;
  const isGoalEstablished = effectiveTargetCents > 0;
  const netSurplusCents = summary.netSurplusCents;

  const sliderCentsValue = Math.min(500000, Math.max(50000, effectiveTargetCents || 150000));

  const rawProgressPercent =
    effectiveTargetCents > 0
      ? Math.round((netSurplusCents / effectiveTargetCents) * 100)
      : netSurplusCents > 0
      ? 100
      : 0;
  const clampedBarPercent = Math.max(0, Math.min(100, rawProgressPercent));

  const isGoalMet = effectiveTargetCents > 0 && netSurplusCents >= effectiveTargetCents;
  const isDeficit = netSurplusCents < 0;
  const remainingCents = Math.max(0, effectiveTargetCents - netSurplusCents);
  const surplusExcessCents = Math.max(0, netSurplusCents - effectiveTargetCents);
  const deficitRecoveryGoalCents = isDeficit
    ? effectiveTargetCents + Math.abs(netSurplusCents)
    : remainingCents;

  const handleApplyPreset = (valueCents: number) => {
    const formatted = (valueCents / 100).toFixed(2).replace('.', ',');
    setTargetCentsInput(formatted);
    if (summary.totalIncomeCents > 0) {
      const pct = Math.min(
        95,
        Math.max(5, Math.round((valueCents / summary.totalIncomeCents) * 100))
      );
      setTargetPercent(pct);
    }
  };

  const handleTargetInputChange = (raw: string) => {
    setTargetCentsInput(raw);
    const parsed = parseInputToCents(raw);
    if (parsed > 0 && summary.totalIncomeCents > 0) {
      const pct = Math.min(95, Math.max(5, Math.round((parsed / summary.totalIncomeCents) * 100)));
      setTargetPercent(pct);
    }
  };

  const handlePercentInputChange = (newPct: number) => {
    const clampedPct = Math.min(95, Math.max(5, newPct));
    setTargetPercent(clampedPct);
    if (summary.totalIncomeCents > 0) {
      const calculatedCents = Math.round((summary.totalIncomeCents * clampedPct) / 100);
      setTargetCentsInput((calculatedCents / 100).toFixed(2).replace('.', ','));
    }
  };

  const handleSavePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPlanSavedFeedback(null);
    const parsed = parseInputToCents(targetCentsInput);
    await onSaveMonthlyPlan({
      monthKey: activeMonth,
      targetSurplusPercent: targetPercent,
      targetSurplusCents: parsed,
      emergencySharePercent: normEmergency,
      investmentsSharePercent: normInvestments,
      goalsSharePercent: normGoals,
    });
    setPlanSavedFeedback('Meta estabelecida e salva com sucesso!');
    setTimeout(() => {
      setPlanSavedFeedback(null);
    }, 4000);
  };

  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;
  const totalAuditPages = Math.max(1, Math.ceil(expenseBreakdown.length / AUDIT_PAGE_SIZE));
  const safeAuditPage = Math.min(auditPage, totalAuditPages);
  const paginatedAudit = expenseBreakdown.slice(
    (safeAuditPage - 1) * AUDIT_PAGE_SIZE,
    safeAuditPage * AUDIT_PAGE_SIZE
  );

  const overLimitCategoriesCount = expenseBreakdown.filter((c) => c.limitUsagePercent >= 100).length;
  const warningCategoriesCount = expenseBreakdown.filter(
    (c) => c.monthlyLimitCents > 0 && c.limitUsagePercent >= 70 && c.limitUsagePercent < 100
  ).length;
  const healthyCategoriesCount = expenseBreakdown.filter(
    (c) => c.monthlyLimitCents > 0 && c.limitUsagePercent < 70
  ).length;

  // Build 12-month compound projection series
  const monthlyContributionCents = Math.max(
    0,
    summary.freeUnallocatedSurplusCents > 0
      ? summary.freeUnallocatedSurplusCents
      : effectiveTargetCents
  );
  const compoundSeries = Array.from({ length: 12 }, (_, idx) => {
    const monthNum = idx + 1;
    const rate = 0.0085;
    let total = 0;
    for (let m = 0; m < monthNum; m++) {
      total = (total + monthlyContributionCents) * (1 + rate);
    }
    const principal = monthlyContributionCents * monthNum;
    const interest = Math.max(0, Math.round(total) - principal);
    return {
      monthNum,
      totalCents: Math.round(total),
      principalCents: principal,
      interestCents: interest,
    };
  });
  const maxCompoundCents = Math.max(100000, compoundSeries[11]?.totalCents ?? 100000);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* =====================================================================
          CARD DE CALL-TO-ACTION CLARO NO TOPO: DEFINIÇÃO DE METAS
          Destaque visual absoluto: o usuário sabe exatamente o que fazer primeiro
      ===================================================================== */}
      <section
        aria-label="Passo 1: Definição da Meta Mensal"
        className="bg-white dark:bg-[#111624] border-2 border-[#1860FC] dark:border-[#1860FC]/80 rounded-3xl p-5 sm:p-6 shadow-lg shadow-[#1860FC]/10 relative overflow-hidden"
      >
        {/* Glow suave e decorativo de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#1860FC]/15 via-[#D4F907]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Cabeçalho do Card CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="flex items-start sm:items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#1860FC] text-white flex items-center justify-center shadow-md shadow-[#1860FC]/30 shrink-0">
                <Target className="w-6 h-6 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#1860FC] text-white shadow-xs">
                    Passo 1 · Início Obrigatório
                  </span>
                  <h1 className="text-base sm:text-lg font-black font-display text-[#000000] dark:text-white">
                    Defina sua Meta de Economia para este Mês
                  </h1>
                  {isGoalEstablished && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#D4F907] text-[#000000] shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      Meta Ativa: {formatBrlCents(effectiveTargetCents)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Estabeleça quanto você quer economizar e transformar em sobra em{' '}
                  <strong className="text-[#1860FC] dark:text-[#D4F907]">
                    {periodLabel ?? monthLabel}
                  </strong>
                  . Ao definir sua meta, o termômetro de sobras, as 3 caixinhas e as simulações
                  serão liberados logo abaixo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {planSavedFeedback && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black text-[#000000] bg-[#D4F907] rounded-full shadow-sm">
                  <Check className="w-3.5 h-3.5" />
                  {planSavedFeedback}
                </span>
              )}
              {isGoalEstablished && (
                <button
                  type="button"
                  onClick={() => setIsEditorExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#242F48] bg-slate-50 dark:bg-[#181F32] text-slate-700 dark:text-slate-300 hover:border-[#1860FC] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907]" />
                  {isEditorExpanded ? 'Ocultar Ajustes' : 'Ajustar Meta'}
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo do Formulário de Meta (expandido ou retrátil) */}
          {isEditorExpanded && (
            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Bloco de Seleção de Valor (Botões Rápidos + Slider + Inputs) */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/80 dark:border-[#1E273C] space-y-3.5">
                {/* 1-Clique nos Valores Mais Escolhidos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Escolha Rápida em 1-Clique:
                    </span>
                    <span className="text-xs font-mono font-black text-[#1860FC] dark:text-[#D4F907]">
                      Valor Selecionado: {formatBrlCents(effectiveTargetCents)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {SAVINGS_PRESETS.map((preset) => {
                      const isSelected = parsedTargetCents === preset.cents;
                      return (
                        <button
                          key={preset.cents}
                          type="button"
                          onClick={() => handleApplyPreset(preset.cents)}
                          className={`py-2 px-2 text-xs sm:text-sm font-extrabold rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-xs ${
                            isSelected
                              ? 'bg-[#1860FC] text-white border-[#1860FC] shadow-md shadow-[#1860FC]/25 scale-102'
                              : 'bg-white dark:bg-[#111624] border-slate-200 dark:border-[#1E273C] text-slate-800 dark:text-slate-200 hover:border-[#1860FC] hover:text-[#1860FC]'
                          }`}
                        >
                          <span>{preset.label}</span>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase text-[#D4F907]">
                              ✓ Selecionada
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slider de R$ 500 a R$ 5.000 */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    <label htmlFor="goal-slider-brl" className="cursor-pointer">
                      Ou ajuste o controle contínuo (R$ 500 a R$ 5.000):
                    </label>
                    <span className="font-mono font-black text-[#000000] dark:text-white">
                      {formatBrlCents(effectiveTargetCents)}
                    </span>
                  </div>

                  <input
                    id="goal-slider-brl"
                    type="range"
                    min={50000}
                    max={500000}
                    step={10000}
                    value={sliderCentsValue}
                    onChange={(e) => handleApplyPreset(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#1860FC]"
                  />
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-1">
                    <span>R$ 500</span>
                    <span>R$ 1.500</span>
                    <span>R$ 2.500</span>
                    <span>R$ 3.500</span>
                    <span>R$ 5.000</span>
                  </div>
                </div>

                {/* Campos Manuais de Entrada Exata */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-slate-200/70 dark:border-[#1E273C]">
                  <div className="sm:col-span-7">
                    <label
                      htmlFor="goal-input-brl"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Digitar Valor Exato no Mês (R$)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-black text-[#1860FC] dark:text-[#D4F907] select-none">
                        R$
                      </span>
                      <input
                        id="goal-input-brl"
                        type="text"
                        value={targetCentsInput}
                        onChange={(e) => handleTargetInputChange(e.target.value)}
                        placeholder="Ex: 1.500,00"
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold tabular-nums bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1860FC] dark:focus:border-[#D4F907]"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-5">
                    <label
                      htmlFor="plan-target-pct"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Equivalente da Renda Mensal (%)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="plan-target-pct"
                        type="number"
                        min={5}
                        max={95}
                        value={targetPercent}
                        onChange={(e) => handlePercentInputChange(Number(e.target.value))}
                        className="w-full pl-3 pr-7 py-2 text-sm font-mono font-bold tabular-nums bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1860FC] dark:focus:border-[#D4F907]"
                      />
                      <span className="absolute right-3 text-xs font-bold text-slate-400 select-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco de Distribuição nas 3 Caixinhas (Reserva / Investimentos / Projetos) */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/80 dark:border-[#1E273C] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Como dividir sua sobra ao atingir a meta (100%):
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                    <span className="text-[#1860FC] dark:text-[#D4F907]">
                      Reserva: {normEmergency}%
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[#1860FC] dark:text-[#D4F907]">
                      Investir: {normInvestments}%
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[#1860FC] dark:text-[#D4F907]">
                      Projetos: {normGoals}%
                    </span>
                  </div>
                </div>

                {/* Barra segmentada */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                  <div
                    className="bg-[#1860FC] transition-all duration-300"
                    style={{ width: `${normEmergency}%` }}
                    title={`Reserva: ${normEmergency}%`}
                  />
                  <div
                    className="bg-[#3B82F6] transition-all duration-300"
                    style={{ width: `${normInvestments}%` }}
                    title={`Investimentos: ${normInvestments}%`}
                  />
                  <div
                    className="bg-[#D4F907] transition-all duration-300"
                    style={{ width: `${normGoals}%` }}
                    title={`Objetivos: ${normGoals}%`}
                  />
                </div>

                {/* Sliders das 3 caixinhas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C]">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <label htmlFor="slider-emergency">1. Reserva de Emergência</label>
                      <span className="font-mono text-[#1860FC] dark:text-[#D4F907]">
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
                      className="w-full accent-[#1860FC] cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                      Previsto: {formatBrlCents(simulation.emergencyCents)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C]">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <label htmlFor="slider-investments">2. Investimentos & Futuro</label>
                      <span className="font-mono text-[#1860FC] dark:text-[#D4F907]">
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
                      className="w-full accent-[#1860FC] cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                      Previsto: {formatBrlCents(simulation.investmentsCents)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C]">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <label htmlFor="slider-goals">3. Objetivos & Projetos</label>
                      <span className="font-mono text-[#1860FC] dark:text-[#D4F907]">
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
                      className="w-full accent-[#1860FC] cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                      Previsto: {formatBrlCents(simulation.goalsCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão Principal de Call-to-Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Ao salvar, todas as análises e simulações abaixo serão sincronizadas com esta meta.
                </span>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-black text-white bg-[#1860FC] hover:bg-[#0D48D9] rounded-full transition-all cursor-pointer shadow-lg shadow-[#1860FC]/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  Salvar e Estabelecer Meta ({formatBrlCents(effectiveTargetCents)})
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* =====================================================================
          BLOQUEIO CONDICIONAL / HIERÁRQUICO:
          Se a meta não foi estabelecida (valor <= 0), exibe um card explicativo.
          Se a meta foi estabelecida (> 0), libera os passos 2, 3 e 4.
      ===================================================================== */}
      {!isGoalEstablished ? (
        <section
          aria-label="Aviso de Meta Pendente"
          className="bg-white dark:bg-[#111624] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#000000] dark:text-white">
            Estabeleça sua Meta Acima para Desbloquear os Resultados e Simulações
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Assim que você definir quanto quer economizar no mês, o SobraMais exibirá seu termômetro
            em tempo real, a destinação nas 3 caixinhas e a projeção de 12 meses a juros compostos.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(150000)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-[#1860FC] text-white hover:bg-[#0D48D9] transition-colors cursor-pointer shadow-xs"
            >
              <Target className="w-3.5 h-3.5" />
              Aplicar Meta Sugerida de R$ 1.500,00
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* =====================================================================
              PASSO 2: RESUMOS E RESULTADOS DA META ESTABELECIDA
              Aparece hierarquicamente apenas após a meta estar estabelecida
          ===================================================================== */}
          <section
            aria-label="Passo 2: Resumos e Resultados da Meta"
            className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-4 shadow-xs space-y-3.5"
          >
            {/* Cabeçalho do Passo 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80 dark:border-[#1E273C]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Compass className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Passo 2 · Resultados
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold font-display text-[#000000] dark:text-white truncate">
                      Resumos e Desempenho da sua Meta ({periodLabel ?? monthLabel})
                    </h2>
                    {isGoalMet ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#D4F907] text-[#000000] shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        Meta Atingida!
                      </span>
                    ) : isDeficit ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3 h-3" />
                        Mês em Déficit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1860FC]/10 dark:bg-[#1860FC]/20 text-[#1860FC] dark:text-[#D4F907]">
                        <TrendingUp className="w-3 h-3" />
                        {rawProgressPercent}% Atingido
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Acompanhe o termômetro de sobras reais vs. sua meta estipulada
                  </p>
                </div>
              </div>
            </div>

            {/* Os 4 Cards de Resumo e Resultados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-bold truncate">Meta de Economia</span>
                  <span className="w-5 h-5 rounded-lg bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907] flex items-center justify-center shrink-0">
                    <Target className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono tabular-nums text-[#000000] dark:text-white truncate">
                  {formatBrlCents(effectiveTargetCents)}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {summary.totalIncomeCents > 0
                    ? `${Math.round((effectiveTargetCents / summary.totalIncomeCents) * 100)}% da renda do período`
                    : 'Objetivo planejado'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-bold truncate">Sobra Real Acumulada</span>
                  <span className="w-5 h-5 rounded-lg bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907] flex items-center justify-center shrink-0">
                    <Wallet className="w-3 h-3" />
                  </span>
                </div>
                <div
                  className={`text-base sm:text-lg font-black font-mono tabular-nums truncate ${
                    netSurplusCents >= 0
                      ? 'text-emerald-600 dark:text-[#D4F907]'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatBrlCents(netSurplusCents, true)}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Previsto: {formatBrlCents(summary.projectedNetSurplusCents, true)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-bold truncate">
                    {isGoalMet ? 'Superou a Meta' : 'Falta Atingir'}
                  </span>
                  <span className="w-5 h-5 rounded-lg bg-[#D4F907]/20 text-[#000000] dark:text-[#D4F907] flex items-center justify-center shrink-0">
                    <PiggyBank className="w-3 h-3" />
                  </span>
                </div>
                <div
                  className={`text-base sm:text-lg font-black font-mono tabular-nums truncate ${
                    isGoalMet
                      ? 'text-emerald-600 dark:text-[#D4F907]'
                      : isDeficit
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#1860FC] dark:text-[#D4F907]'
                  }`}
                >
                  {isGoalMet
                    ? `+ ${formatBrlCents(surplusExcessCents)}`
                    : formatBrlCents(deficitRecoveryGoalCents)}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {isGoalMet
                    ? 'Meta batida com folga!'
                    : isDeficit
                    ? 'Cobrir déficit + meta'
                    : 'Restante a economizar'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] flex flex-col justify-between min-w-0">
                <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span className="font-bold truncate">Progresso Atingido</span>
                  <span className="w-5 h-5 rounded-lg bg-[#1860FC]/15 text-[#1860FC] dark:text-[#D4F907] flex items-center justify-center shrink-0">
                    <Percent className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono tabular-nums text-[#000000] dark:text-white truncate">
                  {rawProgressPercent}%
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Retenção: {summary.surplusRatePercent}% da renda
                </p>
              </div>
            </div>

            {/* Termômetro Visual & Régua de Progresso */}
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/80 dark:border-[#1E273C] space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Termômetro de Sobras vs. Meta
                  </span>
                  <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#000000] dark:text-white">
                    {formatBrlCents(Math.max(0, netSurplusCents))}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      de {formatBrlCents(effectiveTargetCents)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    {isGoalMet ? 'Superou a Meta' : 'Quanto Falta'}
                  </span>
                  <span
                    className={`text-sm sm:text-base font-extrabold font-mono tabular-nums ${
                      isGoalMet
                        ? 'text-emerald-600 dark:text-[#D4F907]'
                        : isDeficit
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[#1860FC] dark:text-[#D4F907]'
                    }`}
                  >
                    {isGoalMet
                      ? `+ ${formatBrlCents(surplusExcessCents)}`
                      : formatBrlCents(deficitRecoveryGoalCents)}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="relative pt-1">
                <div className="w-full h-7 bg-slate-200/70 dark:bg-[#181F32] rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-[#1E273C] shadow-inner flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2.5 text-[11px] font-extrabold font-mono ${
                      isGoalMet
                        ? 'bg-[#D4F907] text-[#000000]'
                        : isDeficit
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#1860FC] text-white'
                    }`}
                    style={{ width: `${clampedBarPercent}%` }}
                  >
                    {clampedBarPercent >= 14 && (
                      <span className="drop-shadow-xs truncate">{rawProgressPercent}%</span>
                    )}
                  </div>
                </div>

                {/* Régua de Progresso */}
                <div className="flex justify-between items-center px-1 mt-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    100% ({formatBrlCents(effectiveTargetCents)})
                  </span>
                </div>
              </div>

              {/* Composição do Saldo */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/70 dark:border-[#1E273C]">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C]">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                    Entradas Totais
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-[#D4F907] truncate block mt-0.5">
                    {formatBrlCents(summary.totalIncomeCents)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C]">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                    Saídas Totais
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 truncate block mt-0.5">
                    {formatBrlCents(summary.totalExpenseCents)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C]">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                    Já Alocado
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#1860FC] dark:text-[#D4F907] truncate block mt-0.5">
                    {formatBrlCents(summary.surplusAssignedCents)}
                  </span>
                </div>
              </div>

              {/* Diagnóstico da Meta */}
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  isGoalMet
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                    : isDeficit
                    ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                    : 'bg-white dark:bg-[#111624] border-slate-200/80 dark:border-[#1E273C] text-slate-800 dark:text-slate-200'
                }`}
              >
                {isGoalMet ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#D4F907] shrink-0 mt-0.5" />
                ) : isDeficit ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Target className="w-4 h-4 text-[#1860FC] dark:text-[#D4F907] shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  {isGoalMet ? (
                    <span>
                      <strong>Parabéns! Meta atingida.</strong> Suas sobras reais somam{' '}
                      <strong className="font-mono">{formatBrlCents(netSurplusCents)}</strong>,
                      superando sua meta em{' '}
                      <strong className="font-mono">+{formatBrlCents(surplusExcessCents)}</strong>.
                    </span>
                  ) : isDeficit ? (
                    <span>
                      <strong>Atenção ao déficit:</strong> Suas saídas superaram as entradas em{' '}
                      <strong className="font-mono">
                        {formatBrlCents(Math.abs(netSurplusCents))}
                      </strong>
                      . Faltam{' '}
                      <strong className="font-mono">
                        {formatBrlCents(deficitRecoveryGoalCents)}
                      </strong>{' '}
                      para cobrir o mês e atingir a meta.
                    </span>
                  ) : (
                    <span>
                      <strong>Em andamento:</strong> Sobras acumuladas de{' '}
                      <strong className="font-mono">{formatBrlCents(netSurplusCents)}</strong> (
                      {rawProgressPercent}% da meta). Faltam exatamente{' '}
                      <strong className="font-mono">{formatBrlCents(remainingCents)}</strong> para
                      atingir a meta mensal de{' '}
                      <strong className="font-mono">{formatBrlCents(effectiveTargetCents)}</strong>.
                    </span>
                  )}
                </div>
              </div>

              {/* Inteligência Preditiva integrada ao Planejador (se ativa) */}
              {isPredictiveEnabled && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#111624] border border-[#1860FC]/30 dark:border-[#1860FC]/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
                      <span className="text-xs font-extrabold text-[#000000] dark:text-white">
                        Inteligência Preditiva · Safe-to-Spend & Fechamento
                      </span>
                    </div>
                    {onTogglePredictive && (
                      <button
                        type="button"
                        onClick={() => onTogglePredictive(false)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        Ocultar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/60 dark:border-[#1E273C]">
                      {predictive.isAboveOrAtTarget ? (
                        <span>
                          Para garantir sua meta de{' '}
                          <strong className="font-mono">{formatBrlCents(effectiveTargetCents)}</strong>,
                          você pode gastar até{' '}
                          <strong className="font-mono text-emerald-600 dark:text-[#D4F907]">
                            {formatBrlCents(predictive.safeDailySpendCents)}/dia
                          </strong>{' '}
                          nos próximos <strong>{predictive.remainingDays} dias</strong>.
                        </span>
                      ) : (
                        <span>
                          Economize ou gere renda extra de{' '}
                          <strong className="font-mono text-[#1860FC] dark:text-[#D4F907]">
                            {formatBrlCents(predictive.dailyRecoveryNeededCents)}/dia
                          </strong>{' '}
                          nos próximos <strong>{predictive.remainingDays} dias</strong> para recuperar a meta.
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/60 dark:border-[#1E273C]">
                      <span>
                        No ritmo atual, sua sobra estimada no fim do mês será de{' '}
                        <strong className="font-mono text-[#000000] dark:text-white">
                          {formatBrlCents(predictive.estimatedClosingSurplusCents, true)}
                        </strong>{' '}
                        ({predictive.isForecastAboveTarget ? 'Acima' : 'Abaixo'} da sua meta).
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================================
              PASSO 3: DESTINAÇÃO INTELIGENTE NAS CAIXINHAS & SIMULADOR FUTURO (12 MESES)
          ===================================================================== */}
          <section
            aria-label="Passo 3: Destinação nas Caixinhas e Simulação Futura"
            className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-4 space-y-3.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-[#1E273C]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[#1860FC] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Layers className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Passo 3 · Destinação
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold font-display text-[#000000] dark:text-white truncate">
                      Destinação Inteligente nas 3 Caixinhas ({periodLabel ?? monthLabel})
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Aloque rapidamente sua Sobra Livre não alocada (
                    {formatBrlCents(summary.freeUnallocatedSurplusCents)})
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#1860FC] dark:text-[#D4F907]">
                Ação rápida em 1-clique
              </span>
            </div>

            {/* Os 3 Cards das Caixinhas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* 1. Reserva de Emergência */}
              <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] rounded-2xl flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-bold text-[#000000] dark:text-white truncate">
                      1. Reserva de Emergência ({normEmergency}%)
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#D4F907] text-[#000000] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#000000] dark:text-white truncate">
                    {formatBrlCents(simulation.emergencyCents)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Liquidez diária imediata (CDB 100% CDI / Tesouro Selic)
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
                  className="mt-3 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Alocar na Reserva
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 2. Investimentos & Futuro */}
              <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] rounded-2xl flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-bold text-[#000000] dark:text-white truncate">
                      2. Investimentos & Futuro ({normInvestments}%)
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#1860FC] text-white flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#000000] dark:text-white truncate">
                    {formatBrlCents(simulation.investmentsCents)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Multiplicação patrimonial (IPCA+, FIIs, Ações e ETFs)
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
                  className="mt-3 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Alocar em Investimentos
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 3. Objetivos & Projetos */}
              <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#181F32] border border-slate-200/70 dark:border-[#1E273C] rounded-2xl flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-bold text-[#000000] dark:text-white truncate">
                      3. Objetivos & Projetos ({normGoals}%)
                    </span>
                    <span className="w-6 h-6 rounded-full bg-[#D4F907] text-[#000000] flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-base xl:text-lg font-extrabold font-mono tabular-nums text-[#000000] dark:text-white truncate">
                    {formatBrlCents(simulation.goalsCents)}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Viagens, estudos, reformas ou compras planejadas à vista
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
                  className="mt-3 w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 text-[11px] font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Alocar em Objetivos
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Simulador Futuro: Card + Gráfico de Projeção de 12 Meses a Juros Compostos */}
            <div className="p-4 bg-gradient-to-br from-[#1860FC] to-[#0D48D9] text-white rounded-2xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-white/20 text-[#D4F907] flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4 h-4 text-[#D4F907]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-extrabold font-display text-white truncate">
                      Simulação Futura · Projeção de 12 Meses a Juros Compostos
                    </h3>
                    <p className="text-[11px] text-blue-100 truncate">
                      Aportes mensais de {formatBrlCents(monthlyContributionCents)} rendendo 0,85% a.m.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase tracking-wider text-blue-100 block">
                    Patrimônio Projetado (12M)
                  </span>
                  <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-[#D4F907]">
                    {formatBrlCents(
                      simulation.projected12MonthsCents > 0
                        ? simulation.projected12MonthsCents
                        : compoundSeries[11]?.totalCents ?? 0
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico de Barras da Evolução de 12 Meses */}
              <div className="pt-2">
                <div className="grid grid-cols-12 gap-1.5 items-end h-24 px-1">
                  {compoundSeries.map((pt) => {
                    const heightPct = Math.max(12, Math.round((pt.totalCents / maxCompoundCents) * 100));
                    return (
                      <div
                        key={pt.monthNum}
                        className="flex flex-col items-center justify-end h-full group"
                        title={`Mês ${pt.monthNum}: ${formatBrlCents(pt.totalCents)} (Juros: +${formatBrlCents(pt.interestCents)})`}
                      >
                        <div
                          className="w-full rounded-t-md bg-[#D4F907] group-hover:bg-white transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[9px] font-mono text-blue-100 mt-1">
                          M{pt.monthNum}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================================
              PASSO 4: CONTROLE DE ORÇAMENTO & TABELA DE AUDITORIA DE TETOS
              (Verde < 70%, Amarelo 70-99%, Vermelho >= 100%)
          ===================================================================== */}
          <section
            aria-label="Passo 4: Controle de Orçamento e Auditoria de Tetos por Categoria"
            className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-4 space-y-3 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-[#1E273C]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Passo 4 · Auditoria
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold font-display text-[#000000] dark:text-white truncate">
                    Controle de Orçamento · Auditoria de Tetos por Categoria
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Realizado vs. Teto Planejado com semáforo visual de consumo
                </p>
              </div>

              {/* Legenda de Cores solicitada: Verde < 70%, Amarelo 70-99%, Vermelho >= 100% */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Verde &lt; 70% ({healthyCategoriesCount})
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Amarelo 70–99% ({warningCategoriesCount})
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  Vermelho &ge; 100% ({overLimitCategoriesCount})
                </span>
              </div>
            </div>

            <div className="border border-slate-200/80 dark:border-[#1E273C] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#1E273C] bg-[#F8FAFC]/70 dark:bg-[#000000] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-4">Categoria</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Natureza</th>
                      <th className="py-2.5 px-3 text-right">Realizado</th>
                      <th className="py-2.5 px-3 text-right hidden md:table-cell">Teto Planejado</th>
                      <th className="py-2.5 px-3 text-right">Margem / Excesso</th>
                      <th className="py-2.5 px-4 w-48">Status do Teto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-[#1E273C] text-xs">
                    {paginatedAudit.map((item) => {
                      const diffCents = item.monthlyLimitCents - item.spentCents;
                      const pct = item.limitUsagePercent;
                      const isRed = item.monthlyLimitCents > 0 && pct >= 100;
                      const isYellow = item.monthlyLimitCents > 0 && pct >= 70 && pct < 100;

                      const barColorClass = isRed
                        ? 'bg-rose-600'
                        : isYellow
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';

                      const badgeColorClass = isRed
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : isYellow
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';

                      return (
                        <tr
                          key={item.categoryId}
                          className="hover:bg-[#F8FAFC]/60 dark:hover:bg-[#181F32]/60 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-bold text-[#000000] dark:text-white">
                            {item.categoryName}
                            <span className="text-[11px] text-slate-400 font-normal ml-1">
                              ({item.transactionCount})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                            {item.nature === 'fixed' ? 'Fixo' : 'Variável'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#000000] dark:text-white">
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
                                ? 'text-emerald-600 dark:text-[#D4F907]'
                                : 'text-rose-600 dark:text-rose-400'
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
                                <div className="flex-1 h-2 bg-slate-200/80 dark:bg-[#181F32] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${barColorClass}`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span
                                  className={`font-mono tabular-nums text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[42px] text-center ${badgeColorClass}`}
                                >
                                  {pct}%
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

              <div className="px-4 py-2 bg-[#F8FAFC]/60 dark:bg-[#000000] border-t border-slate-200 dark:border-[#1E273C] flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">
                  Pág. <strong className="text-[#000000] dark:text-white">{safeAuditPage}</strong>/
                  {totalAuditPages} ({expenseBreakdown.length} categorias auditadas)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeAuditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#000000] dark:text-white disabled:opacity-40 hover:border-[#1860FC] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Ant.
                  </button>
                  <button
                    type="button"
                    disabled={safeAuditPage >= totalAuditPages}
                    onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 font-bold rounded-full bg-white dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] text-[#000000] dark:text-white disabled:opacity-40 hover:border-[#1860FC] transition-colors cursor-pointer"
                  >
                    Próx.
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
