import { ChevronRight, MoreVertical } from "lucide-react";
import type { Medication } from "../types/medication";
import { formatShortDate } from "../lib/dates";

interface MedicationCardProps {
  medication: Medication;
  onOpen: (id: string) => void;
  onMenu?: (id: string) => void;
}

export default function MedicationCard({ medication, onOpen, onMenu }: MedicationCardProps) {
  return (
    <article className="grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
      <button onClick={() => onOpen(medication.id)} className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-emerald-50 text-app-green dark:bg-white/10">
        {medication.photo ? <img src={medication.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl font-black">●</span>}
      </button>
      <button onClick={() => onOpen(medication.id)} className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-lg font-extrabold text-app-text dark:text-white">{medication.name}</h3>
          {!medication.isActive ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-app-muted dark:bg-white/10">
              завершено
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm font-semibold text-app-muted dark:text-white/60">
          {medication.dosage} • {medication.times.length} {medication.times.length === 1 ? "раз" : "раза"} в день
        </p>
        <p className="mt-1 text-sm text-app-muted dark:text-white/55">
          {formatShortDate(medication.startDate)} — {formatShortDate(medication.endDate)}
        </p>
      </button>
      <div className="flex items-center gap-1">
        {onMenu ? (
          <button onClick={() => onMenu(medication.id)} className="grid h-9 w-9 place-items-center rounded-full text-app-muted hover:bg-slate-100 dark:hover:bg-white/10">
            <MoreVertical size={20} />
          </button>
        ) : null}
        <button onClick={() => onOpen(medication.id)} className="grid h-9 w-9 place-items-center rounded-full text-app-text dark:text-white">
          <ChevronRight size={21} />
        </button>
      </div>
    </article>
  );
}
