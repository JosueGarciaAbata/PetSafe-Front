import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAuditEntity } from '../base-audit.entity.js';
import {
  MediaOwnerTypeEnum,
  MediaTypeEnum,
  StorageProviderEnum,
} from '../../enums/index.js';
import { User } from '../auth/user.entity.js';

@Entity({ name: 'media_files' })
export class MediaFile extends BaseAuditEntity {
  @Column({
    name: 'owner_type',
    type: 'enum',
    enum: MediaOwnerTypeEnum,
    enumName: 'media_owner_type_enum',
  })
  ownerType!: MediaOwnerTypeEnum;

  @Column({ name: 'owner_id', type: 'int' })
  ownerId!: number;

  @Column({
    name: 'media_type',
    type: 'enum',
    enum: MediaTypeEnum,
    enumName: 'media_type_enum',
  })
  mediaType!: MediaTypeEnum;

  @Column({
    type: 'enum',
    enum: StorageProviderEnum,
    enumName: 'storage_provider_enum',
  })
  provider!: StorageProviderEnum;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 255, nullable: true })
  storageKey!: string | null;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes!: number | null;

  @Column({ type: 'integer', nullable: true })
  width!: number | null;

  @Column({ type: 'integer', nullable: true })
  height!: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_by_user_id', type: 'int', nullable: true })
  createdByUserId!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User | null;
}
