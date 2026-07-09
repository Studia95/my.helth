import Header from "../components/Header";
import IntakeCard from "../components/IntakeCard";
import ProgressCard from "../components/ProgressCard";
import EmptyState from "../components/EmptyState";
import type { DailyIntake, Medication } from "../types/medication";
import { formatLongDate } from "../lib/dates";

interface TodayPageProps {
  date: string;
  intakes: DailyIntake[];
  medications: Medication[];
  notificationsEnabled: boolean;
  onToggle: (intake: DailyIntake) => void;
  onTimerElapsed: (intake: DailyIntake) => void;
  onOpenMedication: (id: string) => void;
  onOpenSettings: () => void;
  onBellClick: () => void;
}

export default function TodayPage({
  date,
  intakes,
  medications,
  notificationsEnabled,
  onToggle,
  onTimerElapsed,
  onOpenMedication,
  onOpenSettings,
  onBellClick
}: TodayPageProps) {
  const medicationMap = new Map(medications.map((medication) => [medication.id, medication]));
  const taken = intakes.filter((intake) => intake.status === "taken").length;
  const activeIntake = intakes.find((intake) => intake.workflowStep !== "finish");

  return (
    <>
      <Header title="Сегодня" subtitle={formatLongDate(date)} onBellClick={onBellClick} />
      <main className="space-y-4 px-5 pb-28">
        <ProgressCard taken={taken} total={intakes.length} />
        {!notificationsEnabled ? (
          <button
            onClick={onOpenSettings}
            className="w-full rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100"
          >
            Уведомления отключены. Включите их в настройках.
          </button>
        ) : null}
        {intakes.length === 0 ? (
          <EmptyState title="На сегодня приёмов нет" />
        ) : (
          <div className="space-y-3">
            {intakes.map((intake) => (
              <IntakeCard
                key={intake.id}
                intake={intake}
                medication={medicationMap.get(intake.medicationId)}
                isActive={activeIntake?.id === intake.id}
                onToggle={onToggle}
                onTimerElapsed={onTimerElapsed}
                onOpen={onOpenMedication}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
