import React, { useState } from 'react';
import {
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Filter,
  RotateCcw,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  type CustomFilterCriteria,
  type FinancialCategory,
  type MonthlyFinancialSummary,
} from '../utils/financeLogic';
import { AVAILABLE_MONTHS, NATURE_LABELS } from '../utils/seedData';

interface PageFilterBarProps {
  criteria: CustomFilterCriteria;
  onChangeCriteria: (criteria: CustomFilterCriteria) => void;
  categories: FinancialCategory[];
  summary: MonthlyFinancialSummary;
  totalFilteredCount: number;
}

export function PageFilterBar({
  criteria,
  onChangeCriteria,
  categories,
  summary,
  totalFilteredCount,
}: PageFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Local draft state while tweaking in expanded panel
  const [localStartDate, setLocalStartDate] = useState(criteria.startDate ?? '');
  const [localEndDate, setLocalEndDate] = useState(criteria.endDate ?? '');
  const [localDirection, setLocalDirection] = useState<'all' | 'income' | 'expense'>(criteria.direction);
  const [localNature, setLocalNature] = useState<string>(criteria.nature);
  const [localCategoryId, setLocalCategoryId] = useState<string>(criteria.categoryId);
  const [localMinVal, setLocalMinVal] = useState<string>(
    criteria.minAmountCents ? (criteria.minAmountCents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [localMaxVal, setLocalMaxVal] = useState<string>(
    criteria.maxAmountCents ? (criteria.maxAmountCents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [localSearch, setLocalSearch] = useState<string>(criteria.searchQuery ?? '');

  React.useEffect(() => {
    setLocalSearch(criteria.searchQuery ?? '');
  }, [criteria.searchQuery]);

  // Calculate active custom filters count (ignoring base month)
  const isCustomActive =
    criteria.periodMode === 'range' ||
    criteria.direction !== 'all' ||
    criteria.nature !== 'all' ||
    criteria.categoryId !== 'all' ||
    (criteria.minAmountCents !== undefined && criteria.minAmountCents > 0) ||
    (criteria.maxAmountCents !== undefined && criteria.maxAmountCents > 0) ||
    Boolean(criteria.searchQuery && criteria.searchQuery.trim().length > 0);

  const activeFiltersCount = [
    criteria.periodMode === 'range',
    criteria.direction !== 'all',
    criteria.nature !== 'all',
    criteria.categoryId !== 'all',
    Boolean(criteria.minAmountCents && criteria.minAmountCents > 0),
    Boolean(criteria.maxAmountCents && criteria.maxAmountCents > 0),
    Boolean(criteria.searchQuery && criteria.searchQuery.trim().length > 0),
  ].filter(Boolean).length;

  const handleSelectMonth = (monthKey: string) => {
    onChangeCriteria({
      ...criteria,
      periodMode: 'month',
      monthKey,
      startDate: '',
      endDate: '',
    });
    setLocalStartDate('');
    setLocalEndDate('');
  };

  const handleSelectAllMonths = () => {
    onChangeCriteria({
      ...criteria,
      periodMode: 'month',
      monthKey: 'all',
      startDate: '',
      endDate: '',
    });
    setLocalStartDate('');
    setLocalEndDate('');
  };

  const handleApplyCustomFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const minCents = parseInputToCents(localMinVal);
    const maxCents = parseInputToCents(localMaxVal);

    const hasDateRange = Boolean(localStartDate && localEndDate);

    onChangeCriteria({
      ...criteria,
      periodMode: hasDateRange ? 'range' : criteria.periodMode,
      startDate: localStartDate,
      endDate: localEndDate,
      direction: localDirection,
      nature: localNature as any,
      categoryId: localCategoryId,
      minAmountCents: minCents > 0 ? minCents : undefined,
      maxAmountCents: maxCents > 0 ? maxCents : undefined,
      searchQuery: localSearch.trim(),
    });
    setIsExpanded(false);
  };

  const handleResetToDefault = () => {
    const defaultState: CustomFilterCriteria = {
      periodMode: 'month',
      monthKey: '2026-11',
      startDate: '',
      endDate: '',
      direction: 'all',
      nature: 'all',
      categoryId: 'all',
      minAmountCents: undefined,
      maxAmountCents: undefined,
      searchQuery: '',
    };
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalDirection('all');
    setLocalNature('all');
    setLocalCategoryId('all');
    setLocalMinVal('');
    setLocalMaxVal('');
    setLocalSearch('');
    onChangeCriteria(defaultState);
    setIsExpanded(false);
  };

  const setPresetDateRange = (start: string, end: string) => {
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  // Compute label for current active period
  let activePeriodText = 'Novembro 2026';
  if (criteria.periodMode === 'range' && criteria.startDate && criteria.endDate) {
    const [sy, sm, sd] = criteria.startDate.split('-');
    const [ey, em, ed] = criteria.endDate.split('-');
    activePeriodText = `${sd}/${sm}/${sy} a ${ed}/${em}/${ey}`;
  } else if (criteria.periodMode === 'month') {
    if (criteria.monthKey === 'all') {
      activePeriodText = 'Todo o Histórico (Todos os Meses)';
    } else {
      const match = AVAILABLE_MONTHS.find((m) => m.key === criteria.monthKey);
      activePeriodText = match ? match.label : criteria.monthKey;
    }
  }

  const selectedCategoryName =
    criteria.categoryId !== 'all'
      ? categories.find((c) => c.id === criteria.categoryId)?.name ?? 'Categoria'
      : null;

  return (
    <section
      aria-label="Filtro de Período e Filtro Personalizado"
      className="bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl p-3 sm:p-3.5 mb-3 shadow-xs transition-all"
    >
      {/* Top Main Bar: Current Period, Month Shortcuts & Custom Filter Trigger */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Active period context & quick month tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200/80 dark:border-[#242F48] shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#1456FF] dark:text-[#E2FF1A]" />
            <span className="text-xs font-bold text-[#0A0E17] dark:text-white">
              {activePeriodText}
            </span>
          </div>

          {/* Quick Month Selectors */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F4F6FB] dark:bg-[#181F32] rounded-xl overflow-x-auto max-w-full">
            {AVAILABLE_MONTHS.map((m) => {
              const isSelected = criteria.periodMode === 'month' && criteria.monthKey === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => handleSelectMonth(m.key)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#1456FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#0A0E17] dark:hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">{m.shortLabel}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleSelectAllMonths}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                criteria.periodMode === 'month' && criteria.monthKey === 'all'
                  ? 'bg-[#1456FF] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0A0E17] dark:hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Right: Live mini metrics and Custom Filter Toggle Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 pr-1">
            <span>
              <strong className="text-[#0A0E17] dark:text-white font-bold">{totalFilteredCount}</strong>{' '}
              {totalFilteredCount === 1 ? 'item' : 'itens'}
            </span>
            <span>·</span>
            <span>
              Sobra:{' '}
              <strong
                className={`font-mono font-bold ${
                  summary.netSurplusCents >= 0
                    ? 'text-[#1456FF] dark:text-[#E2FF1A]'
                    : 'text-red-500'
                }`}
              >
                {formatBrlCents(summary.netSurplusCents, true)}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
              isCustomActive
                ? 'bg-[#1456FF] text-white border-[#1456FF] shadow-xs'
                : isExpanded
                ? 'bg-[#F4F6FB] dark:bg-[#181F32] border-[#1456FF] text-[#1456FF] dark:text-[#E2FF1A]'
                : 'bg-white dark:bg-[#181F32] border-slate-200 dark:border-[#242F48] text-slate-700 dark:text-slate-300 hover:border-[#1456FF]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtro Personalizado</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#E2FF1A] text-[#0A0E17] text-[10px] font-extrabold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Tags Strip (Shown when any custom filter is active) */}
      {isCustomActive && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-[#1E273C] flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Filtros Ativos:
          </span>

          {criteria.periodMode === 'range' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1456FF] dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-medium">
              Data: {activePeriodText}
              <button
                type="button"
                onClick={() =>
                  onChangeCriteria({
                    ...criteria,
                    periodMode: 'month',
                    monthKey: '2026-11',
                    startDate: '',
                    endDate: '',
                  })
                }
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.direction !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E273C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">
              Direção: {criteria.direction === 'income' ? 'Entradas (+)' : 'Saídas (-)'}
              <button
                type="button"
                onClick={() => onChangeCriteria({ ...criteria, direction: 'all' })}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.nature !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E273C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">
              {NATURE_LABELS[criteria.nature] ?? criteria.nature}
              <button
                type="button"
                onClick={() => onChangeCriteria({ ...criteria, nature: 'all' })}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedCategoryName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E273C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">
              Cat: {selectedCategoryName}
              <button
                type="button"
                onClick={() => onChangeCriteria({ ...criteria, categoryId: 'all' })}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.minAmountCents !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E273C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">
              Mín: {formatBrlCents(criteria.minAmountCents)}
              <button
                type="button"
                onClick={() => onChangeCriteria({ ...criteria, minAmountCents: undefined })}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.maxAmountCents !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E273C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">
              Máx: {formatBrlCents(criteria.maxAmountCents)}
              <button
                type="button"
                onClick={() => onChangeCriteria({ ...criteria, maxAmountCents: undefined })}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E273C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium">
              Busca: "{criteria.searchQuery}"
              <button
                type="button"
                onClick={() => onChangeCriteria({ ...criteria, searchQuery: '' })}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] font-bold text-[#1456FF] dark:text-[#E2FF1A] hover:underline ml-1"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Expanded Custom Filter Panel */}
      {isExpanded && (
        <form
          onSubmit={handleApplyCustomFilter}
          className="mt-3 pt-3 border-t border-slate-200/80 dark:border-[#1E273C] space-y-3.5 animate-in fade-in duration-150"
        >
          {/* Header of expanded filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#1456FF] dark:text-[#E2FF1A]" />
              <h3 className="text-xs font-bold text-[#0A0E17] dark:text-white uppercase tracking-wider">
                Configurar Filtro Personalizado
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Padrão
            </button>
          </div>

          {/* Grid of Custom Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Control 1: Custom Date Range */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Período Personalizado (De / Até)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
                  placeholder="Data Início"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
                  placeholder="Data Fim"
                />
              </div>
              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-slate-400">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => setPresetDateRange('2026-11-01', '2026-11-30')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] hover:border-[#1456FF]"
                >
                  Este Mês (Nov)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange('2026-10-01', '2026-10-31')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] hover:border-[#1456FF]"
                >
                  Mês Passado (Out)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange('2026-10-10', '2026-11-09')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] hover:border-[#1456FF]"
                >
                  Últimos 30 Dias
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateRange('2026-01-01', '2026-12-31')}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] hover:border-[#1456FF]"
                >
                  Ano 2026
                </button>
              </div>
            </div>

            {/* Control 2: Direction (Entradas / Saídas / Todas) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Direção do Fluxo
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#F4F6FB] dark:bg-[#181F32] p-1 rounded-xl border border-slate-200 dark:border-[#242F48]">
                <button
                  type="button"
                  onClick={() => setLocalDirection('all')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    localDirection === 'all'
                      ? 'bg-[#1456FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setLocalDirection('income')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    localDirection === 'income'
                      ? 'bg-[#E2FF1A] text-[#0A0E17] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setLocalDirection('expense')}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    localDirection === 'expense'
                      ? 'bg-[#1456FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  - Saída
                </button>
              </div>
            </div>

            {/* Control 3: Nature */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Natureza do Gasto / Entrada
              </label>
              <select
                value={localNature}
                onChange={(e) => setLocalNature(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
              >
                <option value="all">Todas as Naturezas</option>
                <option value="fixed">Gasto Fixo Essencial</option>
                <option value="variable">Gasto Variável / Estilo de Vida</option>
                <option value="surplus_allocation">Alocação de Sobra / Reserva</option>
                <option value="income_recurring">Entrada Fixa Recorrente</option>
                <option value="income_extra">Entrada Variável / Extra</option>
              </select>
            </div>

            {/* Control 4: Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Categoria Específica
              </label>
              <select
                value={localCategoryId}
                onChange={(e) => setLocalCategoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
              >
                <option value="all">Todas as Categorias ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'income' ? '[+] ' : '[-] '}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Control 5: Min & Max Amount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Faixa de Valor (R$)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={localMinVal}
                  onChange={(e) => setLocalMinVal(e.target.value)}
                  placeholder="Mín: 0,00"
                  className="w-1/2 px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
                />
                <span className="text-xs text-slate-400">-</span>
                <input
                  type="text"
                  value={localMaxVal}
                  onChange={(e) => setLocalMaxVal(e.target.value)}
                  placeholder="Máx: 0,00"
                  className="w-1/2 px-2.5 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
                />
              </div>
            </div>

            {/* Control 6: Search Term */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                Palavra-chave / Descrição
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Ex: Supermercado, Aluguel, Combustível, Salário..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F4F6FB] dark:bg-[#181F32] border border-slate-200 dark:border-[#242F48] rounded-xl text-[#0A0E17] dark:text-white focus:outline-none focus:border-[#1456FF]"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-[#1E273C]">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0A0E17] dark:hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-white bg-[#1456FF] rounded-xl hover:bg-[#0D44D9] transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#E2FF1A]" />
              Aplicar Filtro Personalizado
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
