import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import {
  QueueEntryTypeEnum,
  QueueStatusEnum,
} from '../../enums/index.js';
import { Appointment } from './appointment.entity.js';
import { Patient } from '../patients/patient.entity.js';
import { Employee } from '../persons/employee.entity.js';

@Entity({ name: 'queue_entries' })
export class QueueEntry extends BaseAuditEntity {
  @Column({ type: 'date' })
  date!: Date;

  @Column({ name: 'appointment_id', type: 'int', nullable: true })
  appointmentId!: number | null;

  @ManyToOne(() => Appointment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

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

  @Column({
    name: 'entry_type',
    type: 'enum',
    enum: QueueEntryTypeEnum,
    enumName: 'queue_entry_type_enum',
  })
  entryType!: QueueEntryTypeEnum;

  @Column({ name: 'arrival_time', type: 'timestamp without time zone' })
  arrivalTime!: Date;

  @Column({
    name: 'scheduled_time',
    type: 'time without time zone',
    nullable: true,
  })
  scheduledTime!: string | null;

  @Column({
    name: 'queue_status',
    type: 'enum',
    enum: QueueStatusEnum,
    enumName: 'queue_status_enum',
    default: QueueStatusEnum.EN_ESPERA,
  })
  queueStatus!: QueueStatusEnum;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
