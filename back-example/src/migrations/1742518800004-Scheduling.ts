import { MigrationInterface, QueryRunner } from 'typeorm';

export class Scheduling1742518800004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id int NOT NULL,
        vet_id int NOT NULL,
        scheduled_date date NOT NULL,
        scheduled_time time without time zone NOT NULL,
        reason appointment_reason_enum NOT NULL,
        notes text,
        status appointment_status_enum NOT NULL DEFAULT 'PROGRAMADA',
        created_by_user_id int,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appointments_vet FOREIGN KEY (vet_id) REFERENCES employees(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appointments_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id SERIAL PRIMARY KEY,
        date date NOT NULL,
        appointment_id int,
        patient_id int NOT NULL,
        vet_id int NOT NULL,
        entry_type queue_entry_type_enum NOT NULL,
        arrival_time timestamp without time zone NOT NULL,
        scheduled_time time without time zone,
        status queue_status_enum NOT NULL DEFAULT 'EN_ESPERA',
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_queue_entries_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
        CONSTRAINT fk_queue_entries_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_queue_entries_vet FOREIGN KEY (vet_id) REFERENCES employees(id) ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS queue_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments CASCADE`);
  }
}
