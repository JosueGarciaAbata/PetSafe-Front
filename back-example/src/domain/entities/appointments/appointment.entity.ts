import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import {
  AppointmentReasonEnum,
  AppointmentStatusEnum,
} from '../../enums/index.js';
import { Patient } from '../patients/patient.entity.js';
import { Employee } from '../persons/employee.entity.js';
import { User } from '../auth/user.entity.js';

@Entity({ name: 'appointments' })
export class Appointment extends BaseAuditEntity {
  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'veterinarian_id', type: 'int' })
  veterinarianId!: number;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'veterinarian_id' })
  veterinarian!: Employee;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate!: Date;

  @Column({ name: 'scheduled_time', type: 'time without time zone' })
  scheduledTime!: string;

  @Column({
    name: 'appointment_reason',
    type: 'enum',
    enum: AppointmentReasonEnum,
    enumName: 'appointment_reason_enum',
  })
  appointmentReason!: AppointmentReasonEnum;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    name: 'appointment_status',
    type: 'enum',
    enum: AppointmentStatusEnum,
    enumName: 'appointment_status_enum',
    default: AppointmentStatusEnum.PROGRAMADA,
  })
  appointmentStatus!: AppointmentStatusEnum;

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User | null;
}
