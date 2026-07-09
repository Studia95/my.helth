import type { MealTimingCode, Medication, MedicationForm } from "../types/medication";
import { createMealTiming } from "../types/medication";
import { addDays, addMonths, toISODate } from "./dates";

interface SeedItem {
  name: string;
  dosage: string;
  form: MedicationForm;
  times: string[];
  mealTiming: MealTimingCode;
  instructions?: string;
  quantityPerDose?: number;
  unit?: string;
  needsDoctorClarification?: boolean;
  days?: number;
  months?: number;
}

const seedItems: SeedItem[] = [
  {
    name: "Пантопразол",
    dosage: "20 мг, 1 таблетка",
    form: "tablet",
    times: ["07:30", "19:00"],
    mealTiming: "before_food_30_min",
    instructions: "За 30 минут до еды",
    days: 21
  },
  {
    name: "Итоприд",
    dosage: "50 мг, 1 таблетка",
    form: "tablet",
    times: ["07:40", "12:40", "19:10"],
    mealTiming: "before_food_20_min",
    instructions: "За 20 минут до еды",
    days: 21
  },
  {
    name: "ФортеДетрим",
    dosage: "4000 МЕ, 1 капсула",
    form: "capsule",
    times: ["08:00"],
    mealTiming: "with_food",
    months: 3
  },
  {
    name: "Бестфертил",
    dosage: "2 капсулы",
    form: "capsule",
    times: ["08:00", "20:00"],
    mealTiming: "with_food",
    quantityPerDose: 2,
    unit: "капсулы"
  },
  {
    name: "Ребамипид",
    dosage: "100 мг, 1 таблетка",
    form: "tablet",
    times: ["08:30", "13:30", "20:30"],
    mealTiming: "after_food_30_min",
    instructions: "Ребагит",
    days: 56
  },
  {
    name: "Маалокс",
    dosage: "1 ст/л",
    form: "syrup",
    times: ["09:30", "14:30", "21:30"],
    mealTiming: "after_food_1_5_hour",
    unit: "столовая ложка",
    days: 7
  },
  {
    name: "Трентал",
    dosage: "1 таблетка",
    form: "tablet",
    times: ["08:30"],
    mealTiming: "right_after_food",
    instructions: "По назначению врача"
  },
  {
    name: "Клостилбегит",
    dosage: "1 таблетка",
    form: "tablet",
    times: ["08:30"],
    mealTiming: "ask_doctor",
    instructions: "По назначению врача",
    needsDoctorClarification: true
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
      aliases: [],
      dosage: item.dosage,
      form: item.form,
      quantityPerDose: item.quantityPerDose || 1,
      unit: item.unit || (item.form === "stick" ? "стик" : item.form === "capsule" ? "капсула" : "таблетка"),
      schedule: {
        type: "daily",
        times: item.times,
        repeatEveryDays: 1
      },
      mealTiming: createMealTiming(item.mealTiming),
      course: {
        startDate: toISODate(start),
        durationDays: item.days || null,
        endDate: endDate || null,
        label: item.days ? `${item.days} дней` : item.months ? `${item.months} мес.` : "Без окончания"
      },
      instructions: item.instructions ? [item.instructions] : [],
      reminders: {
        enabled: true,
        notifyBeforeMinutes: 0,
        repeatIfNotTakenMinutes: 15
      },
      warnings: [],
      needsDoctorClarification: item.needsDoctorClarification,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  });
};
