import { openDB, type DBSchema } from "idb";
import type {
  DailyIntake,
  DailyIntakeStatus,
  MealTimingCode,
  Medication,
  MedicationForm,
  MyHelthImportFile
} from "../types/medication";
import {
  createMealTiming,
  getInitialWorkflowStep,
  getMedicationEndDate,
  getMedicationStartDate,
  getMedicationTimes,
  getMedicationWorkflow,
  legacyTimingToMealTiming
} from "../types/medication";
import { defaultSettings, type UserSettings } from "../types/settings";
import { addDays, hasTimePassedByHours, isDateInRange, parseISODate, toISODate } from "./dates";
import { createSeedMedications } from "./seed";

interface MyHelthDB extends DBSchema {
  medications: {
    key: string;
    value: Medication;
  };
  dailyIntakes: {
    key: string;
    value: DailyIntake;
    indexes: { "by-date": string; "by-medication-date": [string, string] };
  };
  settings: {
    key: string;
    value: UserSettings & { id: string };
  };
  meta: {
    key: string;
    value: { id: string; value: string };
  };
}

const dbPromise = openDB<MyHelthDB>("my-helth-db", 1, {
  upgrade(db) {
    db.createObjectStore("medications", { keyPath: "id" });

    const intakeStore = db.createObjectStore("dailyIntakes", { keyPath: "id" });
    intakeStore.createIndex("by-date", "date");
    intakeStore.createIndex("by-medication-date", ["medicationId", "date"]);

    db.createObjectStore("settings", { keyPath: "id" });
    db.createObjectStore("meta", { keyPath: "id" });
  }
});

export const initDatabase = async () => {
  const db = await dbPromise;
  const seeded = await db.get("meta", "seeded");
  const settings = await db.get("settings", "user");

  if (!settings) {
    await db.put("settings", { ...defaultSettings, id: "user" });
  }

  if (!seeded) {
    const tx = db.transaction(["medications", "meta"], "readwrite");
    await Promise.all(createSeedMedications().map((medication) => tx.objectStore("medications").put(medication)));
    await tx.objectStore("meta").put({ id: "seeded", value: new Date().toISOString() });
    await tx.done;
  }
};

export const addMedication = async (medication: Omit<Medication, "id" | "createdAt" | "updatedAt">) => {
  const db = await dbPromise;
  const now = new Date().toISOString();
  const item = normalizeMedication({
    ...medication,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  });
  await db.put("medications", item);
  return item;
};

export const updateMedication = async (medication: Medication) => {
  const db = await dbPromise;
  const item = normalizeMedication({ ...medication, updatedAt: new Date().toISOString() });
  await db.put("medications", item);
  return item;
};

export const deleteMedication = async (id: string) => {
  const db = await dbPromise;
  const tx = db.transaction(["medications", "dailyIntakes"], "readwrite");
  await tx.objectStore("medications").delete(id);
  const intakes = await tx.objectStore("dailyIntakes").index("by-medication-date").getAll(IDBKeyRange.bound([id, ""], [id, "\uffff"]));
  await Promise.all(intakes.map((intake) => tx.objectStore("dailyIntakes").delete(intake.id)));
  await tx.done;
};

export const getMedications = async () => {
  const db = await dbPromise;
  const medications = await db.getAll("medications");
  const normalized = medications.map(normalizeMedication);
  return normalized.sort((a, b) => a.name.localeCompare(b.name, "ru"));
};

export const getMedicationById = async (id: string) => {
  const db = await dbPromise;
  return db.get("medications", id);
};

export const saveDailyIntake = async (intake: DailyIntake) => {
  const db = await dbPromise;
  await db.put("dailyIntakes", intake);
  return intake;
};

export const getDailyIntakesByDate = async (date: string) => {
  const db = await dbPromise;
  const intakes = await db.getAllFromIndex("dailyIntakes", "by-date", date);
  return intakes.sort((a, b) => a.time.localeCompare(b.time));
};

export const updateDailyIntakeStatus = async (id: string, status: DailyIntakeStatus) => {
  const db = await dbPromise;
  const intake = await db.get("dailyIntakes", id);
  if (!intake) return undefined;
  const updated: DailyIntake = {
    ...intake,
    status,
    takenAt: status === "taken" ? new Date().toISOString() : undefined
  };
  await db.put("dailyIntakes", updated);
  return updated;
};

export type IntakeWorkflowAction = "primary";

