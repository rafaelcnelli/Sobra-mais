import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado na aplicação.',
    };
  }

  render() {
    if (this.state.hasError) {
      let parsedError: { error?: string; operationType?: string; path?: string } | null = null;
      try {
        parsedError = JSON.parse(this.state.errorMessage);
      } catch {
        parsedError = null;
      }

      return (
        <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#080B12] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#111624] border border-slate-200 dark:border-[#1E273C] rounded-3xl p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold font-display">Falha na Operação de Dados</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              {parsedError?.error
                ? `Ocorreu um erro ao sincronizar com o banco de dados (${parsedError.operationType ?? 'operação'} em ${parsedError.path ?? 'caminho'}): ${parsedError.error}`
                : this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1456FF] rounded-full hover:bg-[#0D44D9] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
