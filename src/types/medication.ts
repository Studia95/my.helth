export type MedicationForm =
  | "tablet"
  | "capsule"
  | "stick"
  | "drops"
  | "syrup"
  | "injection"
  | "other";

export type IntakeTiming =
  | "before_food"
  | "with_food"
  | "after_food"
  | "after_30_min"
  | "after_1_5_hour"
  | "before_sleep"
  | "anytime";

export type DailyIntakeStatus = "pending" | "taken" | "missed";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  instructions?: string;
  timing: IntakeTiming;
  times: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  photo?: string;
  createdAt: string;
  updatedAt: string;
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
