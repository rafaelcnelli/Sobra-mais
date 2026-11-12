import type {
  FinancialCategory,
  FinancialTransaction,
  MonthlySurplusPlan,
} from './financeLogic';

export interface SobraMaisBackupData {
  app: 'SobraMais';
  version: '1.0';
  exportedAt: string;
  stats: {
    transactionsCount: number;
    categoriesCount: number;
    monthlyPlansCount: number;
  };
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  monthlyPlans: Record<string, MonthlySurplusPlan>;
}

export const BACKUP_KEYS = {
  AUTO_SNAPSHOT: 'sobramais_auto_snapshot_v1',
  LAST_DOWNLOAD: 'sobramais_last_backup_download_v1',
  FREQUENCY_DAYS: 'sobramais_backup_frequency_days_v1',
  REMINDER_DISMISSED: 'sobramais_backup_reminder_dismissed_v1',
  AUTO_BACKUP_ENABLED: 'sobramais_auto_backup_enabled_v1',
};

export const BACKUP_FREQUENCY_PRESETS = [
  { days: 1, label: 'Diário (a cada 24 horas)' },
  { days: 7, label: 'Semanal (recomendado)' },
  { days: 15, label: 'Quinzenal (a cada 15 dias)' },
  { days: 30, label: 'Mensal (a cada 30 dias)' },
];

/**
 * Builds a structured, versioned backup payload for SobraMais
 */
export function buildBackupPayload(
  transactions: FinancialTransaction[],
  categories: FinancialCategory[],
  monthlyPlans: Record<string, MonthlySurplusPlan>
): SobraMaisBackupData {
  return {
    app: 'SobraMais',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      transactionsCount: transactions.length,
      categoriesCount: categories.length,
      monthlyPlansCount: Object.keys(monthlyPlans).length,
    },
    transactions,
    categories,
    monthlyPlans,
  };
}

/**
 * Periodically saves an offline snapshot to localStorage
 */
export function saveAutoSnapshot(
  transactions: FinancialTransaction[],
  categories: FinancialCategory[],
  monthlyPlans: Record<string, MonthlySurplusPlan>
): void {
  try {
    const payload = buildBackupPayload(transactions, categories, monthlyPlans);
    localStorage.setItem(BACKUP_KEYS.AUTO_SNAPSHOT, JSON.stringify(payload));
  } catch (error) {
    console.warn('Falha ao salvar auto-snapshot no LocalStorage:', error);
  }
}

/**
 * Retrieves the latest auto-snapshot from localStorage
 */
export function getAutoSnapshot(): SobraMaisBackupData | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEYS.AUTO_SNAPSHOT);
    if (!raw) return null;
    return JSON.parse(raw) as SobraMaisBackupData;
  } catch {
    return null;
  }
}

/**
 * Generates and triggers browser file download of the JSON backup
 */
export function triggerBackupDownload(
  transactions: FinancialTransaction[],
  categories: FinancialCategory[],
  monthlyPlans: Record<string, MonthlySurplusPlan>
): { fileName: string; sizeBytes: number } {
  const payload = buildBackupPayload(transactions, categories, monthlyPlans);
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', 'h');
  const fileName = `sobramais-backup-${dateStr}-${timeStr}.json`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  try {
    localStorage.setItem(BACKUP_KEYS.LAST_DOWNLOAD, now.toISOString());
    // Reset any dismissed state upon explicit backup
    localStorage.removeItem(BACKUP_KEYS.REMINDER_DISMISSED);
  } catch {
    // ignore
  }

  return { fileName, sizeBytes: blob.size };
}

/**
 * Validates a candidate backup JSON payload before restoring
 */
