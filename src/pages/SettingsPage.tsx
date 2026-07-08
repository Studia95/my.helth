import { Bell, Cloud, Info, Moon, UserRound } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import type { UserSettings } from "../types/settings";
import { notificationWarning, requestNotificationPermission } from "../lib/notifications";

interface SettingsPageProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
}

export default function SettingsPage({ settings, onChange, onExport, onImport, onClear }: SettingsPageProps) {
  const update = (patch: Partial<UserSettings>) => onChange({ ...settings, ...patch });

  const enableNotifications = async (enabled: boolean) => {
    if (!enabled) {
      update({ notificationsEnabled: false });
      return;
    }
    const permission = await requestNotificationPermission();
    update({ notificationsEnabled: permission === "granted" });
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = "";
  };

  return (
    <>
      <header className="px-5 pb-4 pt-7 text-center">
        <h1 className="text-2xl font-extrabold text-app-text dark:text-white">Настройки</h1>
      </header>
      <main className="space-y-4 px-5 pb-28">
        <Section icon={<UserRound size={21} />} title="Профиль" subtitle="Мой профиль и данные">
          <input className="input" placeholder="Имя" value={settings.name || ""} onChange={(event) => update({ name: event.target.value })} />
          <input className="input" type="date" value={settings.birthDate || ""} onChange={(event) => update({ birthDate: event.target.value })} />
          <textarea
            className="input min-h-24 resize-none"
            placeholder="Заметки о здоровье"
            value={settings.healthNotes || ""}
            onChange={(event) => update({ healthNotes: event.target.value })}
          />
        </Section>
        <Section icon={<Bell size={21} />} title="Напоминания" subtitle="Уведомления о приёме">
          <Toggle label="Включить уведомления" checked={settings.notificationsEnabled} onChange={enableNotifications} />
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-app-text dark:text-white">Напоминать повторно</span>
            <select
              value={settings.repeatReminderMinutes}
              onChange={(event) => update({ repeatReminderMinutes: Number(event.target.value) })}
              className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold outline-none dark:bg-white/10 dark:text-white"
            >
              <option value={10}>через 10 минут</option>
              <option value={15}>через 15 минут</option>
              <option value={30}>через 30 минут</option>
            </select>
          </label>
          <Toggle label="Вибрация" checked={settings.vibrationEnabled} onChange={(value) => update({ vibrationEnabled: value })} />
          <Toggle label="Звук" checked={settings.soundEnabled} onChange={(value) => update({ soundEnabled: value })} />
          <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
            {notificationWarning}
          </p>
        </Section>
        <Section icon={<Cloud size={21} />} title="Резервная копия" subtitle="Экспорт и импорт данных">
          <button onClick={onExport} className="settings-button">Экспортировать данные</button>
          <label className="settings-button block text-center">
            Импортировать данные
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={onClear} className="settings-button text-app-danger">Очистить все данные</button>
        </Section>
        <Section icon={<Moon size={21} />} title="Тема" subtitle="Темная / Светлая">
          <Toggle label="Тёмная тема" checked={settings.theme === "dark"} onChange={(value) => update({ theme: value ? "dark" : "light" })} />
        </Section>
        <Section icon={<Info size={21} />} title="О приложении" subtitle="my.helth v1.0.0">
          <p className="text-sm font-semibold leading-6 text-app-muted dark:text-white/65">
            Приложение не заменяет врача. Все дозировки и длительность курса должны соответствовать назначению специалиста.
          </p>
        </Section>
      </main>
    </>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-app-text dark:bg-white/10 dark:text-white">{icon}</div>
        <div>
          <h2 className="text-base font-extrabold text-app-text dark:text-white">{title}</h2>
          <p className="text-sm font-semibold text-app-muted dark:text-white/55">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-app-text dark:text-white">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-8 w-14 rounded-full p-1 transition ${checked ? "bg-app-green" : "bg-slate-200 dark:bg-white/15"}`}
      >
        <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : ""}`} />
      </button>
    </label>
  );
}
