import { MigrationInterface, QueryRunner } from 'typeorm';

export class VaccinationSystem1742518800015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extend vaccines catalog ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE vaccines
        ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS dose_order   integer
    `);

    // ── Patient vaccine records (carnet de vacunación) ───────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patient_vaccine_records (
        id                  SERIAL PRIMARY KEY,
        patient_id          int NOT NULL,
        vaccine_id          int NOT NULL,
        application_date    date NOT NULL,
        administered_by     varchar(120),
        administered_at     varchar(180),
        is_external         boolean NOT NULL DEFAULT false,
        batch_number        varchar(80),
        next_dose_date      date,
        notes               text,
        encounter_id        int,
        created_by_user_id  int,
        is_active           boolean NOT NULL DEFAULT true,
        created_at          timestamp without time zone NOT NULL DEFAULT now(),
        updated_at          timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at          timestamp without time zone,
        deleted_by_user_id  int,
        CONSTRAINT fk_pvr_patient   FOREIGN KEY (patient_id)    REFERENCES patients(id)   ON DELETE RESTRICT,
        CONSTRAINT fk_pvr_vaccine   FOREIGN KEY (vaccine_id)    REFERENCES vaccines(id)   ON DELETE RESTRICT,
        CONSTRAINT fk_pvr_encounter FOREIGN KEY (encounter_id)  REFERENCES encounters(id) ON DELETE SET NULL,
        CONSTRAINT fk_pvr_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_pvr_next_dose CHECK (next_dose_date IS NULL OR next_dose_date >= application_date)
      )
    `);

    // ── Indexes ──────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pvr_patient_id   ON patient_vaccine_records(patient_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pvr_vaccine_id   ON patient_vaccine_records(vaccine_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pvr_encounter_id ON patient_vaccine_records(encounter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pvr_deleted_at   ON patient_vaccine_records(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaccines_mandatory ON vaccines(species_id, is_mandatory) WHERE deleted_at IS NULL`);

    // ── Deferred deleted_by FK ───────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE patient_vaccine_records
        ADD CONSTRAINT fk_pvr_deleted_by
        FOREIGN KEY (deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vaccines_mandatory`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pvr_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pvr_encounter_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pvr_vaccine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pvr_patient_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS patient_vaccine_records CASCADE`);
    await queryRunner.query(`
      ALTER TABLE vaccines
        DROP COLUMN IF EXISTS dose_order,
        DROP COLUMN IF EXISTS is_mandatory
    `);
  }
}
