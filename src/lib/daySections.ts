import type { DailyIntake } from "../types/medication";

export type DaySectionId = "morning" | "day" | "evening";

export interface DaySectionMeta {
  id: DaySectionId;
  title: string;
  completeLabel: string;
  rangeLabel: string;
}

export const daySectionOrder: DaySectionId[] = ["morning", "day", "evening"];

export const daySectionMeta: Record<DaySectionId, DaySectionMeta> = {
  morning: {
    id: "morning",
    title: "УТРО",
    completeLabel: "Утренний приём завершён",
    rangeLabel: "с 07:00 до 12:00"
  },
  day: {
    id: "day",
    title: "ДЕНЬ",
    completeLabel: "Дневной приём завершён",
    rangeLabel: "с 12:00 до 18:00"
  },
  evening: {
    id: "evening",
    title: "ВЕЧЕР / НОЧЬ",
    completeLabel: "Вечерний приём завершён",
    rangeLabel: "с 18:00 до 00:00"
  }
};

export const getDaySection = (time: string): DaySectionId => {
  const [hours] = time.split(":").map(Number);
  if (hours >= 7 && hours < 12) return "morning";
  if (hours >= 12 && hours < 18) return "day";
  return "evening";
};

export const groupIntakesByDaySection = (intakes: DailyIntake[]) =>
  daySectionOrder
    .map((id) => ({
      meta: daySectionMeta[id],
      intakes: intakes.filter((intake) => getDaySection(intake.time) === id)
    }))
    .filter((section) => section.intakes.length > 0);

export const getCurrentDaySection = (date = new Date()): DaySectionId => {
  const hours = date.getHours();
  if (hours >= 7 && hours < 12) return "morning";
  if (hours >= 12 && hours < 18) return "day";
  return "evening";
};

export const getPluralIntakes = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} приём`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} приёма`;
  return `${count} приёмов`;
};
