import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppointmentMonthCell } from '../models/appointment-calendar.model';
import {
  AppointmentRecord,
  AppointmentStatus,
  buildAppointmentReasonLabel,
  buildAppointmentStatusLabel,
} from '../models/appointment.model';

@Component({
  selector: 'app-appointment-month-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-month-calendar.component.html',
  styleUrl: './appointment-month-calendar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentMonthCalendarComponent {
  @Input({ required: true }) weekdayLabels: readonly string[] = [];
  @Input({ required: true }) cells: readonly AppointmentMonthCell[] = [];
  @Output() readonly appointmentClick = new EventEmitter<AppointmentRecord>();

  protected trackByDate(_index: number, cell: AppointmentMonthCell): string {
    return cell.date;
  }

  protected trackByAppointment(
    _index: number,
    appointment: AppointmentRecord,
  ): number {
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
        return 'appointment-card-status appointment-card-status--scheduled';
      case 'CONFIRMADA':
        return 'appointment-card-status appointment-card-status--confirmed';
      case 'EN_PROCESO':
        return 'appointment-card-status appointment-card-status--in-process';
      case 'FINALIZADA':
        return 'appointment-card-status appointment-card-status--finished';
      case 'CANCELADA':
        return 'appointment-card-status appointment-card-status--cancelled';
      case 'NO_ASISTIO':
        return 'appointment-card-status appointment-card-status--no-show';
    }
  }
}
