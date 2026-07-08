import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="grid place-items-center rounded-[20px] bg-white px-5 py-10 text-center shadow-card dark:bg-white/8">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-app-green dark:bg-white/10">
        <PlusCircle size={28} />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-app-text dark:text-white">{title}</h3>
      {text ? <p className="mt-2 max-w-xs text-sm leading-6 text-app-muted dark:text-white/65">{text}</p> : null}
      {actionLabel ? (
        <button onClick={onAction} className="mt-5 rounded-full bg-app-green px-5 py-3 text-sm font-bold text-white">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
