import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Encounter } from './encounter.entity.js';
import { Vaccine } from '../catalogs/vaccine.entity.js';

@Entity({ name: 'vaccination_events' })
export class VaccinationEvent extends BaseAuditEntity {
  @Column({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @ManyToOne('Encounter', 'vaccinationEvents', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'vaccine_id', type: 'int' })
  vaccineId!: number;

  @ManyToOne(() => Vaccine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vaccine_id' })
  vaccine!: Vaccine;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate!: Date;

  @Column({ name: 'suggested_next_date', type: 'date', nullable: true })
  suggestedNextDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
