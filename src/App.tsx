/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  LogIn,
  LogOut,
  CheckCircle2,
  Sun,
  Moon,
  LayoutGrid,
  Compass,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  HardDrive,
  Download,
  FileJson,
} from 'lucide-react';
import {
  saveAutoSnapshot,
  triggerBackupDownload,
  getBackupStatus,
  dismissBackupReminder,
  type SobraMaisBackupData,
} from './utils/backupManager';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  formatBrlCents,
  setGlobalPrivacyMode,
  getTransactionStatus,
  isTransactionRecurring,
  calculateDynamicSummary,
  filterTransactionsByCriteria,
  searchTransactionsAcrossDataset,
  DEFAULT_FILTER_CRITERIA,
  type FinancialCategory,
  type FinancialTransaction,
  type MonthlySurplusPlan,
  type CustomFilterCriteria,
} from './utils/financeLogic';
import {
  AVAILABLE_MONTHS,
  getDefaultCategories,
  getDefaultTransactions,
  getDefaultMonthlyPlan,
} from './utils/seedData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OverviewTab } from './components/OverviewTab';
import { TransactionsTab } from './components/TransactionsTab';
import { CategoriesTab } from './components/CategoriesTab';
import { MonthlyAnalysisTab } from './components/MonthlyAnalysisTab';
import { TransactionModal, type QuickAddModalTab } from './components/TransactionModal';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import { PageFilterBar } from './components/PageFilterBar';
import { AuthPage } from './components/AuthPage';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';

export type ActiveTab = 'dashboard' | 'planner' | 'transactions' | 'settings';
export type ThemeMode = 'light' | 'dark';

