import { AppointmentRecord } from './appointment.model';

export type AppointmentCalendarView = 'month' | 'week' | 'day';

export interface AppointmentCalendarQuery {
  view: AppointmentCalendarView;
  activeDate: string;
  from: string;
  to: string;
  vetId?: number;
}

export interface AppointmentMonthCell {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: AppointmentRecord[];
}

export interface AppointmentWeekDay {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  isToday: boolean;
  appointments: AppointmentRecord[];
}

export interface AppointmentCalendarSummary {
  totalAppointments: number;
  scheduledAppointments: number;
  confirmedAppointments: number;
  inProcessAppointments: number;
}

export interface AppointmentCalendarMonthResponse {
  view: 'month';
  activeDate: string;
  appointments: AppointmentRecord[];
}

export interface AppointmentCalendarWeekResponse {
  view: 'week';
  activeDate: string;
  appointments: AppointmentRecord[];
}

export const EMPTY_APPOINTMENT_SUMMARY: AppointmentCalendarSummary = {
  totalAppointments: 0,
  scheduledAppointments: 0,
  confirmedAppointments: 0,
  inProcessAppointments: 0,
};
