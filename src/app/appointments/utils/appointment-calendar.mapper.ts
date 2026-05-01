import {
  AppointmentCalendarSummary,
  AppointmentMonthCell,
  AppointmentWeekDay,
  EMPTY_APPOINTMENT_SUMMARY,
} from '../models/appointment-calendar.model';
import { AppointmentRecord } from '../models/appointment.model';
import {
  addDays,
  buildDayMonthLabel,
  buildShortWeekdayLabel,
  formatDateKey,
  getTodayDateKey,
  parseDateKey,
  startOfWeek,
  startOfCalendarMonthGrid,
} from './appointment-date.util';

const MONTH_GRID_SIZE = 42;

export function buildAppointmentMonthCells(
  activeDate: string,
  appointments: readonly AppointmentRecord[],
): AppointmentMonthCell[] {
  const gridStart = startOfCalendarMonthGrid(activeDate);
  const activeMonth = parseDateKey(activeDate).getMonth();
  const todayKey = getTodayDateKey();
  const appointmentsByDate = groupAppointmentsByDate(appointments);

  return Array.from({ length: MONTH_GRID_SIZE }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateKey = formatDateKey(date);

    return {
      date: dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === activeMonth,
      isToday: dateKey === todayKey,
      appointments: appointmentsByDate.get(dateKey) ?? [],
    };
  });
}

export function buildAppointmentSummary(
  appointments: readonly AppointmentRecord[],
): AppointmentCalendarSummary {
  if (appointments.length === 0) {
    return EMPTY_APPOINTMENT_SUMMARY;
  }

  return {
    totalAppointments: appointments.length,
    scheduledAppointments: appointments.filter(
      (appointment) => appointment.status === 'PROGRAMADA',
    ).length,
    confirmedAppointments: appointments.filter(
      (appointment) => appointment.status === 'CONFIRMADA',
    ).length,
    inProcessAppointments: appointments.filter(
      (appointment) => appointment.status === 'EN_PROCESO',
    ).length,
    cancelledAppointments: appointments.filter(
      (appointment) => appointment.status === 'CANCELADA',
    ).length,
  };
}

export function buildAppointmentWeekDays(
  activeDate: string,
  appointments: readonly AppointmentRecord[],
): AppointmentWeekDay[] {
  const weekStart = startOfWeek(activeDate);
  const todayKey = getTodayDateKey();
  const appointmentsByDate = groupAppointmentsByDate(appointments);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateKey = formatDateKey(date);

    return {
      date: dateKey,
      weekdayLabel: buildShortWeekdayLabel(dateKey),
      dayLabel: buildDayMonthLabel(dateKey),
      isToday: dateKey === todayKey,
      appointments: appointmentsByDate.get(dateKey) ?? [],
    };
  });
}

function groupAppointmentsByDate(
  appointments: readonly AppointmentRecord[],
): Map<string, AppointmentRecord[]> {
  const groupedAppointments = new Map<string, AppointmentRecord[]>();

  for (const appointment of [...appointments].sort(compareAppointments)) {
    const currentAppointments = groupedAppointments.get(appointment.scheduledDate) ?? [];
    currentAppointments.push(appointment);
    groupedAppointments.set(appointment.scheduledDate, currentAppointments);
  }

  return groupedAppointments;
}

function compareAppointments(
  left: AppointmentRecord,
  right: AppointmentRecord,
): number {
  if (left.scheduledDate !== right.scheduledDate) {
    return left.scheduledDate.localeCompare(right.scheduledDate);
  }

  if (left.startsAt !== right.startsAt) {
    if (left.startsAt === null) {
      return 1;
    }
    if (right.startsAt === null) {
      return -1;
    }
    return left.startsAt.localeCompare(right.startsAt);
  }

  return left.id - right.id;
}
