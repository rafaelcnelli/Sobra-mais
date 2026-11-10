import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import {
  formatBrlCents,
  parseInputToCents,
  validateTransactionInput,
  type FinancialCategory,
  type FinancialTransaction,
  type TransactionType,
  type ExpenseNature,
} from '../utils/financeLogic';
import { NATURE_LABELS } from '../utils/seedData';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: Omit<FinancialTransaction, 'id' | 'uid'>, existingId?: string) => Promise<void>;
  categories: FinancialCategory[];
  activeMonth: string;
  initialTransaction?: FinancialTransaction | null;
  defaultType?: TransactionType;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  categories,
  activeMonth,
  initialTransaction,
  defaultType = 'expense',
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('variable');
  const [dateIso, setDateIso] = useState(`${activeMonth}-09`);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initialTransaction) {
      setType(initialTransaction.type);
      setDescription(initialTransaction.description);
      setAmountInput((initialTransaction.amountCents / 100).toFixed(2).replace('.', ','));
      setCategoryId(initialTransaction.categoryId);
      setExpenseNature(initialTransaction.expenseNature);
      setDateIso(initialTransaction.dateIso);
      setNotes(initialTransaction.notes);
    } else {
      const targetType = defaultType;
      setType(targetType);
      const matchingCats = categories.filter((c) => c.type === targetType);
      const firstCat = matchingCats[0];
      setCategoryId(firstCat?.id ?? '');
      setExpenseNature(firstCat?.nature ?? (targetType === 'income' ? 'income_recurring' : 'variable'));
      setDescription('');
      setAmountInput('');
      setDateIso(`${activeMonth}-09`);
      setNotes('');
    }
  }, [isOpen, initialTransaction, defaultType, activeMonth, categories]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matching = categories.filter((c) => c.type === newType);
    const first = matching[0];
    if (first) {
      setCategoryId(first.id);
      setExpenseNature(first.nature);
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const found = categories.find((c) => c.id === newCatId);
    if (found) {
      setExpenseNature(found.nature);
      if (!description.trim() && found.isStandardPreset) {
        setDescription(found.name);
      }
      if (!amountInput.trim() && found.defaultAmountCents > 0) {
        setAmountInput((found.defaultAmountCents / 100).toFixed(2).replace('.', ','));
      }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-transaction-title"
    >
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#1E273C] rounded-2xl overflow-hidden shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-[#1456FF] text-white">
          <div className="min-w-0">
            <h2 id="modal-transaction-title" className="text-sm sm:text-base font-extrabold font-display tracking-tight truncate">
              {initialTransaction ? 'Editar Lançamento Financeiro' : 'Novo Lançamento Financeiro'}
            </h2>
            <p className="text-[11px] text-blue-100 truncate">
              Registre entradas, gastos fixos/variáveis ou alocações
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de lançamento"
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-2.5 text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Control: Tipo */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Direção do Fluxo
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F6FB] dark:bg-[#080B12] rounded-full">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-1.5 px-3 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                  type === 'expense'
                    ? 'bg-[#1456FF] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Saída (Gasto)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-1.5 px-3 text-xs font-bold rounded-full transition-colors whitespace-nowrap ${
                  type === 'income'
                    ? 'bg-[#E2FF1A] text-[#0A0E17]'
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
              <label htmlFor="tx-category" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Gasto / Categoria
              </label>
              <select
                id="tx-category"
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1456FF]"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.defaultAmountCents > 0 ? `(${formatBrlCents(cat.defaultAmountCents)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-nature" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Classificação no Orçamento
              </label>
              <select
                id="tx-nature"
                value={expenseNature}
                onChange={(e) => setExpenseNature(e.target.value as ExpenseNature)}
                className="w-full px-3 py-2 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1456FF]"
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

          {/* Descrição */}
          <div>
            <label htmlFor="tx-description" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descrição do Lançamento
            </label>
            <input
              id="tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'expense' ? 'Ex: Supermercado Semanal, Conta de Luz...' : 'Ex: Salário Mensal, Projeto Extra...'}
              maxLength={120}
              className="w-full px-3 py-2 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-amount" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor (R$)
              </label>
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Ex: 380,00"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data de Competência
              </label>
              <input
                id="tx-date"
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#1456FF]"
              />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label htmlFor="tx-notes" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações / Meio de Pagamento (opcional)
            </label>
            <input
              id="tx-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pago no PIX, Cartão final 4021..."
              maxLength={240}
              className="w-full px-3 py-2 text-xs bg-[#F4F6FB] dark:bg-[#080B12] border border-slate-200 dark:border-[#1E273C] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1456FF]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#1E273C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-[#F4F6FB] dark:bg-[#1A2236] rounded-full hover:bg-slate-200 dark:hover:bg-[#232D47] transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {initialTransaction ? 'Salvar Alterações' : 'Registrar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
