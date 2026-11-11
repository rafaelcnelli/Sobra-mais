import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Zap,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Sparkles,
  Clock,
  Repeat,
} from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  validateTransactionInput,
  getTransactionStatus,
  isTransactionRecurring,
  type FinancialCategory,
  type FinancialTransaction,
  type TransactionType,
  type ExpenseNature,
  type TransactionStatus,
} from '../utils/financeLogic';
import { NATURE_LABELS, AVAILABLE_MONTHS } from '../utils/seedData';

export type QuickAddModalTab = 'quick' | 'detailed';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: Omit<FinancialTransaction, 'id' | 'uid'>, existingId?: string) => Promise<void>;
  onQuickLaunchPreset?: (preset: FinancialCategory) => Promise<void>;
  onNavigateToSettings?: () => void;
  categories: FinancialCategory[];
  activeMonth: string;
  initialTransaction?: FinancialTransaction | null;
  defaultType?: TransactionType;
  initialModalTab?: QuickAddModalTab;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  onQuickLaunchPreset,
  onNavigateToSettings,
  categories,
  activeMonth,
  initialTransaction,
  defaultType = 'expense',
  initialModalTab = 'quick',
}: TransactionModalProps) {
  const [modalTab, setModalTab] = useState<QuickAddModalTab>(initialModalTab);
  const [presetFilter, setPresetFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [launchingPresetId, setLaunchingPresetId] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('variable');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [dateIso, setDateIso] = useState(`${activeMonth}-09`);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);
  const standardPresets = categories
    .filter((c) => c.isStandardPreset)
    .filter((c) => (presetFilter === 'all' ? true : c.type === presetFilter));

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setLaunchingPresetId(null);

    if (initialTransaction) {
      setModalTab('detailed');
      setType(initialTransaction.type);
      setDescription(initialTransaction.description);
      setAmountInput((initialTransaction.amountCents / 100).toFixed(2).replace('.', ','));
      setCategoryId(initialTransaction.categoryId);
      setExpenseNature(initialTransaction.expenseNature);
      setStatus(getTransactionStatus(initialTransaction));
      setIsRecurring(isTransactionRecurring(initialTransaction));
      setDateIso(initialTransaction.dateIso);
      setNotes(initialTransaction.notes);
    } else {
      setModalTab(initialModalTab);
      const targetType = defaultType;
      setType(targetType);
      const matchingCats = categories.filter((c) => c.type === targetType);
      const firstCat = matchingCats[0];
      const defaultNature =
        firstCat?.nature ?? (targetType === 'income' ? 'income_recurring' : 'variable');
      setCategoryId(firstCat?.id ?? '');
      setExpenseNature(defaultNature);
      setStatus('completed');
      setIsRecurring(defaultNature === 'fixed' || defaultNature === 'income_recurring');
      setDescription('');
      setAmountInput('');
      setDateIso(`${activeMonth}-09`);
      setNotes('');
    }
  }, [isOpen, initialTransaction, defaultType, initialModalTab, activeMonth, categories]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matching = categories.filter((c) => c.type === newType);
    const first = matching[0];
    if (first) {
      setCategoryId(first.id);
      setExpenseNature(first.nature);
      setIsRecurring(first.nature === 'fixed' || first.nature === 'income_recurring');
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const found = categories.find((c) => c.id === newCatId);
    if (found) {
      setExpenseNature(found.nature);
      setIsRecurring(found.nature === 'fixed' || found.nature === 'income_recurring');
      if (!description.trim() && found.isStandardPreset) {
        setDescription(found.name);
      }
      if (!amountInput.trim() && found.defaultAmountCents > 0) {
        setAmountInput((found.defaultAmountCents / 100).toFixed(2).replace('.', ','));
      }
    }
  };

  const handleTriggerPreset = async (preset: FinancialCategory) => {
    setLaunchingPresetId(preset.id);
    try {
      if (onQuickLaunchPreset) {
        await onQuickLaunchPreset(preset);
      } else {
        const amountCents = preset.defaultAmountCents > 0 ? preset.defaultAmountCents : 5000;
        await onSave({
          description: preset.name,
          amountCents,
          type: preset.type,
          categoryId: preset.id,
          categoryName: preset.name,
          expenseNature: preset.nature,
          dateIso: `${activeMonth}-09`,
          monthKey: activeMonth,
          isStandardTemplate: true,
          status: 'completed',
          isRecurring: preset.nature === 'fixed' || preset.nature === 'income_recurring',
          notes: 'Lançamento rápido via 1-Clique',
        });
      }
    } finally {
      window.setTimeout(() => {
        setLaunchingPresetId(null);
      }, 450);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountCents = parseInputToCents(amountInput);
    const selectedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategory?.name ?? 'Geral';

    const validation = validateTransactionInput({
      description,
      amountCents,
      type,
      categoryId,
      categoryName,
      expenseNature,
      dateIso,
      notes,
    });

    if (!validation.valid) {
      setError(validation.error ?? 'Dados inválidos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          description: description.trim(),
          amountCents,
          type,
          categoryId,
          categoryName,
          expenseNature,
          dateIso,
          monthKey: validation.monthKey,
          isStandardTemplate: Boolean(selectedCategory?.isStandardPreset),
          status,
          isRecurring,
          notes: notes.trim(),
        },
        initialTransaction?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthLabel = AVAILABLE_MONTHS.find((m) => m.key === activeMonth)?.label ?? activeMonth;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-transaction-title"
    >
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#111624] border-t sm:border border-slate-200 dark:border-[#1E273C] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#1860FC] to-[#0D48D9] text-white">
          <div className="min-w-0">
            <h2
              id="modal-transaction-title"
              className="text-sm sm:text-base font-extrabold font-display tracking-tight truncate"
            >
              {initialTransaction
                ? 'Editar Lançamento Financeiro'
                : 'Central de Lançamento Rápido'}
            </h2>
            <p className="text-[11px] text-blue-100 truncate">
              {initialTransaction
                ? 'Atualize os dados da transação selecionada'
                : `Competência ativa: ${monthLabel} · Atualização de sobra em tempo real`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de lançamento"
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Tab Switcher (Hidden when editing a specific transaction) */}
        {!initialTransaction && (
          <div className="shrink-0 px-4 pt-3 pb-2 bg-[#F8FAFC] dark:bg-[#000000] border-b border-slate-200/80 dark:border-[#1E273C]">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-[#1E273C] rounded-2xl">
              <button
                type="button"
                onClick={() => setModalTab('quick')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  modalTab === 'quick'
                    ? 'bg-[#D4F907] text-[#000000] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#000000] dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>⚡ 1-Clique ({categories.filter((c) => c.isStandardPreset).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('detailed')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  modalTab === 'detailed'
                    ? 'bg-[#1860FC] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#000000] dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>📝 Lançamento Detalhado</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: ⚡ 1-CLIQUE (PADRÃO AO ABRIR) */}
        {modalTab === 'quick' && !initialTransaction ? (
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
            {/* Filter strip & hint */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/70 dark:border-[#1E273C] rounded-full">
                <button
                  type="button"
                  onClick={() => setPresetFilter('all')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                    presetFilter === 'all'
                      ? 'bg-[#1860FC] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setPresetFilter('expense')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                    presetFilter === 'expense'
                      ? 'bg-[#1860FC] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Saídas
                </button>
                <button
                  type="button"
                  onClick={() => setPresetFilter('income')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                    presetFilter === 'income'
                      ? 'bg-[#D4F907] text-[#000000]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Entradas
                </button>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Toque em um atalho para registrar imediatamente
              </span>
            </div>

            {standardPresets.length === 0 ? (
              <div className="py-8 text-center bg-[#F8FAFC] dark:bg-[#181F32] rounded-2xl border border-slate-200/70 dark:border-[#1E273C] p-4">
                <p className="text-xs font-bold text-[#000000] dark:text-white mb-1">
                  Nenhum atalho de 1-Clique ativo para este filtro.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Ative o ícone de raio (⚡) nas suas categorias em Ajustes & Categorias.
                </p>
                {onNavigateToSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToSettings();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Configurar Atalhos ⚡
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {standardPresets.map((preset) => {
                  const isIncome = preset.type === 'income';
                  const amount =
                    preset.defaultAmountCents > 0 ? preset.defaultAmountCents : 10000;
                  const isJustLaunched = launchingPresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleTriggerPreset(preset)}
                      className={`group text-left p-3 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                        isJustLaunched
                          ? 'bg-[#D4F907]/20 border-[#D4F907] scale-[0.98]'
                          : 'bg-[#F8FAFC] dark:bg-[#181F32] border-slate-200/80 dark:border-[#1E273C] hover:border-[#1860FC] dark:hover:border-[#D4F907] hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isIncome
                              ? 'bg-[#D4F907] text-[#000000]'
                              : 'bg-[#1860FC] text-white'
                          }`}
                        >
                          {isJustLaunched ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : isIncome ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-white dark:bg-[#111624] text-[#1860FC] dark:text-[#D4F907] border border-slate-200/70 dark:border-[#242F48]">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          1-Clique
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-[#000000] dark:text-white truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {NATURE_LABELS[preset.nature]}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-[#242F48] flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-mono font-black tabular-nums truncate ${
                            isIncome
                              ? 'text-emerald-600 dark:text-[#D4F907]'
                              : 'text-[#1860FC] dark:text-white'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatBrlCents(amount)}
                        </span>
                        <span className="text-[10px] font-extrabold text-[#1860FC] dark:text-[#D4F907] group-hover:translate-x-0.5 transition-transform">
                          {isJustLaunched ? 'Registrado!' : 'Lançar →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer inside Quick Tab */}
            <div className="pt-3 border-t border-slate-200 dark:border-[#1E273C] flex flex-wrap items-center justify-between gap-2">
              {onNavigateToSettings ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToSettings();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#1860FC] dark:hover:text-[#D4F907] transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907]" />
                  <span>Gerenciar atalhos ⚡ e valores padrões</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907]" />
                  Sobra atualizada automaticamente
                </span>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setModalTab('detailed')}
                  className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-[#1860FC] hover:bg-[#0D48D9] rounded-full transition-colors cursor-pointer"
                >
                  Outro Valor / Detalhado →
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-[#F8FAFC] dark:bg-[#181F32] rounded-full hover:bg-slate-200 dark:hover:bg-[#232D47] transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: 📝 LANÇAMENTO DETALHADO */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-2.5 text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Segmented Control: Tipo */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direção do Fluxo
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8FAFC] dark:bg-[#000000] rounded-full">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                    type === 'expense'
                      ? 'bg-[#1860FC] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Saída (Gasto)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                    type === 'income'
                      ? 'bg-[#D4F907] text-[#000000]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Entrada (Renda)
                </button>
              </div>
            </div>

            {/* Categoria Padrão ou Personalizada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tx-category"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Categoria
                </label>
                <select
                  id="tx-category"
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1860FC]"
                >
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}{' '}
                      {cat.defaultAmountCents > 0 ? `(${formatBrlCents(cat.defaultAmountCents)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tx-nature"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Natureza
                </label>
                <select
                  id="tx-nature"
                  value={expenseNature}
                  onChange={(e) => {
                    const nextNature = e.target.value as ExpenseNature;
                    setExpenseNature(nextNature);
                    setIsRecurring(nextNature === 'fixed' || nextNature === 'income_recurring');
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1860FC]"
                >
                  {type === 'expense' ? (
                    <>
                      <option value="fixed">{NATURE_LABELS.fixed}</option>
                      <option value="variable">{NATURE_LABELS.variable}</option>
                      <option value="surplus_allocation">{NATURE_LABELS.surplus_allocation}</option>
                    </>
                  ) : (
                    <>
                      <option value="income_recurring">{NATURE_LABELS.income_recurring}</option>
                      <option value="income_extra">{NATURE_LABELS.income_extra}</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Status do Lançamento (Pago/Recebido vs. Pendente) + Conta Fixa Recorrente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200/80 dark:border-[#1E273C]">
              <div>
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status de Efetivação
                </span>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStatus('completed')}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0" />
                    <span>{type === 'income' ? 'Recebido' : 'Pago'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('pending')}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      status === 'pending'
                        ? 'bg-amber-500 text-[#000000] shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Pendente</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recorrência Mensal
                </span>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111624] border border-slate-200/70 dark:border-[#1E273C] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRecurring(checked);
                      if (checked) {
                        setExpenseNature(type === 'income' ? 'income_recurring' : 'fixed');
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#1860FC] focus:ring-[#1860FC]"
                  />
                  <Repeat className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                    Repetir mensalmente / Conta Fixa
                  </span>
                </label>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label
                htmlFor="tx-description"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Descrição do Lançamento
              </label>
              <input
                id="tx-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'expense'
                    ? 'Ex: Supermercado Semanal, Conta de Luz...'
                    : 'Ex: Salário Mensal, Projeto Extra...'
                }
                maxLength={120}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tx-amount"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Valor em R$
                </label>
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Ex: 380,00"
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-date"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Data
                </label>
                <input
                  id="tx-date"
                  type="date"
                  value={dateIso}
                  onChange={(e) => setDateIso(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1860FC]"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label
                htmlFor="tx-notes"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Notas / Observações (opcional)
              </label>
              <input
                id="tx-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pago no PIX, Cartão final 4021..."
                maxLength={240}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#000000] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1860FC]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#1E273C]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-[#F8FAFC] dark:bg-[#181F32] rounded-full hover:bg-slate-200 dark:hover:bg-[#232D47] transition-colors whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {initialTransaction ? 'Salvar Alterações' : 'Registrar Lançamento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
