import { AlertTriangle } from 'lucide-react';

interface AdminErrorStateProps {
  error: unknown;
  title?: string;
}

/**
 * Visual error state shown when an admin query fails.
 * Prevents silent fallback to empty arrays which masked real
 * permission / network problems (see audit P0.6-A).
 */
export const AdminErrorState = ({ error, title = 'Falha ao carregar dados' }: AdminErrorStateProps) => {
  const message =
    (error as any)?.message ??
    (typeof error === 'string' ? error : 'Erro desconhecido ao consultar o banco.');
  const code = (error as any)?.code;
  const hint = (error as any)?.hint;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-destructive">{title}</p>
        <p className="text-xs text-destructive/80 mt-1 break-words">{message}</p>
        {(code || hint) && (
          <p className="text-[11px] text-destructive/60 mt-2 font-mono break-words">
            {code ? `code: ${code}` : null}
            {code && hint ? ' · ' : null}
            {hint ? `hint: ${hint}` : null}
          </p>
        )}
      </div>
    </div>
  );
};