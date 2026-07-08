import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import ConfirmDialog from "../components/ConfirmDialog";
import CalendarPage from "../pages/CalendarPage";
import MedicationFormPage from "../pages/MedicationFormPage";
import MedicationsPage from "../pages/MedicationsPage";
import SettingsPage from "../pages/SettingsPage";
import StatsPage from "../pages/StatsPage";
import TodayPage from "../pages/TodayPage";
import type { AppPage } from "./routes";
import type { DailyIntake, Medication } from "../types/medication";
import { defaultSettings, type UserSettings } from "../types/settings";
import {
  addMedication,
  clearAllData,
  deleteMedication,
  generateDailyIntakesForDate,
  getDailyIntakesByDate,
  getMedications,
  getSettings,
  initDatabase,
  updateDailyIntakeStatus,
  updateMedication,
  updateSettings
} from "../lib/db";
import { toISODate } from "../lib/dates";
import { downloadBackup, importBackupFile } from "../lib/exportImport";
import { notificationWarning, requestNotificationPermission, scheduleTodayNotifications } from "../lib/notifications";

type ConfirmState =
  | { type: "delete"; id: string }
  | { type: "clear" }
  | { type: "import"; file: File }
  | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function App() {
  const today = toISODate();
  const [page, setPage] = useState<AppPage>("today");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [intakes, setIntakes] = useState<DailyIntake[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const editingMedication = useMemo(
    () => medications.find((medication) => medication.id === editingId),
    [editingId, medications]
  );

  const load = async () => {
    await initDatabase();
    const [nextMedications, nextIntakes, nextSettings] = await Promise.all([
      getMedications(),
      generateDailyIntakesForDate(today),
      getSettings()
    ]);
    setMedications(nextMedications);
    setIntakes(nextIntakes);
    setSettings(nextSettings);
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  useEffect(() => {
    scheduleTodayNotifications(intakes, medications, settings);
  }, [intakes, medications, settings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const intakeId = params.get("intake");
    if (action === "taken" && intakeId) {
      updateDailyIntakeStatus(intakeId, "taken").then(() => {
        getDailyIntakesByDate(today).then(setIntakes);
        window.history.replaceState({}, "", import.meta.env.BASE_URL);
      });
    }
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const navigate = (nextPage: AppPage) => {
    setEditingId(undefined);
    setPage(nextPage);
  };

  const openForm = (id?: string) => {
    setEditingId(id);
    setPage("form");
  };

  const handleToggleIntake = async (intake: DailyIntake) => {
    await updateDailyIntakeStatus(intake.id, intake.status === "taken" ? "pending" : "taken");
    setIntakes(await getDailyIntakesByDate(today));
    setRefreshKey((key) => key + 1);
  };

  const handleSaveMedication = async (medication: Medication | Omit<Medication, "id" | "createdAt" | "updatedAt">) => {
    if ("id" in medication) await updateMedication(medication);
    else await addMedication(medication);
    await load();
    navigate("medications");
    flash("Лекарство сохранено");
  };

  const handleDelete = async (id: string) => {
    setConfirm({ type: "delete", id });
  };

  const confirmAction = async () => {
    if (!confirm) return;
    if (confirm.type === "delete") {
      await deleteMedication(confirm.id);
      await load();
      navigate("medications");
      flash("Лекарство удалено");
    }
    if (confirm.type === "clear") {
      await clearAllData();
      await load();
      navigate("today");
      flash("Данные очищены");
    }
    if (confirm.type === "import") {
      await importBackupFile(confirm.file);
      await load();
      navigate("today");
      flash("Данные импортированы");
    }
    setConfirm(null);
  };

  const handleToggleActive = async (medication: Medication) => {
    await updateMedication({ ...medication, isActive: !medication.isActive });
    await load();
  };

  const handleSettings = async (nextSettings: UserSettings) => {
    await updateSettings(nextSettings);
    setSettings(nextSettings);
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    const enabled = permission === "granted";
    await handleSettings({ ...settings, notificationsEnabled: enabled });
    flash(enabled ? "Уведомления включены" : notificationWarning);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const activeNav = page === "settings" ? "stats" : page;

  return (
    <div className="min-h-screen text-app-text dark:text-white">
      <div className="app-scrollbar relative mx-auto min-h-screen max-w-[480px] overflow-hidden bg-app-bg shadow-[0_0_60px_rgba(16,35,28,0.10)] dark:bg-[#101916]">
        {page === "today" ? (
          <TodayPage
            date={today}
            intakes={intakes}
            medications={medications}
            notificationsEnabled={settings.notificationsEnabled}
            onToggle={handleToggleIntake}
            onOpenMedication={openForm}
            onOpenSettings={() => navigate("settings")}
            onBellClick={enableNotifications}
          />
        ) : null}
        {page === "medications" ? (
          <MedicationsPage
            medications={medications}
            onAdd={() => openForm()}
            onOpen={openForm}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        ) : null}
        {page === "form" ? (
          <MedicationFormPage
            medication={editingMedication}
            onSave={handleSaveMedication}
            onCancel={() => navigate(editingId ? "medications" : "today")}
            onDelete={editingMedication ? handleDelete : undefined}
          />
        ) : null}
        {page === "calendar" ? <CalendarPage medications={medications} refreshKey={refreshKey} /> : null}
        {page === "stats" ? (
          <div>
            <button
              onClick={() => navigate("settings")}
              className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full text-app-text hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              aria-label="Настройки"
            >
              <Settings size={22} />
            </button>
            <StatsPage medications={medications} refreshKey={refreshKey} />
          </div>
        ) : null}
        {page === "settings" ? (
          <SettingsPage
            settings={settings}
            onChange={handleSettings}
            onExport={() => downloadBackup().then(() => flash("Резервная копия сохранена"))}
            onImport={(file) => setConfirm({ type: "import", file })}
            onClear={() => setConfirm({ type: "clear" })}
          />
        ) : null}
        {installPrompt && page === "settings" ? (
          <button
            onClick={handleInstall}
            className="fixed bottom-24 left-1/2 z-20 w-[calc(100%-2.5rem)] max-w-[440px] -translate-x-1/2 rounded-[20px] bg-app-text px-4 py-3 text-sm font-extrabold text-white shadow-soft dark:bg-white dark:text-app-text"
          >
            Добавить my.helth на экран Домой
          </button>
        ) : null}
        {notice ? (
          <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2.5rem)] max-w-[440px] -translate-x-1/2 rounded-[20px] bg-app-text px-4 py-3 text-center text-sm font-extrabold text-white shadow-soft dark:bg-white dark:text-app-text">
            {notice}
          </div>
        ) : null}
        {page !== "form" ? <BottomNav active={activeNav} onNavigate={navigate} onAdd={() => openForm()} /> : null}
        <ConfirmDialog
          open={!!confirm}
          title={confirm?.type === "import" ? "Импорт данных" : confirm?.type === "clear" ? "Очистить данные" : "Удалить лекарство"}
          text={
            confirm?.type === "import"
              ? "Импорт заменит текущие данные. Продолжить?"
              : confirm?.type === "clear"
                ? "Все локальные данные будут удалены и начальная схема будет создана заново."
                : "Лекарство и связанные отметки будут удалены."
          }
          confirmLabel={confirm?.type === "import" ? "Импортировать" : confirm?.type === "clear" ? "Очистить" : "Удалить"}
          danger={confirm?.type !== "import"}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmAction}
        />
      </div>
    </div>
  );
}
