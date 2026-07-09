import { Check, Clock3, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DailyIntake, Medication } from "../types/medication";
import { getMealTimingLabel, getMedicationWorkflow } from "../types/medication";

interface IntakeCardProps {
  intake: DailyIntake;
  medication?: Medication;
  isActive: boolean;
  tone?: "plain" | "morning" | "day" | "evening";
  onToggle: (intake: DailyIntake) => void;
  onTimerElapsed: (intake: DailyIntake) => void;
  onOpen: (medicationId: string) => void;
}

export default function IntakeCard(props: IntakeCardProps) {
  if (!props.medication) return null;
  return <InteractiveIntakeCard {...props} medication={props.medication} />;
}

function InteractiveIntakeCard({
  intake,
  medication,
  isActive,
  tone = "plain",
  onToggle,
  onTimerElapsed,
  onOpen
}: IntakeCardProps & { medication: Medication }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const isTaken = intake.status === "taken";
  const isMissed = intake.status === "missed";
  const step = intake.workflowStep || "take";
  const isFinished = step === "finish";
  const timerEndsAt = intake.workflowStepEndsAt ? new Date(intake.workflowStepEndsAt).getTime() : undefined;
  const timerStartedAt = intake.workflowStepStartedAt ? new Date(intake.workflowStepStartedAt).getTime() : undefined;
  const remainingMs = timerEndsAt ? timerEndsAt - now : undefined;
  const isTimerRunning = remainingMs !== undefined;
  const isTimerExpired = remainingMs !== undefined && remainingMs <= 0;
  const isOverdue = remainingMs !== undefined && remainingMs < -60 * 60 * 1000;
  const isAlmostDue = remainingMs !== undefined && remainingMs > 0 && remainingMs <= 60 * 1000;
  const canAct = isActive || isFinished;
  const showWorkflowPanel = isActive && !isFinished && (isMissed || !isTaken || step !== "take");
  const workflow = getMedicationWorkflow(medication);
  const totalMs = timerEndsAt && timerStartedAt ? Math.max(timerEndsAt - timerStartedAt, 1) : 1;
  const progress = timerEndsAt ? Math.min(100, Math.max(0, ((totalMs - Math.max(remainingMs || 0, 0)) / totalMs) * 100)) : 0;
  const ui = getWorkflowUi({ intake, medication, now, remainingMs, isActive });
  const toneUi = getToneUi(tone);

  useEffect(() => {
    if (!isActive || !timerEndsAt || !isTimerExpired || intake.timerNotifiedAt) return;
    navigator.vibrate?.([120, 80, 120]);
    showTimerNotification(medication, step);
    onTimerElapsed(intake);
  }, [intake, intake.timerNotifiedAt, isActive, isTimerExpired, medication, onTimerElapsed, step, timerEndsAt]);

  return (
    <article
      className={`rounded-[20px] p-4 shadow-card transition-all ${toneUi.card} ${
        isActive && !isFinished ? "scale-[1.01] ring-2 ring-app-green/20" : ""
      } ${isOverdue ? "bg-red-50 ring-2 ring-red-200 dark:bg-red-400/10 dark:ring-red-300/25" : ""} ${
        isAlmostDue ? "animate-pulse bg-emerald-50 dark:bg-emerald-400/10" : ""
      }`}
    >
      <div className="grid grid-cols-[72px_1fr_44px] items-center gap-3">
        <button onClick={() => onOpen(medication.id)} className="text-left">
          <div className={`text-xl font-extrabold ${toneUi.text}`}>{intake.time}</div>
          <div className={`mt-1 text-xs font-semibold ${isMissed ? "text-app-danger" : toneUi.muted}`}>
            {isMissed ? "пропущено" : getMealTimingLabel(medication)}
          </div>
        </button>
        <button onClick={() => onOpen(medication.id)} className={`min-w-0 border-l pl-4 text-left ${toneUi.divider}`}>
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneUi.pill}`}>
              <PillIcon form={medication.form} />
            </div>
            <div className="min-w-0">
              <h3 className={`truncate text-base font-extrabold ${toneUi.text}`}>{medication.name}</h3>
              <p className={`truncate text-sm font-medium ${toneUi.muted}`}>{medication.dosage}</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => canAct && onToggle(intake)}
          disabled={!canAct}
          className={`grid h-11 w-11 place-items-center rounded-full text-white shadow-sm ${
            isFinished || isTaken ? "bg-app-green" : isMissed ? "bg-app-warning" : isActive ? "bg-app-green" : "bg-slate-200 text-app-muted dark:bg-white/15"
          } ${!canAct ? "opacity-70" : ""}`}
          aria-label={ui.actionLabel}
        >
          {isFinished || isTaken ? <Check size={23} strokeWidth={3} /> : isMissed ? <RotateCcw size={20} /> : isActive ? <Play size={20} fill="currentColor" /> : <Clock3 size={20} />}
        </button>
      </div>

      {showWorkflowPanel ? (
        <div className={`mt-4 rounded-2xl border p-3 ${isOverdue ? "border-red-200 bg-white/70 dark:border-red-300/20 dark:bg-white/5" : "border-emerald-100 bg-white/70 dark:border-emerald-300/20 dark:bg-white/5"}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              {intake.takenAt ? <div className="text-xs font-extrabold text-app-green">Принято в {formatClock(intake.takenAt)}</div> : null}
              <div className={`mt-1 text-sm font-bold ${isOverdue ? "text-app-danger" : "text-app-muted dark:text-white/65"}`}>{ui.title}</div>
              <div className={`mt-1 text-4xl font-black tabular-nums ${isOverdue ? "text-app-danger" : "text-app-green"}`}>
                {ui.timerText}
              </div>
              <div className="mt-1 text-sm font-semibold text-app-muted dark:text-white/60">{ui.subtitle}</div>
            </div>
            {isTimerRunning ? <CircularTimer progress={progress} minutes={workflow.beforeFoodTimer || workflow.afterMealTimer || 0} overdue={isOverdue} /> : null}
          </div>
          <button
            onClick={() => !ui.waiting && onToggle(intake)}
            disabled={ui.waiting}
            className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
              isOverdue ? "bg-app-danger text-white" : isTimerExpired || !ui.waiting ? "bg-app-green text-white" : "border border-app-green text-app-green"
            } ${ui.waiting ? "opacity-80" : ""}`}
          >
            {ui.actionLabel}
          </button>
        </div>
      ) : null}

      {isFinished ? (
        <div className={`mt-3 flex items-center justify-between border-t pt-3 text-sm ${toneUi.divider}`}>
          <span className="font-bold text-app-green">✓ Выполнено</span>
          <span className={`font-semibold ${toneUi.muted}`}>{intake.workflowFinishedAt ? formatClock(intake.workflowFinishedAt) : ""}</span>
        </div>
      ) : null}
    </article>
  );
}

function getToneUi(tone: NonNullable<IntakeCardProps["tone"]>) {
  if (tone === "day") {
    return {
      card: "bg-[#FFF9E8]",
      text: "text-app-text",
      muted: "text-app-muted",
      divider: "border-amber-200/70",
      pill: "bg-amber-100 text-amber-600"
    };
  }
  if (tone === "evening") {
    return {
      card: "bg-[#1C2745]",
      text: "text-white",
      muted: "text-white/68",
      divider: "border-white/10",
      pill: "bg-sky-300/15 text-sky-300"
    };
  }
  return {
    card: "bg-white dark:bg-white/8",
    text: "text-app-text dark:text-white",
    muted: "text-app-muted dark:text-white/60",
    divider: "border-slate-100 dark:border-white/10",
    pill: "bg-emerald-50 text-app-green dark:bg-white/10"
  };
}

function PillIcon({ form }: { form: Medication["form"] }) {
  const label = form === "capsule" ? "●" : form === "stick" ? "▱" : form === "drops" ? "滴" : "●";
  return <span className="text-xl font-black">{label}</span>;
}

function CircularTimer({ progress, minutes, overdue }: { progress: number; minutes: number; overdue: boolean }) {
  const color = overdue ? "#ef4444" : "#18b873";
  return (
    <div
      className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${progress}%, #e5e7eb ${progress}% 100%)` }}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#101916]">
        <span className="text-lg font-black leading-4 text-app-text dark:text-white">{minutes}</span>
        <span className="text-[10px] font-bold uppercase text-app-muted">мин</span>
      </div>
    </div>
  );
}

