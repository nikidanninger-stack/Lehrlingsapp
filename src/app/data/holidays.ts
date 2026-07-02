// Österreichische Feiertage (fixe + bewegliche, berechnet über Ostersonntag)

function easterSunday(year: number): Date {
  // Gauß'sche Osterformel
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=März, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function fmt(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

export function getAustrianHolidays(year: number): { date: string; name: string }[] {
  const ostersonntag = easterSunday(year);

  return [
    { date: `01.01.${year}`, name: "Neujahr" },
    { date: `06.01.${year}`, name: "Heilige Drei Könige" },
    { date: fmt(addDays(ostersonntag, 1)), name: "Ostermontag" },
    { date: `01.05.${year}`, name: "Staatsfeiertag" },
    { date: fmt(addDays(ostersonntag, 39)), name: "Christi Himmelfahrt" },
    { date: fmt(addDays(ostersonntag, 50)), name: "Pfingstmontag" },
    { date: fmt(addDays(ostersonntag, 60)), name: "Fronleichnam" },
    { date: `15.08.${year}`, name: "Mariä Himmelfahrt" },
    { date: `26.10.${year}`, name: "Nationalfeiertag" },
    { date: `01.11.${year}`, name: "Allerheiligen" },
    { date: `08.12.${year}`, name: "Mariä Empfängnis" },
    { date: `25.12.${year}`, name: "Christtag" },
    { date: `26.12.${year}`, name: "Stefanitag" },
  ];
}

export function isAustrianHoliday(dateStr: string): boolean {
  // dateStr im Format "DD.MM.YYYY"
  const year = parseInt(dateStr.split(".")[2] ?? "0", 10);
  if (!year) return false;
  return getAustrianHolidays(year).some((h) => h.date === dateStr);
}

export function isWeekend(dateStr: string): boolean {
  // dateStr im Format "DD.MM.YYYY"
  const [dd, mm, yyyy] = dateStr.split(".").map((v) => parseInt(v, 10));
  if (!dd || !mm || !yyyy) return false;
  const date = new Date(yyyy, mm - 1, dd);
  const day = date.getDay();
  return day === 0 || day === 6;
}
