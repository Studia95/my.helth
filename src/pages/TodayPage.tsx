import { CheckCircle2, ChevronDown, ChevronRight, Moon, Sun, Sunrise } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import IntakeCard from "../components/IntakeCard";
import ProgressCard from "../components/ProgressCard";
import EmptyState from "../components/EmptyState";
import type { DailyIntake, Medication } from "../types/medication";
import { formatLongDate } from "../lib/dates";
import {
  type DaySectionId,
  daySectionOrder,
  getCurrentDaySection,
  getPluralIntakes,
  groupIntakesByDaySection
} from "../lib/daySections";

interface TodayPageProps {
  date: string;
  intakes: DailyIntake[];
  medications: Medication[];
  notificationsEnabled: boolean;
  groupIntakesByDaySection: boolean;
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
  groupIntakesByDaySection: shouldGroupIntakes,
  onToggle,
  onTimerElapsed,
  onOpenMedication,
  onOpenSettings,
  onBellClick
}: TodayPageProps) {
  const medicationMap = new Map(medications.map((medication) => [medication.id, medication]));
  const taken = intakes.filter((intake) => intake.status === "taken").length;
  const activeIntake = intakes.find((intake) => intake.workflowStep !== "finish");
  const sections = useMemo(() => groupIntakesByDaySection(intakes), [intakes]);
  const activeSectionId = useMemo(() => getActiveSectionId(sections), [sections]);
  const [collapsedSections, setCollapsedSections] = useState<Record<DaySectionId, boolean>>(() => loadCollapsedSections());

  useEffect(() => {
    if (!activeSectionId) return;
    setCollapsedSections((current) => {
      if (!current[activeSectionId]) return current;
      const next = { ...current, [activeSectionId]: false };
      saveCollapsedSections(next);
      return next;
    });
  }, [activeSectionId]);

  const toggleSection = (id: DaySectionId) => {
    setCollapsedSections((current) => {
      const next = { ...current, [id]: !current[id] };
      saveCollapsedSections(next);
      return next;
    });
  };

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
        ) : shouldGroupIntakes ? (
          <div className="space-y-3">
            {sections.map((section) => {
              const completed = section.intakes.filter((intake) => intake.status === "taken").length;
              const isComplete = completed === section.intakes.length;
              const isActive = activeSectionId === section.meta.id;
              return (
                <DayIntakeSection
                  key={section.meta.id}
                  id={section.meta.id}
                  title={section.meta.title}
                  completeLabel={section.meta.completeLabel}
                  rangeLabel={section.meta.rangeLabel}
                  completed={completed}
                  total={section.intakes.length}
                  collapsed={collapsedSections[section.meta.id]}
                  isComplete={isComplete}
                  isActive={isActive}
                  onToggle={() => toggleSection(section.meta.id)}
                >
                  {section.intakes.map((intake) => (
                    <IntakeCard
                      key={intake.id}
                      intake={intake}
                      medication={medicationMap.get(intake.medicationId)}
                      isActive={activeIntake?.id === intake.id}
                      tone={section.meta.id}
                      onToggle={onToggle}
                      onTimerElapsed={onTimerElapsed}
                      onOpen={onOpenMedication}
                    />
                  ))}
                </DayIntakeSection>
              );
            })}
          </div>
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

function DayIntakeSection({
  id,
  title,
  completeLabel,
  rangeLabel,
  completed,
  total,
  collapsed,
  isComplete,
  isActive,
  onToggle,
  children
}: {
  id: DaySectionId;
  title: string;
  completeLabel: string;
  rangeLabel: string;
  completed: number;
  total: number;
  collapsed: boolean;
  isComplete: boolean;
  isActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const ui = getSectionUi(id);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      className={`overflow-hidden rounded-[20px] border p-4 shadow-card transition-all duration-300 ease-in-out ${ui.section} ${
        isComplete ? "border-app-green" : ui.border
      } ${isActive ? "ring-2 ring-app-green/15" : "opacity-75"}`}
    >
      {isActive ? <div className={`mb-2 text-xs font-extrabold uppercase tracking-wide ${ui.activeText}`}>Сейчас активен</div> : null}
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 text-left" aria-expanded={!collapsed}>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${ui.iconBg}`}>{ui.icon}</div>
        <div className="min-w-0 flex-1">
          <div className={`text-lg font-black ${ui.titleText}`}>{title}</div>
          <div className={`text-sm font-bold ${ui.mutedText}`}>
            {rangeLabel} · {getPluralIntakes(total)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className={`rounded-full px-3 py-1 text-sm font-extrabold ${ui.badge}`}>
            {completed} из {total}
          </div>
          <div
            className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${ui.progress}`}
            style={{ background: `conic-gradient(${ui.progressColor} ${progress}%, ${ui.progressTrack} ${progress}% 100%)` }}
            aria-label={`${progress}%`}
          >
            <span className={ui.progressText}>{progress}%</span>
          </div>
          <span className={ui.chevron}>{collapsed ? <ChevronRight size={21} /> : <ChevronDown size={21} />}</span>
        </div>
      </button>
      {isComplete ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-app-green/25 bg-emerald-50 px-3 py-2 text-sm font-extrabold text-app-green">
          <CheckCircle2 size={18} />
          <span>✓ {completeLabel}</span>
        </div>
      ) : null}
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="mt-4 space-y-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

function getSectionUi(id: DaySectionId) {
  if (id === "day") {
    return {
      section: "bg-[#FFF9E8]",
      border: "border-amber-200",
      titleText: "text-amber-700",
      mutedText: "text-amber-700/75",
      activeText: "text-amber-700",
      iconBg: "bg-amber-100 text-amber-500",
      icon: <Sun size={28} fill="currentColor" />,
      badge: "bg-white/70 text-amber-700",
      progress: "text-amber-700",
      progressText: "rounded-full bg-[#FFF9E8] px-1 text-[10px]",
      progressColor: "#F59E0B",
      progressTrack: "rgba(245,158,11,0.16)",
      chevron: "text-amber-700"
    };
  }
  if (id === "evening") {
    return {
      section: "bg-[#1C2745]",
      border: "border-blue-300/20",
      titleText: "text-sky-200",
      mutedText: "text-white/78",
      activeText: "text-sky-200",
      iconBg: "bg-sky-300/15 text-yellow-200",
      icon: <Moon size={27} fill="currentColor" />,
      badge: "bg-white/10 text-sky-100",
      progress: "text-sky-100",
      progressText: "rounded-full bg-[#1C2745] px-1 text-[10px]",
      progressColor: "#60A5FA",
      progressTrack: "rgba(255,255,255,0.16)",
      chevron: "text-sky-100"
    };
  }
  return {
    section: "bg-white",
    border: "border-slate-100",
    titleText: "text-emerald-900",
    mutedText: "text-app-muted",
    activeText: "text-app-green",
    iconBg: "bg-emerald-50 text-app-green",
    icon: <Sunrise size={29} />,
    badge: "bg-emerald-50 text-app-green",
    progress: "text-app-green",
    progressText: "rounded-full bg-white px-1 text-[10px]",
    progressColor: "#23B26D",
    progressTrack: "rgba(35,178,109,0.16)",
    chevron: "text-app-green"
  };
}

function getActiveSectionId(sections: ReturnType<typeof groupIntakesByDaySection>) {
  if (sections.length === 0) return undefined;
  const current = getCurrentDaySection();
  const incompleteIds = new Set(
    sections
      .filter((section) => section.intakes.some((intake) => intake.status !== "taken"))
      .map((section) => section.meta.id)
  );
  const visibleIds = new Set(sections.map((section) => section.meta.id));
  const currentIndex = daySectionOrder.indexOf(current);
  const orderedFromNow = [...daySectionOrder.slice(currentIndex), ...daySectionOrder.slice(0, currentIndex)];
  return orderedFromNow.find((id) => incompleteIds.has(id)) || (visibleIds.has(current) ? current : sections[0].meta.id);
}

const collapsedStorageKey = "my-helth-day-sections-collapsed";

function loadCollapsedSections(): Record<DaySectionId, boolean> {
  const fallback = { morning: false, day: false, evening: false };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(collapsedStorageKey) || "{}") as Partial<Record<DaySectionId, boolean>>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveCollapsedSections(value: Record<DaySectionId, boolean>) {
  window.localStorage.setItem(collapsedStorageKey, JSON.stringify(value));
}
