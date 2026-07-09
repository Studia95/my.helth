import { Check, Clock3, RotateCcw } from "lucide-react";
import type { DailyIntake, Medication } from "../types/medication";
import { getMealTimingLabel } from "../types/medication";

interface IntakeCardProps {
  intake: DailyIntake;
  medication?: Medication;
  onToggle: (intake: DailyIntake) => void;
  onOpen: (medicationId: string) => void;
}

export default function IntakeCard({ intake, medication, onToggle, onOpen }: IntakeCardProps) {
  if (!medication) return null;

  const isTaken = intake.status === "taken";
  const isMissed = intake.status === "missed";

  return (
    <article className="grid grid-cols-[72px_1fr_44px] items-center gap-3 rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
      <button onClick={() => onOpen(medication.id)} className="text-left">
        <div className="text-xl font-extrabold text-app-text dark:text-white">{intake.time}</div>
        <div className={`mt-1 text-xs font-semibold ${isMissed ? "text-app-danger" : "text-app-muted dark:text-white/60"}`}>
          {isMissed ? "пропущено" : getMealTimingLabel(medication)}
        </div>
      </button>
      <button onClick={() => onOpen(medication.id)} className="min-w-0 border-l border-slate-100 pl-4 text-left dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-app-green dark:bg-white/10">
            <PillIcon form={medication.form} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-app-text dark:text-white">{medication.name}</h3>
            <p className="truncate text-sm font-medium text-app-muted dark:text-white/60">{medication.dosage}</p>
          </div>
        </div>
      </button>
      <button
        onClick={() => onToggle(intake)}
        className={`grid h-11 w-11 place-items-center rounded-full text-white shadow-sm ${
          isTaken ? "bg-app-green" : isMissed ? "bg-app-warning" : "bg-slate-200 text-app-muted dark:bg-white/15"
        }`}
        aria-label={isTaken ? "Снять отметку" : "Отметить как принято"}
      >
        {isTaken ? <Check size={23} strokeWidth={3} /> : isMissed ? <RotateCcw size={20} /> : <Clock3 size={20} />}
      </button>
    </article>
  );
}

function PillIcon({ form }: { form: Medication["form"] }) {
  const label = form === "capsule" ? "●" : form === "stick" ? "▱" : form === "drops" ? "滴" : "●";
  return <span className="text-xl font-black">{label}</span>;
}
