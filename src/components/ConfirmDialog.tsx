interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "Продолжить",
  danger,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-soft dark:bg-[#16221e]">
        <h3 className="text-lg font-extrabold text-app-text dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-app-muted dark:text-white/65">{text}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="rounded-2xl bg-slate-100 px-4 py-3 font-bold text-app-text dark:bg-white/10 dark:text-white">
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-2xl px-4 py-3 font-bold text-white ${danger ? "bg-app-danger" : "bg-app-green"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
