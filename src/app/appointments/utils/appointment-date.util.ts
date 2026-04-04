const WEEKDAY_REFERENCE_MONDAY = new Date(2024, 0, 1);

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day);
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
}

export function startOfMonth(dateKey: string): Date {
  const date = parseDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(dateKey: string): Date {
  const date = parseDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfWeek(dateKey: string): Date {
  const date = parseDateKey(dateKey);
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

export function endOfWeek(dateKey: string): Date {
  return addDays(startOfWeek(dateKey), 6);
}

export function startOfCalendarMonthGrid(dateKey: string): Date {
  const monthStart = startOfMonth(dateKey);
  const offset = (monthStart.getDay() + 6) % 7;
  return addDays(monthStart, -offset);
}

export function buildMonthLabel(
  dateKey: string,
  locale = 'es-EC',
): string {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function buildWeekdayLabels(locale = 'es-EC'): readonly string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(WEEKDAY_REFERENCE_MONDAY, index);
    return new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(date)
      .replace('.', '');
  });
}

export function buildWeekRangeLabel(
  dateKey: string,
  locale = 'es-EC',
): string {
  const weekStart = startOfWeek(dateKey);
  const weekEnd = endOfWeek(dateKey);
  const shortFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  });

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    const monthYear = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(weekEnd);
    return `${weekStart.getDate()} - ${weekEnd.getDate()} ${monthYear}`;
  }

  return `${shortFormatter.format(weekStart)} - ${shortFormatter.format(weekEnd)} ${weekEnd.getFullYear()}`;
}

export function buildShortWeekdayLabel(
  dateKey: string,
  locale = 'es-EC',
): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' })
    .format(parseDateKey(dateKey))
    .replace('.', '');
}

export function buildDayMonthLabel(
  dateKey: string,
  locale = 'es-EC',
): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(parseDateKey(dateKey));
}

export function buildFullDateLabel(
  dateKey: string,
  locale = 'es-EC',
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(dateKey));
}

export function formatAppointmentTime(value: string | null | undefined): string {
  if (!value) {
    return 'Sin hora';
  }

  const normalizedValue = value.trim();
  const timeMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})/);

  if (!timeMatch) {
    return normalizedValue;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return normalizedValue;
  }

  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;

  return `${normalizedHours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')} ${meridiem}`;
}
