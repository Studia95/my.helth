export interface UserSettings {
  name?: string;
  birthDate?: string;
  healthNotes?: string;
  notificationsEnabled: boolean;
  repeatReminderMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  theme: "light" | "dark";
  groupIntakesByDaySection: boolean;
}

export const defaultSettings: UserSettings = {
  notificationsEnabled: false,
  repeatReminderMinutes: 10,
  vibrationEnabled: true,
  soundEnabled: true,
  theme: "light",
  groupIntakesByDaySection: true
};
