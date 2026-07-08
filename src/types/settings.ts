export interface UserSettings {
  name?: string;
  birthDate?: string;
  healthNotes?: string;
  notificationsEnabled: boolean;
  repeatReminderMinutes: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  theme: "light" | "dark";
}

export const defaultSettings: UserSettings = {
  notificationsEnabled: false,
  repeatReminderMinutes: 10,
  vibrationEnabled: true,
  soundEnabled: true,
  theme: "light"
};
