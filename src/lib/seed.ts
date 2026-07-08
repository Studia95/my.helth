import type { IntakeTiming, Medication, MedicationForm } from "../types/medication";
import { addDays, addMonths, toISODate } from "./dates";

interface SeedItem {
  name: string;
  dosage: string;
  form: MedicationForm;
  times: string[];
  timing: IntakeTiming;
  instructions?: string;
  days?: number;
  months?: number;
}

const seedItems: SeedItem[] = [
  {
    name: "Пантопразол",
    dosage: "20 мг, 1 таблетка",
    form: "tablet",
    times: ["07:30", "19:00"],
    timing: "before_food",
    instructions: "За 30 минут до еды",
    days: 21
  },
  {
    name: "Итоприд",
    dosage: "50 мг, 1 таблетка",
    form: "tablet",
    times: ["07:40", "12:40", "19:10"],
    timing: "before_food",
    instructions: "За 20 минут до еды",
    days: 21
  },
  {
    name: "ФортеДетрим",
    dosage: "4000 МЕ, 1 капсула",
    form: "capsule",
    times: ["08:00"],
    timing: "with_food",
    months: 3
  },
  {
    name: "Бестфертил",
    dosage: "2 капсулы",
    form: "capsule",
    times: ["08:00", "22:00"],
    timing: "after_food"
  },
  {
    name: "Ребамипид",
    dosage: "100 мг, 1 таблетка",
    form: "tablet",
    times: ["08:30", "13:30", "20:30"],
    timing: "after_30_min",
    instructions: "Ребагит",
    days: 56
  },
  {
    name: "Маалокс",
    dosage: "1 стик",
    form: "stick",
    times: ["09:30", "14:30", "21:30"],
    timing: "after_1_5_hour",
    days: 7
  },
  {
    name: "Трентал",
    dosage: "1 таблетка",
    form: "tablet",
    times: ["08:30"],
    timing: "after_food",
    instructions: "По назначению врача"
  },
  {
    name: "Клостилбегит",
    dosage: "1 таблетка",
    form: "tablet",
    times: ["08:30"],
    timing: "after_food",
    instructions: "По назначению врача"
  }
];

export const createSeedMedications = (): Medication[] => {
  const now = new Date().toISOString();
  const start = new Date();

  return seedItems.map((item) => {
    const id = crypto.randomUUID();
    const endDate = item.days
      ? toISODate(addDays(start, item.days - 1))
      : item.months
        ? toISODate(addMonths(start, item.months))
        : undefined;

    return {
      id,
      name: item.name,
      dosage: item.dosage,
      form: item.form,
      timing: item.timing,
      times: item.times,
      instructions: item.instructions,
      startDate: toISODate(start),
      endDate,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  });
};