export function validateAndParseBackupJson(jsonString: string): {
  valid: boolean;
  error?: string;
  data?: SobraMaisBackupData;
} {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return { valid: false, error: 'Arquivo vazio ou formato inválido.' };
    }

    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'O arquivo JSON deve conter um objeto válido.' };
    }

    // Verify root identifiers
    if (parsed.app !== 'SobraMais') {
      return {
        valid: false,
        error: 'Arquivo incompatível: o backup selecionado não pertence ao SobraMais.',
      };
    }

    // Validate transactions array
    if (!Array.isArray(parsed.transactions)) {
      return {
        valid: false,
        error: 'Estrutura inválida: lista de transações não encontrada.',
      };
    }

    for (const [idx, tx] of parsed.transactions.entries()) {
      if (
        !tx.id ||
        typeof tx.description !== 'string' ||
        typeof tx.amountCents !== 'number' ||
        (tx.type !== 'income' && tx.type !== 'expense') ||
        typeof tx.dateIso !== 'string'
      ) {
        return {
          valid: false,
          error: `Transação #${idx + 1} ("${tx.description || 'sem nome'}") possui campos corrompidos.`,
        };
      }
    }

    // Validate categories array
    if (!Array.isArray(parsed.categories)) {
      return {
        valid: false,
        error: 'Estrutura inválida: lista de categorias não encontrada.',
      };
    }

    for (const [idx, cat] of parsed.categories.entries()) {
      if (
        !cat.id ||
        typeof cat.name !== 'string' ||
        (cat.type !== 'income' && cat.type !== 'expense') ||
        typeof cat.nature !== 'string'
      ) {
        return {
          valid: false,
          error: `Categoria #${idx + 1} ("${cat.name || 'sem nome'}") possui campos corrompidos.`,
        };
      }
    }

    // Validate monthly plans
    if (!parsed.monthlyPlans || typeof parsed.monthlyPlans !== 'object') {
      return {
        valid: false,
        error: 'Estrutura inválida: metas e planejamentos mensais ausentes.',
      };
    }

    const validatedData: SobraMaisBackupData = {
      app: 'SobraMais',
      version: '1.0',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      stats: {
        transactionsCount: parsed.transactions.length,
        categoriesCount: parsed.categories.length,
        monthlyPlansCount: Object.keys(parsed.monthlyPlans).length,
      },
      transactions: parsed.transactions,
      categories: parsed.categories,
      monthlyPlans: parsed.monthlyPlans,
    };

    return { valid: true, data: validatedData };
  } catch (err) {
    return {
      valid: false,
      error: `Erro de sintaxe JSON: ${err instanceof Error ? err.message : 'Arquivo corrompido'}`,
    };
  }
}

/**
 * Checks the status of periodic backup downloads and whether a reminder is due
 */
export function getBackupStatus(): {
  lastDownloadIso: string | null;
  lastSnapshotIso: string | null;
  frequencyDays: number;
  isReminderDue: boolean;
  autoBackupEnabled: boolean;
  daysSinceLastDownload: number | null;
} {
  try {
    const lastDownloadIso = localStorage.getItem(BACKUP_KEYS.LAST_DOWNLOAD);
    const autoBackupEnabled = localStorage.getItem(BACKUP_KEYS.AUTO_BACKUP_ENABLED) !== 'false';
    const rawFreq = localStorage.getItem(BACKUP_KEYS.FREQUENCY_DAYS);
    const frequencyDays = rawFreq ? Math.max(1, parseInt(rawFreq, 10)) : 7;
    const isDismissed = localStorage.getItem(BACKUP_KEYS.REMINDER_DISMISSED) === 'true';

    let lastSnapshotIso: string | null = null;
    const snapshot = getAutoSnapshot();
    if (snapshot) {
      lastSnapshotIso = snapshot.exportedAt;
    }

    if (!autoBackupEnabled) {
      return {
        lastDownloadIso,
        lastSnapshotIso,
        frequencyDays,
        isReminderDue: false,
        autoBackupEnabled: false,
        daysSinceLastDownload: null,
      };
    }

    if (!lastDownloadIso) {
      return {
        lastDownloadIso: null,
        lastSnapshotIso,
        frequencyDays,
        isReminderDue: !isDismissed,
        autoBackupEnabled: true,
        daysSinceLastDownload: null,
      };
    }

    const lastDate = new Date(lastDownloadIso).getTime();
    const now = Date.now();
    const diffMs = now - lastDate;
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const isReminderDue = !isDismissed && daysSince >= frequencyDays;

    return {
      lastDownloadIso,
      lastSnapshotIso,
      frequencyDays,
      isReminderDue,
      autoBackupEnabled: true,
      daysSinceLastDownload: daysSince,
    };
  } catch {
    return {
      lastDownloadIso: null,
      lastSnapshotIso: null,
      frequencyDays: 7,
      isReminderDue: false,
      autoBackupEnabled: true,
      daysSinceLastDownload: null,
    };
  }
}

/**
 * Updates the user's preferred backup frequency in days
 */
export function setBackupFrequencyDays(days: number): void {
  try {
    localStorage.setItem(BACKUP_KEYS.FREQUENCY_DAYS, String(days));
  } catch {
    // ignore
  }
}

/**
 * Toggles whether automatic periodic backup checks and snapshots are active
 */
export function setAutoBackupEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BACKUP_KEYS.AUTO_BACKUP_ENABLED, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Dismisses the periodic backup download reminder for the current session/period
 */
export function dismissBackupReminder(): void {
  try {
    localStorage.setItem(BACKUP_KEYS.REMINDER_DISMISSED, 'true');
  } catch {
    // ignore
  }
}

/**
 * Formats an ISO string to a human-friendly Brazilian date and time
 */
export function formatBackupDate(isoString: string | null): string {
  if (!isoString) return 'Nenhum backup baixado ainda';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return 'Data desconhecida';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return 'Data desconhecida';
  }
}
