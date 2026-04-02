import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppointmentWeekDay } from '../models/appointment-calendar.model';
import {
  AppointmentRecord,
  AppointmentStatus,
  buildAppointmentReasonLabel,
  buildAppointmentStatusLabel,
} from '../models/appointment.model';

@Component({
  selector: 'app-appointment-week-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-week-calendar.component.html',
  styleUrl: './appointment-week-calendar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentWeekCalendarComponent {
  @Input({ required: true }) days: readonly AppointmentWeekDay[] = [];
  @Output() readonly appointmentClick = new EventEmitter<AppointmentRecord>();

  protected trackByDate(_index: number, day: AppointmentWeekDay): string {
    return day.date;
  }

  protected trackByAppointment(_index: number, appointment: AppointmentRecord): number {
    return appointment.id;
  }

  protected buildPatientInitials(name: string | null, patientId: number): string {
    const normalizedName = name?.trim() ?? '';

    if (!normalizedName) {
      return `P${String(patientId).slice(-1)}`;
    }

    const parts = normalizedName.split(/\s+/).filter(Boolean);
    const firstInitial = parts[0]?.charAt(0) ?? '';
    const secondInitial = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${firstInitial}${secondInitial}`.toUpperCase() || `P${String(patientId).slice(-1)}`;
  }

  protected buildPatientLabel(appointment: AppointmentRecord): string {
    const patientName = appointment.patientName?.trim();
    return patientName || `Paciente #${appointment.patientId}`;
  }

  protected hasOwnerName(ownerName: string | null): boolean {
    return Boolean(ownerName?.trim());
  }

  protected buildReasonLabel(reason: string | null): string {
    return buildAppointmentReasonLabel(reason);
  }

  protected buildStatusLabel(status: AppointmentStatus): string {
    return buildAppointmentStatusLabel(status);
  }

  protected buildTimeRange(appointment: AppointmentRecord): string {
    if (!appointment.endsAt) {
      return appointment.startsAt;
    }

    return `${appointment.startsAt} - ${appointment.endsAt}`;
  }

  protected hasNotes(notes: string | null): boolean {
    return Boolean(notes?.trim());
  }

  protected buildStatusClasses(status: AppointmentStatus): string {
    switch (status) {
      case 'PROGRAMADA':
        return 'appointment-week-status appointment-week-status--scheduled';
      case 'CONFIRMADA':
        return 'appointment-week-status appointment-week-status--confirmed';
      case 'EN_PROCESO':
        return 'appointment-week-status appointment-week-status--in-process';
      case 'FINALIZADA':
        return 'appointment-week-status appointment-week-status--finished';
      case 'CANCELADA':
        return 'appointment-week-status appointment-week-status--cancelled';
      case 'NO_ASISTIO':
        return 'appointment-week-status appointment-week-status--no-show';
    }
  }

  protected buildAvatarClasses(): string {
    return 'appointment-week-avatar appointment-week-avatar--default';
  }
}
