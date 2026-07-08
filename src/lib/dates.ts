export const toISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseISODate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parseISODate(iso));

export const formatShortDate = (iso?: string) => {
  if (!iso) return "без окончания";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(parseISODate(iso));
};

export const formatInputDate = (date: Date) => toISODate(date);

export const isDateInRange = (dateIso: string, startIso: string, endIso?: string) => {
  return dateIso >= startIso && (!endIso || dateIso <= endIso);
};

export const getWeekDays = (anchorIso = toISODate()) => {
  const anchor = parseISODate(anchorIso);
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(anchor, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const iso = toISODate(date);
    return {
      iso,
      weekday: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date).replace(".", ""),
      day: date.getDate()
    };
  });
};

export const hasTimePassedByHours = (dateIso: string, time: string, hours: number) => {
  const [hour, minute] = time.split(":").map(Number);
  const date = parseISODate(dateIso);
  date.setHours(hour, minute, 0, 0);
  return Date.now() - date.getTime() > hours * 60 * 60 * 1000;
};

export const backupDateStamp = () => toISODate(new Date());
