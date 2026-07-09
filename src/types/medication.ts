export type MedicationForm =
  | "tablet"
  | "capsule"
  | "stick"
  | "drops"
  | "syrup"
  | "injection"
  | "other";

export type MealTimingCode =
  | "before_food_30_min"
  | "before_food_20_min"
  | "with_food"
  | "right_after_food"
  | "after_food_30_min"
  | "after_food_1_5_hour"
  | "before_sleep"
  | "anytime"
  | "ask_doctor";

export type IntakeTiming =
  | "before_food"
  | "with_food"
  | "after_food"
  | "after_30_min"
  | "after_1_5_hour"
  | "before_sleep"
  | "anytime";

export type DailyIntakeStatus = "pending" | "taken" | "missed";

export interface MealTiming {
  code: MealTimingCode;
  label: string;
  minutesFromMeal: number | null;
}

export interface MedicationSchedule {
  type: "daily" | "custom";
  times: string[];
  repeatEveryDays: number;
}

export interface MedicationCourse {
  startDate: string;
  durationDays?: number | null;
  endDate?: string | null;
  label: string;
}

export interface MedicationReminderSettings {
  enabled: boolean;
  notifyBeforeMinutes: number;
  repeatIfNotTakenMinutes: number;
}

export interface Medication {
  id: string;
  name: string;
  aliases?: string[];
  dosage: string;
  form: MedicationForm;
  quantityPerDose: number;
  unit: string;
  schedule: MedicationSchedule;
  mealTiming: MealTiming;
  course: MedicationCourse;
  instructions: string[];
  reminders: MedicationReminderSettings;
  warnings: string[];
  needsDoctorClarification?: boolean;
  isActive: boolean;
  photo?: string;
  createdAt: string;
  updatedAt: string;
  timing?: IntakeTiming;
  times?: string[];
  startDate?: string;
  endDate?: string;
}

export interface MyHelthImportFile {
  schema: "my.helth.import";
  version: string;
  createdAt: string;
  source?: {
    type?: string;
    doctorConclusionDate?: string;
    note?: string;
  };
  settings?: {
    generateDailyIntakes?: boolean;
    overwriteExistingByName?: boolean;
    timezone?: string;
    defaultRepeatReminderMinutes?: number;
  };
  medications: Medication[];
}

export interface DailyIntake {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  status: DailyIntakeStatus;
  takenAt?: string;
}

export const medicationFormLabels: Record<MedicationForm, string> = {
  tablet: "Таблетка",
  capsule: "Капсула",
  stick: "Стик",
  drops: "Капли",
  syrup: "Сироп",
  injection: "Укол",
  other: "Другое"
};

export const intakeTimingLabels: Record<IntakeTiming, string> = {
  before_food: "До еды",
  with_food: "Во время еды",
  after_food: "После еды",
  after_30_min: "Через 30 минут после еды",
  after_1_5_hour: "Через 1-1,5 часа после еды",
  before_sleep: "Перед сном",
  anytime: "Не важно"
};

export const mealTimingLabels: Record<MealTimingCode, string> = {
  before_food_30_min: "за 30 минут до еды",
  before_food_20_min: "за 20 минут до еды",
  with_food: "во время еды",
  right_after_food: "сразу после еды",
  after_food_30_min: "через 30 минут после еды",
  after_food_1_5_hour: "через 1-1,5 часа после еды",
  before_sleep: "перед сном",
  anytime: "не важно",
  ask_doctor: "уточнить у врача"
};

export const mealTimingMinutes: Record<MealTimingCode, number | null> = {
  before_food_30_min: -30,
  before_food_20_min: -20,
  with_food: 0,
  right_after_food: 0,
  after_food_30_min: 30,
  after_food_1_5_hour: 90,
  before_sleep: null,
  anytime: null,
  ask_doctor: null
};

export const createMealTiming = (code: MealTimingCode): MealTiming => ({
  code,
  label: mealTimingLabels[code],
  minutesFromMeal: mealTimingMinutes[code]
});

export const legacyTimingToMealTiming: Record<IntakeTiming, MealTimingCode> = {
  before_food: "before_food_30_min",
  with_food: "with_food",
  after_food: "right_after_food",
  after_30_min: "after_food_30_min",
  after_1_5_hour: "after_food_1_5_hour",
  before_sleep: "before_sleep",
  anytime: "anytime"
};

export const getMedicationTimes = (medication: Medication) => medication.schedule?.times || medication.times || [];

export const getMedicationStartDate = (medication: Medication) => medication.course?.startDate || medication.startDate || "";

export const getMedicationEndDate = (medication: Medication) => medication.course?.endDate || medication.endDate || undefined;

export const getMealTimingLabel = (medication: Medication) => {
  if (medication.mealTiming?.label) return medication.mealTiming.label;
  if (medication.timing) return mealTimingLabels[legacyTimingToMealTiming[medication.timing]];
  return mealTimingLabels.anytime;
};
