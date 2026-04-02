import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import type { Encounter } from './encounter.entity.js';
import { Antiparasitic } from '../catalogs/antiparasitic.entity.js';

@Entity({ name: 'deworming_events' })
export class DewormingEvent extends BaseAuditEntity {
  @Column({ name: 'encounter_id', type: 'int' })
  encounterId!: number;

  @ManyToOne('Encounter', 'dewormingEvents', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'encounter_id' })
  encounter!: Encounter;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @ManyToOne(() => Antiparasitic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: Antiparasitic;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate!: Date;

  @Column({ name: 'suggested_next_date', type: 'date', nullable: true })
  suggestedNextDate!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
