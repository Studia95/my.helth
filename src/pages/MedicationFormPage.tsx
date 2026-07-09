import { Camera, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { MealTimingCode, Medication, MedicationForm } from "../types/medication";
import {
  createMealTiming,
  getMedicationEndDate,
  getMedicationStartDate,
  getMedicationTimes,
  legacyTimingToMealTiming,
  mealTimingLabels,
  medicationFormLabels
} from "../types/medication";
import { addDays, addMonths, toISODate } from "../lib/dates";

interface MedicationFormPageProps {
  medication?: Medication;
  onSave: (medication: Omit<Medication, "id" | "createdAt" | "updatedAt"> | Medication) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export default function MedicationFormPage({ medication, onSave, onCancel, onDelete }: MedicationFormPageProps) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState<MedicationForm>("tablet");
  const [instructions, setInstructions] = useState("1 раз в день");
  const [timing, setTiming] = useState<MealTimingCode>("right_after_food");
  const [times, setTimes] = useState(["08:30"]);
  const [startDate, setStartDate] = useState(toISODate());
  const [endDate, setEndDate] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    if (!medication) return;
    setName(medication.name);
    setDosage(medication.dosage);
    setForm(medication.form);
    setInstructions(medication.instructions?.join("\n") || "1 раз в день");
    setTiming(medication.mealTiming?.code || (medication.timing ? legacyTimingToMealTiming[medication.timing] : "right_after_food"));
    setTimes(getMedicationTimes(medication).length ? getMedicationTimes(medication) : ["08:30"]);
    setStartDate(getMedicationStartDate(medication) || toISODate());
    setEndDate(getMedicationEndDate(medication) || "");
    setPhoto(medication.photo);
  }, [medication]);

  const handlePhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!name.trim() || !dosage.trim() || times.length === 0) return;
    const payload = {
      ...(medication || {}),
      name: name.trim(),
      dosage: dosage.trim(),
      form,
      aliases: medication?.aliases || [],
      quantityPerDose: medication?.quantityPerDose || 1,
      unit: medication?.unit || defaultUnit(form),
      schedule: {
        type: medication?.schedule?.type || "daily",
        times: times.filter(Boolean).sort(),
        repeatEveryDays: medication?.schedule?.repeatEveryDays || 1
      },
      mealTiming: createMealTiming(timing),
      course: {
        startDate,
        durationDays: medication?.course?.durationDays ?? null,
        endDate: endDate || null,
        label: endDate ? `${startDate} - ${endDate}` : "Без окончания"
      },
      instructions: instructions
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      reminders: medication?.reminders || {
        enabled: true,
        notifyBeforeMinutes: 0,
        repeatIfNotTakenMinutes: 15
      },
      warnings: medication?.warnings || [],
      needsDoctorClarification: medication?.needsDoctorClarification,
      isActive: medication?.isActive ?? true,
      photo
    };
    onSave(payload as Medication | Omit<Medication, "id" | "createdAt" | "updatedAt">);
  };

  const setDuration = (kind: "7" | "14" | "21" | "1m" | "3m" | "none") => {
    if (kind === "none") {
      setEndDate("");
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    if (kind === "1m") setEndDate(toISODate(addMonths(start, 1)));
    else if (kind === "3m") setEndDate(toISODate(addMonths(start, 3)));
    else setEndDate(toISODate(addDays(start, Number(kind) - 1)));
  };

  return (
    <>
      <header className="flex items-center justify-between px-5 pb-4 pt-5">
        <button onClick={onCancel} className="grid h-10 w-10 place-items-center rounded-full text-app-text hover:bg-black/5 dark:text-white">
          <X size={23} />
        </button>
        <h1 className="text-lg font-extrabold text-app-text dark:text-white">{medication ? "Редактировать" : "Добавить лекарство"}</h1>
        <button onClick={save} className="text-sm font-extrabold text-app-green">
          Сохранить
        </button>
      </header>
      <main className="space-y-4 px-5 pb-28">
        <section className="grid grid-cols-[92px_1fr] gap-4 rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
          <label className="flex flex-col items-center gap-2 text-center text-xs font-bold text-app-muted">
            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-app-warning via-pink-500 to-app-blue text-white">
              {photo ? <img src={photo} className="h-full w-full object-cover" alt="" /> : <Camera size={32} />}
            </span>
            Добавить фото
            <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
          </label>
          <div className="space-y-3">
            <Field label="Название">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Клостилбегит" className="input" />
            </Field>
            <Field label="Дозировка">
              <input value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="50 мг" className="input" />
            </Field>
            <Field label="Форма">
              <select value={form} onChange={(event) => setForm(event.target.value as MedicationForm)} className="input">
                {Object.entries(medicationFormLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>
        <section className="space-y-4 rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
          <Field label="Как принимать">
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="1 раз в день"
              className="input min-h-20 resize-none"
            />
          </Field>
          <Field label="Условие приёма">
            <select value={timing} onChange={(event) => setTiming(event.target.value as MealTimingCode)} className="input">
              {Object.entries(mealTimingLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <div className="mb-2 text-sm font-bold text-app-text dark:text-white">Время приёма</div>
            <div className="flex flex-wrap gap-2">
              {times.map((time, index) => (
                <div key={`${time}-${index}`} className="flex items-center gap-1 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/10">
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTimes(times.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                    className="bg-transparent text-sm font-bold outline-none dark:text-white"
                  />
                  <button onClick={() => setTimes(times.filter((_, itemIndex) => itemIndex !== index))} className="text-app-muted">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button onClick={() => setTimes([...times, "08:00"])} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-app-green">
                <Plus size={18} /> Добавить время
              </button>
            </div>
          </div>
        </section>
        <section className="space-y-4 rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата начала">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="input" />
            </Field>
            <Field label="Дата окончания">
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["7", "7 дней"],
              ["14", "14 дней"],
              ["21", "21 день"],
              ["1m", "1 месяц"],
              ["3m", "3 месяца"],
              ["none", "Без окончания"]
            ].map(([value, label]) => (
              <button key={value} onClick={() => setDuration(value as Parameters<typeof setDuration>[0])} className="rounded-2xl bg-slate-50 px-2 py-2 text-xs font-bold text-app-text dark:bg-white/10 dark:text-white">
                {label}
              </button>
            ))}
          </div>
        </section>
        <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-100">
          Приложение не заменяет врача. Все дозировки и длительность курса должны соответствовать назначению специалиста.
        </div>
        {medication && onDelete ? (
          <button onClick={() => onDelete(medication.id)} className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-red-50 px-4 py-4 font-extrabold text-app-danger dark:bg-red-400/10">
            <Trash2 size={20} /> Удалить препарат
          </button>
        ) : null}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-app-text dark:text-white">{label}</span>
      {children}
    </label>
  );
}

function defaultUnit(form: MedicationForm) {
  if (form === "capsule") return "капсула";
  if (form === "stick") return "стик";
  if (form === "drops") return "капли";
  if (form === "syrup") return "мл";
  if (form === "injection") return "инъекция";
  return "таблетка";
}
