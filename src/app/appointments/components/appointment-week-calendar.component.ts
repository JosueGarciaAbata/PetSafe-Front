import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppointmentWeekDay } from '../models/appointment-calendar.model';
import {
  AppointmentRecord,
  AppointmentStatus,
  buildAppointmentReasonLabel,
  buildAppointmentStatusLabel,
} from '../models/appointment.model';
import { formatAppointmentTime } from '../utils/appointment-date.util';

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

  protected shouldShowQueueBadge(appointment: AppointmentRecord): boolean {
    return appointment.status === 'PROGRAMADA';
  }

  protected buildQueueBadgeLabel(appointment: AppointmentRecord): string {
    return appointment.hasQueueEntry || appointment.queueEntryId ? 'En cola' : 'Sin ingreso';
  }

  protected buildQueueBadgeClasses(appointment: AppointmentRecord): string {
    return appointment.hasQueueEntry || appointment.queueEntryId
      ? 'border-[#BDE8B4] bg-[#E5F5E0] text-[#1D7A04]'
      : 'border-border bg-background text-text-secondary';
  }

  protected buildTimeRange(appointment: AppointmentRecord): string {
    const startsAt = formatAppointmentTime(appointment.startsAt);

    if (!appointment.endsAt) {
      return startsAt;
    }

    return `${startsAt} - ${formatAppointmentTime(appointment.endsAt)}`;
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
}
