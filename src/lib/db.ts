import { openDB, type DBSchema } from "idb";
import type { DailyIntake, DailyIntakeStatus, Medication } from "../types/medication";
import { defaultSettings, type UserSettings } from "../types/settings";
import { hasTimePassedByHours, isDateInRange } from "./dates";
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
  const item: Medication = {
    ...medication,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  await db.put("medications", item);
  return item;
};

export const updateMedication = async (medication: Medication) => {
  const db = await dbPromise;
  const item = { ...medication, updatedAt: new Date().toISOString() };
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
  return medications.sort((a, b) => a.name.localeCompare(b.name, "ru"));
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

export const generateDailyIntakesForDate = async (date: string) => {
  const db = await dbPromise;
  const medications = (await db.getAll("medications")).filter(
    (medication) => medication.isActive && isDateInRange(date, medication.startDate, medication.endDate)
  );
  const existing = await getDailyIntakesByDate(date);
  const existingIds = new Set(existing.map((intake) => intake.id));

  const created: DailyIntake[] = [];
  for (const medication of medications) {
    for (const time of medication.times) {
      const id = `${medication.id}-${date}-${time}`;
      if (!existingIds.has(id)) {
        created.push({
          id,
          medicationId: medication.id,
          date,
          time,
          status: hasTimePassedByHours(date, time, 2) ? "missed" : "pending"
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
