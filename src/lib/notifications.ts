import type { DailyIntake, Medication } from "../types/medication";
import type { UserSettings } from "../types/settings";
import { parseISODate } from "./dates";

let timers: number[] = [];

type NotificationActionLike = { action: string; title: string };
type ExtendedNotificationOptions = NotificationOptions & {
  actions?: NotificationActionLike[];
  vibrate?: number[];
};

export const notificationWarning =
  "На некоторых телефонах уведомления работают только после установки приложения на главный экран. Без backend точные push-уведомления при полностью закрытом браузере не гарантируются.";

export const canUseNotifications = () => "Notification" in window;

export const requestNotificationPermission = async () => {
  if (!canUseNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
};

export const clearNotificationTimers = () => {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
};

export const scheduleTodayNotifications = (
  intakes: DailyIntake[],
  medications: Medication[],
  settings: UserSettings
) => {
  clearNotificationTimers();
  if (!settings.notificationsEnabled || !canUseNotifications() || Notification.permission !== "granted") return;

  const medicationMap = new Map(medications.map((medication) => [medication.id, medication]));

  intakes
    .filter((intake) => intake.status === "pending")
    .forEach((intake) => {
      const medication = medicationMap.get(intake.medicationId);
      if (!medication) return;
      const when = parseISODate(intake.date);
      const [hour, minute] = intake.time.split(":").map(Number);
      when.setHours(hour, minute, 0, 0);
      const delay = when.getTime() - Date.now();
      if (delay < 0 || delay > 24 * 60 * 60 * 1000) return;

      const timer = window.setTimeout(() => {
        showIntakeNotification(intake, medication, settings);
      }, delay);
      timers.push(timer);
    });
};

export const showIntakeNotification = async (
  intake: DailyIntake,
  medication: Medication,
  settings: UserSettings
) => {
  const title = `Пора принять: ${medication.name}`;
  const options: ExtendedNotificationOptions = {
    body: medication.dosage,
    tag: intake.id,
    badge: "/icons/icon-192.png",
    icon: "/icons/icon-192.png",
    data: {
      intakeId: intake.id,
      repeatReminderMinutes: settings.repeatReminderMinutes
    },
    vibrate: settings.vibrationEnabled ? [120, 80, 120] : undefined,
    actions: [
      { action: "taken", title: "Принято" },
      { action: "later", title: `Через ${settings.repeatReminderMinutes} минут` }
    ]
  };

  const registration = await navigator.serviceWorker?.ready.catch(() => undefined);
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
};