function getWorkflowUi({
  intake,
  medication,
  now,
  remainingMs,
  isActive
}: {
  intake: DailyIntake;
  medication: Medication;
  now: number;
  remainingMs?: number;
  isActive: boolean;
}) {
  const step = intake.workflowStep || "take";
  const expired = remainingMs !== undefined && remainingMs <= 0;
  const overdue = remainingMs !== undefined && remainingMs < -60 * 60 * 1000;
  const isMissed = intake.status === "missed";

  if (overdue) {
    return {
      title: "Следующий этап просрочен",
      timerText: formatDuration(Math.abs(remainingMs || 0)),
      subtitle: "Можно выполнить этап сейчас",
      actionLabel: "Выполнить сейчас",
      waiting: false
    };
  }

  if (step === "wait_before_food") {
    return {
      title: expired ? "Можно есть" : "До еды осталось",
      timerText: expired ? "00:00" : formatDuration(remainingMs || 0),
      subtitle: expired ? `${medication.name} уже успел подействовать` : "Ожидаем перед едой",
      actionLabel: expired ? "Я поел" : "Таймер идёт",
      waiting: !expired
    };
  }

  if (step === "eat") {
    return {
      title: "Во время еды",
      timerText: "сейчас",
      subtitle: "Примите препарат вместе с едой",
      actionLabel: "✓ Выполнено",
      waiting: false
    };
  }

  if (step === "wait_after_food" && intake.workflowStepEndsAt) {
    return {
      title: expired ? `Пора принять ${medication.name}` : `До приёма ${medication.name}`,
      timerText: expired ? "00:00" : formatDuration(remainingMs || 0),
      subtitle: expired ? "Таймер после еды завершён" : "Ждём после еды",
      actionLabel: expired ? "✓ Принял" : "Таймер идёт",
      waiting: !expired
    };
  }

  if (step === "wait_after_food") {
    return {
      title: isMissed ? "Пропущено, начните с еды" : "Ждём окончания еды",
      timerText: "еда",
      subtitle: "После еды запустим таймер до препарата",
      actionLabel: "Я закончил есть",
      waiting: false
    };
  }

  if (step === "take_after_food") {
    return {
      title: `Пора принять ${medication.name}`,
      timerText: "сейчас",
      subtitle: getMealTimingLabel(medication),
      actionLabel: "✓ Принял",
      waiting: false
    };
  }

  return {
    title: isMissed ? "Пропущено, можно выполнить сейчас" : isActive ? "Активный приём" : "Ожидает очереди",
    timerText: formatClock(new Date(now).toISOString()),
    subtitle: getMealTimingLabel(medication),
    actionLabel: isMissed ? "Принять сейчас" : "✓ Принял",
    waiting: false
  };
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function showTimerNotification(medication: Medication, step: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const title = step === "wait_after_food" ? `Пора принять ${medication.name}` : "Можно есть";
  const body = step === "wait_after_food" ? getMealTimingLabel(medication) : `${medication.name} уже успел подействовать.`;
  new Notification(title, { body, tag: `workflow-${medication.id}` });
}