export const advanceDailyIntakeWorkflow = async (intakeId: string, medication: Medication) => {
  const db = await dbPromise;
  const intake = await db.get("dailyIntakes", intakeId);
  if (!intake) return undefined;

  const now = new Date();
  const nowIso = now.toISOString();
  const workflow = getMedicationWorkflow(medication);
  const currentStep = intake.workflowStep || getInitialWorkflowStep(medication);
  let next: DailyIntake = {
    ...intake,
    workflowStartedAt: intake.workflowStartedAt || nowIso,
    workflowStepStartedAt: nowIso
  };

  if (currentStep === "take" && workflow.beforeFoodTimer) {
    next = {
      ...next,
      status: "taken",
      takenAt: intake.takenAt || nowIso,
      workflowStep: "wait_before_food",
      workflowStepEndsAt: addMinutes(now, workflow.beforeFoodTimer).toISOString(),
      timerNotifiedAt: undefined
    };
  } else if (currentStep === "wait_before_food") {
    next = {
      ...next,
      workflowStep: "finish",
      workflowStepEndsAt: undefined,
      workflowFinishedAt: nowIso
    };
  } else if (currentStep === "eat") {
    next = {
      ...next,
      status: "taken",
      takenAt: intake.takenAt || nowIso,
      workflowStep: "finish",
      workflowStepEndsAt: undefined,
      workflowFinishedAt: nowIso
    };
  } else if (currentStep === "wait_after_food") {
    if (intake.workflowStepEndsAt) {
      next = {
        ...next,
        status: "taken",
        takenAt: intake.takenAt || nowIso,
        workflowStep: "finish",
        workflowStepEndsAt: undefined,
        workflowFinishedAt: nowIso
      };
    } else {
      const minutes = workflow.afterMealTimer || 0;
      next = {
        ...next,
        status: minutes > 0 ? "pending" : "taken",
        takenAt: minutes > 0 ? undefined : nowIso,
        workflowStep: minutes > 0 ? "wait_after_food" : "finish",
        workflowStepEndsAt: minutes > 0 ? addMinutes(now, minutes).toISOString() : undefined,
        workflowFinishedAt: minutes > 0 ? undefined : nowIso,
        timerNotifiedAt: undefined
      };
    }
  } else if (currentStep === "take_after_food") {
    next = {
      ...next,
      status: "taken",
      takenAt: intake.takenAt || nowIso,
      workflowStep: "finish",
      workflowStepEndsAt: undefined,
      workflowFinishedAt: nowIso
    };
  } else {
    next = {
      ...next,
      status: "taken",
      takenAt: intake.takenAt || nowIso,
      workflowStep: "finish",
      workflowStepEndsAt: undefined,
      workflowFinishedAt: nowIso
    };
  }

  await db.put("dailyIntakes", next);
  return next;
};

export const markDailyIntakeTimerNotified = async (intakeId: string) => {
  const db = await dbPromise;
  const intake = await db.get("dailyIntakes", intakeId);
  if (!intake) return undefined;
  const updated = { ...intake, timerNotifiedAt: new Date().toISOString() };
  await db.put("dailyIntakes", updated);
  return updated;
};

export const generateDailyIntakesForDate = async (date: string) => {
  const db = await dbPromise;
  const medications = (await db.getAll("medications")).filter(
    (medication) => medication.isActive && isMedicationScheduledForDate(normalizeMedication(medication), date)
  );
  const existing = await getDailyIntakesByDate(date);
  const existingIds = new Set(existing.map((intake) => intake.id));

  const created: DailyIntake[] = [];
  for (const rawMedication of medications) {
    const medication = normalizeMedication(rawMedication);
    for (const time of getMedicationTimes(medication)) {
      const id = `${medication.id}-${date}-${time}`;
      if (!existingIds.has(id)) {
        created.push({
          id,
          medicationId: medication.id,
          date,
          time,
          status: hasTimePassedByHours(date, time, 2) ? "missed" : "pending",
          workflowStep: getInitialWorkflowStep(medication)
        });
      }
    }
  }

  if (created.length > 0) {
    const tx = db.transaction("dailyIntakes", "readwrite");
    await Promise.all(created.map((intake) => tx.store.put(intake)));
    await tx.done;
  }

  await refreshMissedIntakes(date);
  return getDailyIntakesByDate(date);
};

export const refreshMissedIntakes = async (date: string) => {
  const db = await dbPromise;
  const intakes = await getDailyIntakesByDate(date);
  const updates = intakes
    .filter((intake) => intake.status === "pending" && hasTimePassedByHours(date, intake.time, 2))
    .map((intake) => ({ ...intake, status: "missed" as DailyIntakeStatus }));

  if (updates.length > 0) {
    const tx = db.transaction("dailyIntakes", "readwrite");
    await Promise.all(updates.map((intake) => tx.store.put(intake)));
    await tx.done;
  }
};

export const getSettings = async (): Promise<UserSettings> => {
  const db = await dbPromise;
  const settings = await db.get("settings", "user");
  if (!settings) {
    await db.put("settings", { ...defaultSettings, id: "user" });
    return defaultSettings;
  }
  const { id: _id, ...rest } = settings;
  return rest;
};

