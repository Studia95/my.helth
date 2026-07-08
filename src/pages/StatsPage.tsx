import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import type { DailyIntake, Medication } from "../types/medication";
import { generateDailyIntakesForDate } from "../lib/db";
import { getWeekDays, toISODate } from "../lib/dates";

interface StatsPageProps {
  medications: Medication[];
  refreshKey: number;
}

export default function StatsPage({ medications, refreshKey }: StatsPageProps) {
  const [weekIntakes, setWeekIntakes] = useState<Record<string, DailyIntake[]>>({});
  const week = useMemo(() => getWeekDays(toISODate()), []);

  useEffect(() => {
    Promise.all(week.map((day) => generateDailyIntakesForDate(day.iso))).then((results) => {
      setWeekIntakes(Object.fromEntries(week.map((day, index) => [day.iso, results[index]])));
    });
  }, [refreshKey, week]);

  const all = Object.values(weekIntakes).flat();
  const taken = all.filter((intake) => intake.status === "taken").length;
  const missed = all.filter((intake) => intake.status === "missed").length;
  const percent = all.length ? Math.round((taken / all.length) * 100) : 0;
  const activeCount = medications.filter((medication) => medication.isActive).length;

  const bars = week.map((day) => {
    const intakes = weekIntakes[day.iso] || [];
    const dayTaken = intakes.filter((intake) => intake.status === "taken").length;
    return {
      label: day.weekday,
      percent: intakes.length ? Math.round((dayTaken / intakes.length) * 100) : 0
    };
  });

  return (
    <>
      <Header title="Статистика" action={<div className="h-10 w-10" />} />
      <main className="space-y-4 px-5 pb-28">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-app-muted dark:text-white/60">Период</span>
          <button className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-extrabold text-app-green">
            Неделя <ChevronDown size={16} />
          </button>
        </div>
        <section className="grid grid-cols-2 gap-3">
          <StatCard title="Приёмов" value={`${percent}%`} caption="успешно" />
          <StatCard title="Лекарств" value={`${activeCount}`} caption="активных" accent="blue" />
          <StatCard title="Пропущено" value={`${missed}`} caption="за неделю" accent="warning" wide />
        </section>
        <section className="rounded-[20px] bg-white p-5 shadow-card dark:bg-white/8">
          <h2 className="text-base font-extrabold text-app-text dark:text-white">Динамика приёма</h2>
          <div className="mt-5 grid h-48 grid-cols-7 items-end gap-3">
            {bars.map((bar) => (
              <div key={bar.label} className="flex h-full flex-col items-center justify-end gap-2">
                <div className="flex h-36 w-full items-end rounded-full bg-emerald-50 px-1 dark:bg-white/10">
                  <div className="w-full rounded-full bg-app-green" style={{ height: `${Math.max(bar.percent, 4)}%` }} />
                </div>
                <span className="text-xs font-bold capitalize text-app-muted dark:text-white/60">{bar.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function StatCard({
  title,
  value,
  caption,
  accent = "green",
  wide
}: {
  title: string;
  value: string;
  caption: string;
  accent?: "green" | "blue" | "warning";
  wide?: boolean;
}) {
  const color = accent === "blue" ? "text-app-blue" : accent === "warning" ? "text-app-warning" : "text-app-text dark:text-white";
  return (
    <article className={`rounded-[20px] bg-white p-5 shadow-card dark:bg-white/8 ${wide ? "col-span-2" : ""}`}>
      <h3 className="text-sm font-bold text-app-text dark:text-white">{title}</h3>
      <div className={`mt-2 text-4xl font-black ${color}`}>{value}</div>
      <p className="mt-1 text-sm font-bold text-app-muted dark:text-white/60">{caption}</p>
    </article>
  );
}