const LOCAL_TX_KEY = 'sobramais_local_transactions_v1';
const LOCAL_CAT_KEY = 'sobramais_local_categories_v1';
const LOCAL_PLAN_KEY = 'sobramais_local_plans_v1';
const LOCAL_THEME_KEY = 'sobramais_theme_mode_v1';
const LOCAL_PRIVACY_KEY = 'sobramais_privacy_mode_v1';
const LOCAL_PREDICTIVE_KEY = 'sobramais_predictive_enabled_v1';
const GUEST_SESSION_KEY = 'sobramais_guest_session_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [filterCriteria, setFilterCriteria] =
    useState<CustomFilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(GUEST_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_PRIVACY_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isPredictiveEnabled, setIsPredictiveEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PREDICTIVE_KEY);
      if (saved === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });

  // Synchronously sync global privacy mode so formatBrlCents masks values across all components
  setGlobalPrivacyMode(isPrivacyMode);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_PRIVACY_KEY, String(isPrivacyMode));
    } catch {
      // ignore
    }
  }, [isPrivacyMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_PREDICTIVE_KEY, String(isPredictiveEnabled));
    } catch {
      // ignore
    }
  }, [isPredictiveEnabled]);

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      setGlobalPrivacyMode(next);
      return next;
    });
  }, []);

  const activeMonth =
    filterCriteria.periodMode === 'month' && filterCriteria.monthKey !== 'all'
      ? filterCriteria.monthKey
      : '2026-11';

  const setActiveMonth = useCallback((monthKey: string) => {
    setFilterCriteria((prev) => ({
      ...prev,
      periodMode: 'month',
      monthKey,
      startDate: '',
      endDate: '',
    }));
  }, []);

  const [isNavbarSearchFocused, setIsNavbarSearchFocused] = useState(false);

  const handleNavbarSearchChange = useCallback((value: string) => {
    setFilterCriteria((prev) => ({
      ...prev,
      searchQuery: value,
    }));
  }, []);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoTxId, setUndoTxId] = useState<string | null>(null);
  const [cloudCatIds, setCloudCatIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(LOCAL_THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Local / Cloud state
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TX_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return getDefaultTransactions('demo_user');
  });

  const [categories, setCategories] = useState<FinancialCategory[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CAT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getDefaultCategories('demo_user');
  });

  const [monthlyPlans, setMonthlyPlans] = useState<Record<string, MonthlySurplusPlan>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PLAN_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      '2026-09': getDefaultMonthlyPlan('demo_user', '2026-09'),
      '2026-10': getDefaultMonthlyPlan('demo_user', '2026-10'),
      '2026-11': getDefaultMonthlyPlan('demo_user', '2026-11'),
      '2026-12': getDefaultMonthlyPlan('demo_user', '2026-12'),
    };
  });

  // Global Quick-Add & Detailed Modal state (isQuickAddOpen)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'income' | 'expense'>('expense');
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<QuickAddModalTab>('quick');
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

  const openGlobalQuickAdd = useCallback(
    (defaultType: 'income' | 'expense' = 'expense', initialTab: QuickAddModalTab = 'quick') => {
      setEditingTransaction(null);
      setModalDefaultType(defaultType);
      setQuickAddInitialTab(initialTab);
      setIsQuickAddOpen(true);
    },
    []
  );

  const showToast = useCallback((msg: string, undoId: string | null = null) => {
    setToastMessage(msg);
    setUndoTxId(undoId);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage(null);
      setUndoTxId(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Persist local state when in demo/local mode
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(transactions));
      } catch {
        // ignore
      }
    }
  }, [transactions, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_CAT_KEY, JSON.stringify(categories));
      } catch {
        // ignore
      }
    }
  }, [categories, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(monthlyPlans));
      } catch {
        // ignore
      }
    }
  }, [monthlyPlans, currentUser]);

  // Snapshot automático contínuo para garantir segurança offline no LocalStorage
  useEffect(() => {
    saveAutoSnapshot(transactions, categories, monthlyPlans);
  }, [transactions, categories, monthlyPlans]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore real-time synchronization when authenticated
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const uid = currentUser.uid;
    const txPath = `users/${uid}/transactions`;
    const catPath = `users/${uid}/categories`;
    const planPath = `users/${uid}/monthlyPlans`;

    const txQuery = query(collection(db, txPath), where('uid', '==', uid));
    const catQuery = query(collection(db, catPath), where('uid', '==', uid));
    const planQuery = query(collection(db, planPath), where('uid', '==', uid));

    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const loaded: FinancialTransaction[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid,
            description: data.description,
            amountCents: data.amountCents,
            type: data.type,
            categoryId: data.categoryId,
            categoryName: data.categoryName,
            expenseNature: data.expenseNature,
            dateIso: data.dateIso,
            monthKey: data.monthKey,
            isStandardTemplate: Boolean(data.isStandardTemplate),
            status: data.status === 'pending' ? 'pending' : 'completed',
            isRecurring:
              typeof data.isRecurring === 'boolean'
                ? data.isRecurring
                : data.expenseNature === 'fixed' || data.expenseNature === 'income_recurring',
            notes: data.notes ?? '',
          };
        });
        setTransactions(loaded);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, txPath)
    );

    const unsubCat = onSnapshot(
      catQuery,
      (snapshot) => {
        const idsSet = new Set<string>();
        const customCats: FinancialCategory[] = snapshot.docs.map((d) => {
          idsSet.add(d.id);
          const data = d.data();
          const isDefaultOverride = getDefaultCategories(uid).some((def) => def.id === d.id);
          return {
            id: d.id,
            uid: data.uid,
            name: data.name,
            type: data.type,
            nature: data.nature,
            monthlyLimitCents: data.monthlyLimitCents,
            defaultAmountCents: data.defaultAmountCents,
            isStandardPreset: Boolean(data.isStandardPreset),
            isSystemDefault: isDefaultOverride,
          };
        });
        setCloudCatIds(idsSet);
        const defaults = getDefaultCategories(uid);
        const merged = [
          ...customCats,
          ...defaults.filter((d) => !customCats.some((c) => c.id === d.id)),
        ];
        setCategories(merged);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, catPath)
    );

    const unsubPlan = onSnapshot(
      planQuery,
      (snapshot) => {
        const plansMap: Record<string, MonthlySurplusPlan> = {
          '2026-09': getDefaultMonthlyPlan(uid, '2026-09'),
          '2026-10': getDefaultMonthlyPlan(uid, '2026-10'),
          '2026-11': getDefaultMonthlyPlan(uid, '2026-11'),
          '2026-12': getDefaultMonthlyPlan(uid, '2026-12'),
        };
        for (const d of snapshot.docs) {
          const data = d.data();
          plansMap[data.monthKey] = {
            id: d.id,
            uid: data.uid,
            monthKey: data.monthKey,
            targetSurplusPercent: data.targetSurplusPercent,
            targetSurplusCents: data.targetSurplusCents,
            emergencySharePercent: data.emergencySharePercent,
            investmentsSharePercent: data.investmentsSharePercent,
            goalsSharePercent: data.goalsSharePercent,
          };
        }
        setMonthlyPlans(plansMap);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, planPath)
    );

    return () => {
      unsubTx();
      unsubCat();
      unsubPlan();
    };
  }, [isAuthReady, currentUser]);

  const handleEnterGuestMode = (customProfile?: { name: string; email: string }) => {
    setIsGuestMode(true);
    try {
      sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
    } catch {
      // ignore
    }
    if (!customProfile) {
      showToast('Modo de Demonstração Rápida ativado! Dados salvos localmente.');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Conectado ao Firebase! Sincronização em nuvem ativa.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha na autenticação com Google.';
      setAuthErrorMsg(msg);
    }
  };

  const handleSignOut = async () => {
    setIsGuestMode(false);
    try {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    } catch {
      // ignore
    }
    if (currentUser) {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }
    setTransactions(getDefaultTransactions('demo_user'));
    setCategories(getDefaultCategories('demo_user'));
    showToast('Sessão encerrada com sucesso. Retornando ao login.');
  };

  const handleSaveTransaction = async (
    txData: Omit<FinancialTransaction, 'id' | 'uid'>,
    existingId?: string,
    customToastMsg?: string,
    enableUndo = false
  ) => {
    const txId = existingId ?? `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const normalizedStatus = txData.status === 'pending' ? 'pending' : 'completed';
    const normalizedRecurring =
      typeof txData.isRecurring === 'boolean'
        ? txData.isRecurring
        : txData.expenseNature === 'fixed' || txData.expenseNature === 'income_recurring';

    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${txId}`;
      try {
        if (existingId) {
          await updateDoc(doc(db, path), {
            description: txData.description,
            amountCents: txData.amountCents,
            type: txData.type,
            categoryId: txData.categoryId,
            categoryName: txData.categoryName,
            expenseNature: txData.expenseNature,
            dateIso: txData.dateIso,
            monthKey: txData.monthKey,
            isStandardTemplate: txData.isStandardTemplate,
            status: normalizedStatus,
            isRecurring: normalizedRecurring,
            notes: txData.notes,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, path), {
            uid: currentUser.uid,
            description: txData.description,
            amountCents: txData.amountCents,
            type: txData.type,
            categoryId: txData.categoryId,
            categoryName: txData.categoryName,
            expenseNature: txData.expenseNature,
            dateIso: txData.dateIso,
            monthKey: txData.monthKey,
            isStandardTemplate: txData.isStandardTemplate,
            status: normalizedStatus,
            isRecurring: normalizedRecurring,
            notes: txData.notes,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          existingId ? OperationType.UPDATE : OperationType.CREATE,
          path
        );
      }
    } else {
      const newTx: FinancialTransaction = {
        ...txData,
        status: normalizedStatus,
        isRecurring: normalizedRecurring,
        id: txId,
        uid: 'demo_user',
      };
      setTransactions((prev) =>
        existingId ? prev.map((t) => (t.id === existingId ? newTx : t)) : [newTx, ...prev]
      );
    }

    const message =
      customToastMsg ??
      (existingId
        ? `Lançamento "${txData.description}" atualizado!`
        : `${txData.type === 'income' ? 'Entrada' : 'Saída'} "${txData.description}" (${formatBrlCents(txData.amountCents)}) registrada!`);

    showToast(message, enableUndo && !existingId ? txId : null);
  };

  const handleToggleTransactionStatus = async (tx: FinancialTransaction) => {
    const currentStatus = getTransactionStatus(tx);
    const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const nextLabel =
      nextStatus === 'completed'
        ? tx.type === 'income'
          ? '✅ Marcado como Recebido!'
          : '✅ Marcado como Pago!'
        : '⏳ Marcado como Pendente!';

    await handleSaveTransaction(
      {
        description: tx.description,
        amountCents: tx.amountCents,
        type: tx.type,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        expenseNature: tx.expenseNature,
        dateIso: tx.dateIso,
        monthKey: tx.monthKey,
        isStandardTemplate: tx.isStandardTemplate,
        status: nextStatus,
        isRecurring: isTransactionRecurring(tx),
        notes: tx.notes,
      },
      tx.id,
      `${nextLabel} "${tx.description}" (${formatBrlCents(tx.amountCents)}) — Sobra real atualizada!`
    );
  };

  const handleDeleteTransaction = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
    showToast('Lançamento desfeito / removido.');
  };

  const handleQuickLaunchPreset = async (preset: FinancialCategory) => {
    const amountCents = preset.defaultAmountCents > 0 ? preset.defaultAmountCents : 10000;
    const toastMsg =
      preset.type === 'expense'
        ? `Gasto registrado! Sobra atualizada (-${formatBrlCents(amountCents)})`
        : `Entrada registrada! Sobra atualizada (+${formatBrlCents(amountCents)})`;

    await handleSaveTransaction(
      {
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
        notes: 'Lançamento rápido via padrão 1-clique',
      },
      undefined,
      toastMsg,
      true
    );
  };

  const handleCreateCategory = async (catData: Omit<FinancialCategory, 'id' | 'uid'>) => {
    const catId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (currentUser) {
      const path = `users/${currentUser.uid}/categories/${catId}`;
      try {
        await setDoc(doc(db, path), {
          uid: currentUser.uid,
          name: catData.name,
          type: catData.type,
          nature: catData.nature,
          monthlyLimitCents: catData.monthlyLimitCents,
          defaultAmountCents: catData.defaultAmountCents,
          isStandardPreset: catData.isStandardPreset,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const newCat: FinancialCategory = {
        ...catData,
        id: catId,
        uid: 'demo_user',
        isSystemDefault: false,
      };
      setCategories((prev) => [newCat, ...prev]);
    }
    showToast(`Categoria "${catData.name}" criada!`);
  };

  const handleUpdateCategory = async (updatedCat: FinancialCategory) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/categories/${updatedCat.id}`;
      try {
        if (cloudCatIds.has(updatedCat.id)) {
          await updateDoc(doc(db, path), {
            name: updatedCat.name,
            type: updatedCat.type,
            nature: updatedCat.nature,
            monthlyLimitCents: updatedCat.monthlyLimitCents,
            defaultAmountCents: updatedCat.defaultAmountCents,
            isStandardPreset: updatedCat.isStandardPreset,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, path), {
            uid: currentUser.uid,
            name: updatedCat.name,
            type: updatedCat.type,
            nature: updatedCat.nature,
            monthlyLimitCents: updatedCat.monthlyLimitCents,
            defaultAmountCents: updatedCat.defaultAmountCents,
            isStandardPreset: updatedCat.isStandardPreset,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
    }
    showToast(`Categoria "${updatedCat.name}" atualizada!`);
  };

  const handleDeleteCategory = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/categories/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
    showToast('Categoria personalizada removida.');
  };

  const handleSaveMonthlyPlan = async (planData: Omit<MonthlySurplusPlan, 'id' | 'uid'>) => {
    const planId = `plan_${planData.monthKey}`;
    if (currentUser) {
      const path = `users/${currentUser.uid}/monthlyPlans/${planId}`;
      try {
        await setDoc(doc(db, path), {
          uid: currentUser.uid,
          monthKey: planData.monthKey,
          targetSurplusPercent: planData.targetSurplusPercent,
          targetSurplusCents: planData.targetSurplusCents,
          emergencySharePercent: planData.emergencySharePercent,
          investmentsSharePercent: planData.investmentsSharePercent,
          goalsSharePercent: planData.goalsSharePercent,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setMonthlyPlans((prev) => ({
        ...prev,
        [planData.monthKey]: {
          ...planData,
          id: planId,
          uid: 'demo_user',
        },
      }));
    }
    showToast('Diretriz de sobras do mês salva!');
  };

  const handleRecordSurplusAllocation = async (amountCents: number, label: string) => {
    if (amountCents <= 0) return;
    await handleSaveTransaction({
      description: label,
      amountCents,
      type: 'expense',
      categoryId: 'cat_surplus_reserve',
      categoryName: 'Caixinha de Sobra / Investimento',
      expenseNature: 'surplus_allocation',
      dateIso: `${activeMonth}-09`,
      monthKey: activeMonth,
      isStandardTemplate: false,
      notes: 'Alocação planejada da sobra mensal',
    });
  };

  // Micro-interaction from Pie Chart slice click -> Redirect to Extrato filtered by category
  const handleFilterExtratoByCategory = useCallback((categoryId: string) => {
    setFilterCriteria((prev) => ({
      ...prev,
      categoryId,
    }));
    setActiveTab('transactions');
  }, []);

  // Rotina de Backup Periódico Offline (JSON) & Status
  const [backupStatusTick, setBackupStatusTick] = useState(0);
  const [isBackupReminderDismissed, setIsBackupReminderDismissed] = useState(false);

  const backupStatus = useMemo(() => {
    return getBackupStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupStatusTick, transactions.length, categories.length]);

  const handleDownloadBackup = useCallback(() => {
    try {
      const result = triggerBackupDownload(transactions, categories, monthlyPlans);
      showToast(`Backup ${result.fileName} gerado com sucesso!`);
      setBackupStatusTick((t) => t + 1);
      setIsBackupReminderDismissed(true);
    } catch {
      showToast('Erro ao baixar arquivo de backup.');
    }
  }, [transactions, categories, monthlyPlans, showToast]);

  const handleRestoreBackup = useCallback(
    (backup: SobraMaisBackupData) => {
      try {
        setTransactions(backup.transactions);
        setCategories(backup.categories);
        if (backup.monthlyPlans && Object.keys(backup.monthlyPlans).length > 0) {
          setMonthlyPlans(backup.monthlyPlans);
        }
        try {
          localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(backup.transactions));
          localStorage.setItem(LOCAL_CAT_KEY, JSON.stringify(backup.categories));
          if (backup.monthlyPlans) {
            localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(backup.monthlyPlans));
          }
        } catch {
          // ignore
        }
        saveAutoSnapshot(backup.transactions, backup.categories, backup.monthlyPlans || {});
        setBackupStatusTick((t) => t + 1);
        showToast(
          `Backup restaurado com sucesso! (${backup.transactions.length} lançamentos e ${backup.categories.length} categorias)`
        );
      } catch {
        showToast('Falha ao restaurar dados do backup.');
      }
    },
    [showToast]
  );

  const handleDismissReminder = useCallback(() => {
    dismissBackupReminder();
    setIsBackupReminderDismissed(true);
  }, []);

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByCriteria(transactions, filterCriteria);
  }, [transactions, filterCriteria]);

  const navbarSearchQuery = filterCriteria.searchQuery ?? '';
  const hasActiveNavbarSearch = navbarSearchQuery.trim().length > 0;

  const globalDatasetSearchResults = useMemo(() => {
    if (!hasActiveNavbarSearch) return [];
    return searchTransactionsAcrossDataset(transactions, navbarSearchQuery).sort((a, b) =>
      b.dateIso.localeCompare(a.dateIso)
    );
  }, [transactions, navbarSearchQuery, hasActiveNavbarSearch]);

  const activePeriodLabel = useMemo(() => {
    if (hasActiveNavbarSearch) {
      return `Busca Global: "${navbarSearchQuery.trim()}" (${filteredTransactions.length} de ${transactions.length})`;
    }
    if (
      filterCriteria.periodMode === 'range' &&
      filterCriteria.startDate &&
      filterCriteria.endDate
    ) {
      const [sy, sm, sd] = filterCriteria.startDate.split('-');
      const [ey, em, ed] = filterCriteria.endDate.split('-');
      return `${sd}/${sm}/${sy} a ${ed}/${em}/${ey}`;
    }
    if (filterCriteria.periodMode === 'month') {
      if (filterCriteria.monthKey === 'all') return 'Todos os Meses';
      const m = AVAILABLE_MONTHS.find((item) => item.key === filterCriteria.monthKey);
      return m ? m.label : filterCriteria.monthKey;
    }
    return 'Filtro Personalizado';
  }, [
    filterCriteria,
    hasActiveNavbarSearch,
    navbarSearchQuery,
    filteredTransactions.length,
    transactions.length,
  ]);

  const activePlan =
    monthlyPlans[activeMonth] ??
    getDefaultMonthlyPlan(currentUser?.uid ?? 'demo_user', activeMonth);

  const filteredSummary = useMemo(() => {
    return calculateDynamicSummary(filteredTransactions, activePeriodLabel, activePlan);
  }, [filteredTransactions, activePeriodLabel, activePlan]);

  // 1. Initial auth state loading splash
  if (!isAuthReady) {
    return (
      <div className="h-screen w-full bg-[#F8FAFC] dark:bg-[#000000] flex flex-col items-center justify-center gap-4 transition-colors">
        <img
          src="./logo-sobramais.png"
          alt="SobraMais"
          className="h-14 w-auto object-contain dark:hidden animate-pulse"
        />
        <img
          src="./logo-sobramais-dark.png"
          alt="SobraMais"
          className="h-14 w-auto object-contain hidden dark:block animate-pulse"
        />
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <div className="w-3.5 h-3.5 border-2 border-[#1860FC] border-t-transparent rounded-full animate-spin" />
          <span>Iniciando SobraMais...</span>
        </div>
      </div>
    );
  }

  // 2. Conditional Auth Gate (Portão de Entrada)
  if (!currentUser && !isGuestMode) {
    return (
      <ErrorBoundary>
        <AuthPage
          onEnterGuestMode={handleEnterGuestMode}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSuccessToast={(msg) => showToast(msg)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden flex flex-row bg-[#F8FAFC] dark:bg-[#000000] text-[#000000] dark:text-[#FFFFFF] transition-colors duration-200">
        {/* Desktop Left Navigation Sidebar (4 Tabs + Highlighted + Novo Lançamento) */}
        <DesktopSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeMonth={activeMonth}
          theme={theme}
          onToggleTheme={toggleTheme}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onOpenNewModal={(defaultType = 'expense', initialTab = 'quick') => {
            openGlobalQuickAdd(defaultType, initialTab);
          }}
          categoriesCount={categories.length}
          transactionsCount={filteredTransactions.length}
          netSurplusCents={filteredSummary.netSurplusCents}
          activePeriodLabel={activePeriodLabel}
        />

        {/* Workspace Content Area */}
        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
          {/* Header Global: Marca + Busca em Tempo Real + Ações Rápidas */}
          <header className="shrink-0 bg-white dark:bg-[#111624] border-b border-slate-200/80 dark:border-[#1E273C] px-3 sm:px-6 py-2.5 z-30 transition-colors">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
              {/* Zone 1: Brand Logo (Mobile) / Active Page Indicator (Desktop) */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="#visao-geral"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('dashboard');
                  }}
                  className="md:hidden flex items-center gap-1.5 shrink-0"
                >
                  <img
                    src="./logo-sobramais.png"
                    alt="SobraMais"
                    className="h-6 sm:h-7 w-auto object-contain dark:hidden"
                  />
                  <img
                    src="./logo-sobramais-dark.png"
                    alt="SobraMais"
                    className="h-6 sm:h-7 w-auto object-contain hidden dark:block"
                  />
                </a>

                <div className="hidden md:flex items-center gap-2.5">
                  <img
                    src="./logo-icon.png"
                    alt="S+"
                    className="w-6 h-6 object-contain dark:hidden shrink-0"
                  />
                  <img
                    src="./logo-icon-dark.png"
                    alt="S+"
                    className="w-6 h-6 object-contain hidden dark:block shrink-0"
                  />
                  <span className="text-sm font-extrabold text-[#000000] dark:text-white font-display whitespace-nowrap">
                    {activeTab === 'dashboard' && '🏠 Visão Geral'}
                    {activeTab === 'planner' && '🎯 Planejador & Metas'}
                    {activeTab === 'transactions' && '💳 Extrato'}
                    {activeTab === 'settings' && '🏷️ Ajustes & Categorias'}
                  </span>
                </div>
              </div>

              {/* Zone 3: Real-Time Global Search Bar */}
              <div className="relative flex-1 max-w-xs lg:max-w-md hidden sm:block">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={navbarSearchQuery}
                    onFocus={() => setIsNavbarSearchFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsNavbarSearchFocused(false), 180);
                    }}
                    onChange={(e) => handleNavbarSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleNavbarSearchChange('');
                      } else if (e.key === 'Enter' && hasActiveNavbarSearch) {
                        setIsNavbarSearchFocused(false);
                        setActiveTab('transactions');
                      }
                    }}
                    placeholder="Buscar transação em todo o histórico..."
                    aria-label="Buscar transações por descrição em tempo real"
                    className={`w-full pl-8 ${
                      hasActiveNavbarSearch ? 'pr-20' : 'pr-3'
                    } py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#192034] border ${
                      hasActiveNavbarSearch
                        ? 'border-[#1860FC] dark:border-[#D4F907] ring-1 ring-[#1860FC]/20 dark:ring-[#D4F907]/20'
                        : 'border-slate-200 dark:border-[#242F48]'
                    } rounded-full text-[#000000] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1860FC] dark:focus:border-[#D4F907] transition-colors`}
                  />

                  {hasActiveNavbarSearch && (
                    <div className="absolute right-1.5 flex items-center gap-1">
                      <span
                        title={`${filteredTransactions.length} transações encontradas`}
                        className="px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-extrabold rounded-full bg-[#1860FC] text-white"
                      >
                        {filteredTransactions.length}/{transactions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNavbarSearchChange('')}
                        aria-label="Limpar busca"
                        className="p-0.5 rounded-full text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isNavbarSearchFocused && hasActiveNavbarSearch && (
                  <div
                    role="region"
                    aria-label="Resultados da busca em tempo real"
                    className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#242F48] rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#161D2F] border-b border-slate-200/80 dark:border-[#242F48] flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-slate-600 dark:text-slate-300 truncate">
                        Todo o Conjunto ({globalDatasetSearchResults.length} de{' '}
                        {transactions.length})
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveTab('transactions');
                          setIsNavbarSearchFocused(false);
                        }}
                        className="font-extrabold text-[#1860FC] dark:text-[#D4F907] hover:underline whitespace-nowrap"
                      >
                        Ver no Extrato →
                      </button>
                    </div>

                    {globalDatasetSearchResults.length === 0 ? (
                      <div className="p-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                        Nenhuma transação encontrada para <strong>"{navbarSearchQuery}"</strong>.
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E273C]">
                        {globalDatasetSearchResults.slice(0, 6).map((tx) => (
                          <button
                            key={tx.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setActiveTab('transactions');
                              setIsNavbarSearchFocused(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#192034] flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#000000] dark:text-white truncate">
                                {tx.description}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {tx.dateIso.split('-').reverse().join('/')} · {tx.categoryName}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-mono tabular-nums font-extrabold whitespace-nowrap shrink-0 ${
                                tx.type === 'income'
                                  ? 'text-emerald-600 dark:text-[#D4F907]'
                                  : 'text-[#000000] dark:text-white'
                              }`}
                            >
                              {tx.type === 'income'
                                ? `+ ${formatBrlCents(tx.amountCents)}`
                                : `- ${formatBrlCents(tx.amountCents)}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Zone 4: PWA Install, Privacy Mode Toggle, Theme Toggle, Login & Deslogar (Sair) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <PWAInstallButton variant="navbar" />

                {/* 👁️ Botão Discreto de Modo Privacidade Global (Ocultar Valores R$) */}
                <button
                  type="button"
                  onClick={togglePrivacyMode}
                  data-testid="privacy-toggle-btn"
                  title={
                    isPrivacyMode
                      ? 'Mostrar valores em Reais (Modo Privacidade Ativo)'
                      : 'Ocultar valores em Reais (Ativar Modo Privacidade)'
                  }
                  aria-label={
                    isPrivacyMode
                      ? 'Mostrar valores monetários em Reais'
                      : 'Ocultar valores monetários em Reais'
                  }
                  className={`inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                    isPrivacyMode
                      ? 'bg-[#D4F907] text-[#000000] border-[#D4F907]'
                      : 'border-slate-200 dark:border-[#242F48] bg-[#F8FAFC] dark:bg-[#192034] text-[#000000] dark:text-white hover:border-[#1860FC] dark:hover:border-[#D4F907]'
                  }`}
                >
                  {isPrivacyMode ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden xl:inline">R$ Oculto</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-[#1860FC] dark:text-[#D4F907] shrink-0" />
                      <span className="hidden xl:inline">Privacidade</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
                  className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-full border border-slate-200 dark:border-[#242F48] bg-[#F8FAFC] dark:bg-[#192034] text-[#000000] dark:text-white hover:border-[#1860FC] dark:hover:border-[#D4F907] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[#D4F907]" />
                      <span className="hidden lg:inline">Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#1860FC]" />
                      <span className="hidden lg:inline">Escuro</span>
                    </>
                  )}
                </button>

                {/* Botão de Login na Navbar */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser) {
                      setActiveTab('settings');
                    } else {
                      setIsGuestMode(false);
                      try {
                        sessionStorage.removeItem(GUEST_SESSION_KEY);
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  title={
                    currentUser
                      ? `Conectado como ${currentUser.displayName || currentUser.email}`
                      : 'Ir para a tela de Login / Entrar na conta'
                  }
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-extrabold text-[#1860FC] dark:text-[#D4F907] bg-[#F8FAFC] dark:bg-[#192034] border border-[#1860FC]/30 dark:border-[#D4F907]/40 rounded-full hover:bg-[#1860FC] hover:text-white dark:hover:bg-[#D4F907] dark:hover:text-[#000000] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>{currentUser ? (currentUser.displayName?.split(' ')[0] || 'Conta') : 'Login'}</span>
                </button>

                {/* Botão de Deslogar (Sair) na Navbar */}
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Deslogar e encerrar sessão"
                  aria-label="Deslogar e sair da conta"
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#F8FAFC] dark:bg-[#192034] border border-slate-200 dark:border-[#242F48] rounded-full hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sair</span>
                </button>

                <button
                  type="button"
                  onClick={() => openGlobalQuickAdd('expense', 'quick')}
                  className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-[#1860FC] rounded-full hover:bg-[#0D48D9] transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4F907]" />
                  <span>Novo Lançamento</span>
                </button>
              </div>
            </div>

            {authErrorMsg && (
              <div className="max-w-7xl mx-auto mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                Aviso de autenticação: {authErrorMsg}
              </div>
            )}
          </header>

          {/* Offline Connectivity Indicator */}
          <OfflineIndicator />

          {/* Floating Non-Displacing Toast Feedback Banner (With Undo Option for 1-Click) */}
          {toastMessage && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none">
              <div
                role="status"
                className="pointer-events-auto flex items-center justify-between gap-2 px-4 py-2.5 bg-[#1860FC] text-white text-xs font-bold rounded-full shadow-lg border border-white/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#D4F907] shrink-0" />
                  <span className="truncate">{toastMessage}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {undoTxId && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = undoTxId;
                        setToastMessage(null);
                        setUndoTxId(null);
                        handleDeleteTransaction(targetId);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4F907] text-[#000000] text-[11px] font-black hover:bg-[#C0E206] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Desfazer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setToastMessage(null);
                      setUndoTxId(null);
                    }}
                    className="text-white/80 hover:text-white font-extrabold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Workspace Container with generous mobile spacing and pb-28 so Bottom Bar never overlaps content */}
          <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-28 md:pb-8 overflow-y-auto overflow-x-hidden">
            {/* Banner de Lembrete de Backup Periódico Offline */}
            {!isBackupReminderDismissed &&
              backupStatus.isReminderDue &&
              backupStatus.autoBackupEnabled && (
                <div
                  role="alert"
                  className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <HardDrive className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-xs font-extrabold text-[#000000] dark:text-white">
                          Segurança Offline: Backup JSON Recomendado
                        </strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                          {backupStatus.daysSinceLastDownload !== null
                            ? `${backupStatus.daysSinceLastDownload} dias sem download`
                            : 'Primeiro download pendente'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        Mantenha uma cópia de segurança em formato JSON legível no seu computador ou celular para proteger seus dados locais contra limpezas do navegador.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1860FC] hover:bg-[#0D48D9] rounded-full transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D4F907]" />
                      <span>Baixar Agora (.json)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissReminder}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Lembrar mais tarde
                    </button>
                  </div>
                </div>
              )}

            {/* In-Page Filter Bar: Standard Months, All-Time & Custom Date/Nature/Category Filter */}
            <PageFilterBar
              criteria={filterCriteria}
              onChangeCriteria={setFilterCriteria}
              categories={categories}
              summary={filteredSummary}
              totalFilteredCount={filteredTransactions.length}
            />

            {/* PÁGINA 1: 🏠 Visão Geral (dashboard) */}
            {activeTab === 'dashboard' && (
              <OverviewTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                monthlyPlan={activePlan}
                onQuickLaunchPreset={handleQuickLaunchPreset}
                onOpenNewModal={(defaultType = 'expense', initialTab = 'quick') => {
                  openGlobalQuickAdd(defaultType, initialTab);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsQuickAddOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateTab={setActiveTab}
                onFilterByCategory={handleFilterExtratoByCategory}
                filteredTransactions={filteredTransactions}
                summary={filteredSummary}
                periodLabel={activePeriodLabel}
                isPrivacyMode={isPrivacyMode}
                isPredictiveEnabled={isPredictiveEnabled}
                onTogglePredictive={(enabled) => {
                  setIsPredictiveEnabled(enabled);
                  showToast(
                    enabled
                      ? 'Inteligência Preditiva de Sobras ativada!'
                      : 'Inteligência Preditiva ocultada. Você pode reativá-la em Ajustes & Categorias.'
                  );
                }}
              />
            )}

            {/* PÁGINA 2: 🎯 Planejador & Metas (planner) */}
            {activeTab === 'planner' && (
              <MonthlyAnalysisTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                monthlyPlan={activePlan}
                onSaveMonthlyPlan={handleSaveMonthlyPlan}
                onRecordSurplusAllocation={handleRecordSurplusAllocation}
                filteredTransactions={filteredTransactions}
                periodLabel={activePeriodLabel}
                isPrivacyMode={isPrivacyMode}
                isPredictiveEnabled={isPredictiveEnabled}
                onTogglePredictive={(enabled) => {
                  setIsPredictiveEnabled(enabled);
                  showToast(
                    enabled
                      ? 'Inteligência Preditiva de Sobras ativada!'
                      : 'Inteligência Preditiva ocultada. Você pode reativá-la em Ajustes & Categorias.'
                  );
                }}
              />
            )}

            {/* PÁGINA 3: 💳 Extrato (transactions) */}
            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={transactions}
                categories={categories}
                activeMonth={activeMonth}
                onOpenNewModal={(defaultType = 'expense', initialTab = 'detailed') => {
                  openGlobalQuickAdd(defaultType, initialTab);
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsQuickAddOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onToggleTransactionStatus={handleToggleTransactionStatus}
                filteredTransactions={filteredTransactions}
                periodLabel={activePeriodLabel}
                globalSearchQuery={navbarSearchQuery}
                onChangeGlobalSearchQuery={handleNavbarSearchChange}
                externalCategoryFilter={filterCriteria.categoryId}
                onChangeExternalCategoryFilter={(catId) =>
                  setFilterCriteria((prev) => ({ ...prev, categoryId: catId }))
                }
                isPrivacyMode={isPrivacyMode}
              />
            )}

            {/* PÁGINA 4: 🏷️ Ajustes & Categorias (settings) */}
            {activeTab === 'settings' && (
              <CategoriesTab
                categories={categories}
                transactions={transactions}
                monthlyPlans={monthlyPlans}
                onCreateCategory={handleCreateCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onQuickLaunchPreset={handleQuickLaunchPreset}
                onDownloadBackup={handleDownloadBackup}
                onRestoreBackup={handleRestoreBackup}
                theme={theme}
                onToggleTheme={toggleTheme}
                currentUser={currentUser}
                onSignOut={handleSignOut}
                isPredictiveEnabled={isPredictiveEnabled}
                onTogglePredictive={(enabled) => {
                  setIsPredictiveEnabled(enabled);
                  showToast(
                    enabled
                      ? 'Inteligência Preditiva de Sobras ativada!'
                      : 'Inteligência Preditiva de Sobras desativada.'
                  );
                }}
                isPrivacyMode={isPrivacyMode}
                onTogglePrivacyMode={togglePrivacyMode}
              />
            )}
          </main>

          {/* Mobile Fixed Bottom Navigation Bar (4 Abas + Botão Flutuante Central FAB "+") */}
          <nav
            aria-label="Navegação Principal Inferior Mobile"
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111624]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#1E273C] px-3 py-2 z-40 transition-colors shadow-lg"
          >
            <div className="max-w-md mx-auto grid grid-cols-5 items-center gap-1.5">
              {/* Aba 1: Visão Geral */}
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#1860FC] text-white font-extrabold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#000000] dark:hover:text-white font-semibold'
                }`}
              >
                <LayoutGrid
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'dashboard'
                      ? 'text-[#D4F907]'
                      : 'text-[#1860FC] dark:text-[#D4F907]'
                  }`}
                />
                <span className="text-[10px] leading-none truncate">Visão Geral</span>
              </button>

              {/* Aba 2: Planejador & Metas */}
              <button
                type="button"
                onClick={() => setActiveTab('planner')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl transition-colors cursor-pointer ${
                  activeTab === 'planner'
                    ? 'bg-[#1860FC] text-white font-extrabold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#000000] dark:hover:text-white font-semibold'
                }`}
              >
                <Compass
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'planner'
                      ? 'text-[#D4F907]'
                      : 'text-[#1860FC] dark:text-[#D4F907]'
                  }`}
                />
                <span className="text-[10px] leading-none truncate">Planejador</span>
              </button>

              {/* Botão Flutuante Central (FAB "+") para Lançamento Rápido Global */}
              <div className="flex items-center justify-center -mt-6">
                <button
                  type="button"
                  onClick={() => openGlobalQuickAdd('expense', 'quick')}
                  aria-label="Abrir Modal Global de Lançamento Rápido"
                  className="w-12 h-12 rounded-full bg-[#1860FC] hover:bg-[#0D48D9] text-[#D4F907] border-4 border-[#F8FAFC] dark:border-[#000000] shadow-lg flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-6 h-6 stroke-[2.75]" />
                </button>
              </div>

              {/* Aba 3: Extrato */}
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl transition-colors cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'bg-[#1860FC] text-white font-extrabold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#000000] dark:hover:text-white font-semibold'
                }`}
              >
                <ArrowLeftRight
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'transactions'
                      ? 'text-[#D4F907]'
                      : 'text-[#1860FC] dark:text-[#D4F907]'
                  }`}
                />
                <span className="text-[10px] leading-none truncate">Extrato</span>
              </button>

              {/* Aba 4: Ajustes & Categorias */}
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#1860FC] text-white font-extrabold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#000000] dark:hover:text-white font-semibold'
                }`}
              >
                <SlidersHorizontal
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'settings'
                      ? 'text-[#D4F907]'
                      : 'text-[#1860FC] dark:text-[#D4F907]'
                  }`}
                />
                <span className="text-[10px] leading-none truncate">Ajustes</span>
              </button>
            </div>
          </nav>

          {/* Optional Drawer */}
          <SidebarDrawer
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            activeMonth={activeMonth}
            onChangeMonth={setActiveMonth}
            theme={theme}
            onToggleTheme={toggleTheme}
            currentUser={currentUser}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
            onOpenNewModal={(defaultType = 'expense', initialTab = 'quick') => {
              openGlobalQuickAdd(defaultType, initialTab);
            }}
            categoriesCount={categories.length}
            transactionsCount={filteredTransactions.length}
            netSurplusCents={filteredSummary.netSurplusCents}
          />

          {/* COMPONENTE GLOBAL: Modal / Gaveta de Lançamento Rápido (Botão "+") */}
          <TransactionModal
            isOpen={isQuickAddOpen}
            onClose={() => {
              setIsQuickAddOpen(false);
              setEditingTransaction(null);
            }}
            onSave={handleSaveTransaction}
            onQuickLaunchPreset={handleQuickLaunchPreset}
            onNavigateToSettings={() => setActiveTab('settings')}
            categories={categories}
            activeMonth={activeMonth}
            initialTransaction={editingTransaction}
            defaultType={modalDefaultType}
            initialModalTab={quickAddInitialTab}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