export const updateSettings = async (settings: UserSettings) => {
  const db = await dbPromise;
  await db.put("settings", { ...settings, id: "user" });
  return settings;
};

export const exportAllData = async () => {
  const db = await dbPromise;
  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    medications: await db.getAll("medications"),
    dailyIntakes: await db.getAll("dailyIntakes"),
    settings: await getSettings()
  };
};

export const importAllData = async (data: unknown) => {
  if (!data || typeof data !== "object") {
    throw new Error("Некорректный файл резервной копии");
  }
  const candidate = data as {
    medications?: Medication[];
    dailyIntakes?: DailyIntake[];
    settings?: UserSettings;
  };
  if (!Array.isArray(candidate.medications) || !Array.isArray(candidate.dailyIntakes) || !candidate.settings) {
    throw new Error("В файле нет нужных разделов данных");
  }

  const db = await dbPromise;
  const tx = db.transaction(["medications", "dailyIntakes", "settings", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("medications").clear(),
    tx.objectStore("dailyIntakes").clear(),
    tx.objectStore("settings").clear()
  ]);
  await Promise.all(candidate.medications.map((medication) => tx.objectStore("medications").put(medication)));
  await Promise.all(candidate.dailyIntakes.map((intake) => tx.objectStore("dailyIntakes").put(intake)));
  await tx.objectStore("settings").put({ ...defaultSettings, ...candidate.settings, id: "user" });
  await tx.objectStore("meta").put({ id: "seeded", value: new Date().toISOString() });
  await tx.done;
};

export interface ImportMedicationResult {
  added: number;
  updated: number;
  skipped: number;
}

export const importMedicationFileData = async (data: unknown, today = toISODate()): Promise<ImportMedicationResult> => {
  const file = assertMedicationImportFile(data);
  const overwriteExistingByName = file.settings?.overwriteExistingByName ?? false;
  const repeatIfNotTakenMinutes = file.settings?.defaultRepeatReminderMinutes ?? 15;
  const now = new Date().toISOString();
  const db = await dbPromise;
  const existing = await db.getAll("medications");
  const byName = new Map(existing.map((medication) => [normalizeName(medication.name), normalizeMedication(medication)]));
  const result: ImportMedicationResult = { added: 0, updated: 0, skipped: 0 };
  const touchedIds: string[] = [];

  const tx = db.transaction(["medications", "dailyIntakes", "meta"], "readwrite");
  for (const rawMedication of file.medications) {
    const imported = normalizeMedication(rawMedication, repeatIfNotTakenMinutes);
    const match = byName.get(normalizeName(imported.name));

    if (match && !overwriteExistingByName) {
      result.skipped += 1;
      continue;
    }

    const item: Medication = match
      ? normalizeMedication({
          ...imported,
          id: match.id,
          createdAt: match.createdAt,
          updatedAt: now,
          photo: imported.photo || match.photo
        })
      : normalizeMedication({
          ...imported,
          id: imported.id || crypto.randomUUID(),
          createdAt: imported.createdAt || now,
          updatedAt: now
        });

    await tx.objectStore("medications").put(item);
    touchedIds.push(item.id);
    byName.set(normalizeName(item.name), item);
    if (match) result.updated += 1;
    else result.added += 1;
  }

  const todayIntakes = await tx.objectStore("dailyIntakes").index("by-date").getAll(today);
  await Promise.all(
    todayIntakes
      .filter((intake) => touchedIds.includes(intake.medicationId))
      .map((intake) => tx.objectStore("dailyIntakes").delete(intake.id))
  );
  await tx.objectStore("meta").put({ id: "seeded", value: now });
  await tx.done;

  await generateDailyIntakesForDate(today);
  return result;
};

export const clearAllData = async () => {
  const db = await dbPromise;
  const tx = db.transaction(["medications", "dailyIntakes", "settings", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("medications").clear(),
    tx.objectStore("dailyIntakes").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("meta").clear()
  ]);
  await tx.done;
  await initDatabase();
};

const medicationForms: MedicationForm[] = ["tablet", "capsule", "stick", "drops", "syrup", "injection", "other"];
const mealTimingCodes: MealTimingCode[] = [
  "before_food_30_min",
  "before_food_20_min",
  "with_food",
  "right_after_food",
  "after_food_30_min",
  "after_food_1_5_hour",
  "before_sleep",
  "anytime",
  "ask_doctor"
];

const normalizeName = (value: string) => value.trim().toLocaleLowerCase("ru");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isValidTime = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const isValidDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const assertMedicationImportFile = (data: unknown): MyHelthImportFile => {
  if (!isPlainObject(data) || data.schema !== "my.helth.import") {
    throw new Error("Некорректный файл импорта: schema должен быть my.helth.import");
  }
  if (!Array.isArray(data.medications)) {
    throw new Error("Некорректный файл импорта: нет массива medications");
  }
  data.medications.forEach((medication, index) => validateImportMedication(medication, index));
  return data as unknown as MyHelthImportFile;
};

