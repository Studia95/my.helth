import { backupDateStamp } from "./dates";
import { exportAllData, importAllData, importMedicationFileData } from "./db";

export const downloadBackup = async () => {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `my-helth-backup-${backupDateStamp()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importBackupFile = async (file: File) => {
  const text = await file.text();
  const data = JSON.parse(text);
  if (data?.schema === "my.helth.import") {
    const result = await importMedicationFileData(data);
    return `Импорт завершён.\nДобавлено: ${result.added}\nОбновлено: ${result.updated}\nПропущено: ${result.skipped}`;
  }
  await importAllData(data);
  return "Данные импортированы";
};
