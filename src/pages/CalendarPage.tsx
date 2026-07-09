import { useEffect, useState } from "react";
import Header from "../components/Header";
import type { DailyIntake, Medication } from "../types/medication";
import { getMedicationEndDate, getMedicationStartDate } from "../types/medication";
import { generateDailyIntakesForDate } from "../lib/db";
import { getWeekDays, isDateInRange, toISODate } from "../lib/dates";

interface CalendarPageProps {
  medications: Medication[];
  refreshKey: number;
}

export default function CalendarPage({ medications, refreshKey }: CalendarPageProps) {
  const [selectedDate, setSelectedDate] = useState(toISODate());
  const [weekIntakes, setWeekIntakes] = useState<Record<string, DailyIntake[]>>({});
  const week = getWeekDays(selectedDate);

  useEffect(() => {
    Promise.all(week.map((day) => generateDailyIntakesForDate(day.iso))).then((results) => {
      setWeekIntakes(Object.fromEntries(week.map((day, index) => [day.iso, results[index]])));
    });
  }, [refreshKey, selectedDate]);

  const medicationRows = medications.filter((medication) =>
    week.some((day) => medication.isActive && isDateInRange(day.iso, getMedicationStartDate(medication), getMedicationEndDate(medication)))
  );

  return (
    <>
      <Header title="Календарь" action={<div className="h-10 w-10" />} />
      <main className="space-y-4 px-5 pb-28">
        <section className="grid grid-cols-7 gap-1 rounded-[20px] bg-white p-3 shadow-card dark:bg-white/8">
          {week.map((day) => {
            const active = day.iso === selectedDate;
            return (
              <button
                key={day.iso}
                onClick={() => setSelectedDate(day.iso)}
                className={`rounded-2xl py-2 text-center ${active ? "bg-app-green text-white" : "text-app-text dark:text-white"}`}
              >
                <div className="text-xs font-bold capitalize">{day.weekday}</div>
                <div className="text-base font-extrabold">{day.day}</div>
              </button>
            );
          })}
        </section>
        <section className="overflow-x-auto rounded-[20px] bg-white p-2 shadow-card dark:bg-white/8">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="text-app-muted dark:text-white/60">
                <th className="px-2 py-3 text-left font-extrabold">Препарат</th>
                {week.map((day) => (
                  <th key={day.iso} className="px-2 py-3 text-center font-extrabold capitalize">
                    {day.weekday}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicationRows.map((medication) => (
                <tr key={medication.id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="max-w-[130px] truncate px-2 py-3 font-extrabold text-app-text dark:text-white">{medication.name}</td>
                  {week.map((day) => (
                    <td key={day.iso} className="px-2 py-3 text-center">
                      <DayMark medication={medication} date={day.iso} intakes={weekIntakes[day.iso] || []} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-4 gap-2 px-2 py-3 text-xs font-bold text-app-muted dark:text-white/60">
            <span>✓ принято</span>
            <span>○ не отмечено</span>
            <span>! пропущено</span>
            <span>- не назначено</span>
          </div>
        </section>
      </main>
    </>
  );
}

function DayMark({ medication, date, intakes }: { medication: Medication; date: string; intakes: DailyIntake[] }) {
  if (!isDateInRange(date, getMedicationStartDate(medication), getMedicationEndDate(medication))) return <span className="text-app-muted">-</span>;
  const own = intakes.filter((intake) => intake.medicationId === medication.id);
  if (own.length === 0) return <span className="text-app-muted">○</span>;
  if (own.some((intake) => intake.status === "missed")) return <span className="font-black text-app-warning">!</span>;
  if (own.every((intake) => intake.status === "taken")) return <span className="font-black text-app-green">✓</span>;
  return <span className="text-app-muted">○</span>;
}