const validateImportMedication = (value: unknown, index: number) => {
  const prefix = `Препарат ${index + 1}`;
  if (!isPlainObject(value)) throw new Error(`${prefix}: запись должна быть объектом`);
  if (typeof value.name !== "string" || !value.name.trim()) throw new Error(`${prefix}: нет названия`);
  if (typeof value.dosage !== "string" || !value.dosage.trim()) throw new Error(`${prefix}: нет дозировки`);
  if (!medicationForms.includes(value.form as MedicationForm)) throw new Error(`${prefix}: некорректная форма препарата`);
  if (!isPlainObject(value.schedule) || !Array.isArray(value.schedule.times) || !value.schedule.times.every(isValidTime)) {
    throw new Error(`${prefix}: некорректное расписание`);
  }
  if (!isPlainObject(value.mealTiming) || !mealTimingCodes.includes(value.mealTiming.code as MealTimingCode)) {
    throw new Error(`${prefix}: некорректное условие приёма`);
  }
  if (!isPlainObject(value.course) || !isValidDate(value.course.startDate)) {
    throw new Error(`${prefix}: некорректная дата начала курса`);
  }
};

const normalizeMedication = (medication: Medication, defaultRepeatReminderMinutes = 15): Medication => {
  const legacyCode = medication.timing ? legacyTimingToMealTiming[medication.timing] : "anytime";
  const mealTimingCode = medication.mealTiming?.code || legacyCode;
  const startDate = medication.course?.startDate || medication.startDate || toISODate();
  const endDate = medication.course?.endDate || medication.endDate || courseEndFromDuration(startDate, medication.course?.durationDays);
  const times = medication.schedule?.times?.filter(isValidTime).sort() || medication.times?.filter(isValidTime).sort() || [];

  return {
    ...medication,
    aliases: Array.isArray(medication.aliases) ? medication.aliases.filter(Boolean) : [],
    quantityPerDose: Number.isFinite(medication.quantityPerDose) && medication.quantityPerDose > 0 ? medication.quantityPerDose : 1,
    unit: medication.unit || defaultUnit(medication.form),
    schedule: {
      type: medication.schedule?.type === "custom" ? "custom" : "daily",
      times,
      repeatEveryDays: Number.isFinite(medication.schedule?.repeatEveryDays) && medication.schedule.repeatEveryDays > 0
        ? medication.schedule.repeatEveryDays
        : 1
    },
    mealTiming: {
      ...createMealTiming(mealTimingCode),
      label: medication.mealTiming?.label || createMealTiming(mealTimingCode).label,
      minutesFromMeal: medication.mealTiming?.minutesFromMeal ?? createMealTiming(mealTimingCode).minutesFromMeal
    },
    course: {
      startDate,
      durationDays: medication.course?.durationDays ?? null,
      endDate: endDate || null,
      label: medication.course?.label || (endDate ? `${startDate} - ${endDate}` : "Без окончания")
    },
    instructions: normalizeStringArray(medication.instructions),
    reminders: {
      enabled: medication.reminders?.enabled ?? true,
      notifyBeforeMinutes: medication.reminders?.notifyBeforeMinutes ?? 0,
      repeatIfNotTakenMinutes: medication.reminders?.repeatIfNotTakenMinutes ?? defaultRepeatReminderMinutes
    },
    warnings: normalizeStringArray(medication.warnings),
    isActive: medication.isActive ?? true,
    createdAt: medication.createdAt || new Date().toISOString(),
    updatedAt: medication.updatedAt || new Date().toISOString()
  };
};

const normalizeStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const defaultUnit = (form: MedicationForm) => {
  if (form === "capsule") return "капсула";
  if (form === "stick") return "стик";
  if (form === "drops") return "капли";
  if (form === "syrup") return "мл";
  if (form === "injection") return "инъекция";
  return "таблетка";
};

const courseEndFromDuration = (startDate: string, durationDays?: number | null) => {
  if (!durationDays || durationDays < 1) return null;
  return toISODate(addDays(parseISODate(startDate), durationDays - 1));
};

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

const isMedicationScheduledForDate = (medication: Medication, date: string) => {
  const startDate = getMedicationStartDate(medication);
  const endDate = getMedicationEndDate(medication);
  if (!startDate || !isDateInRange(date, startDate, endDate)) return false;
  const repeatEveryDays = medication.schedule?.repeatEveryDays || 1;
  if (repeatEveryDays <= 1) return true;
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((parseISODate(date).getTime() - parseISODate(startDate).getTime()) / dayMs);
  return diffDays >= 0 && diffDays % repeatEveryDays === 0;
};
