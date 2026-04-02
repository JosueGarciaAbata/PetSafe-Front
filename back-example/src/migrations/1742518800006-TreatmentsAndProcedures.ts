import { MigrationInterface, QueryRunner } from 'typeorm';

export class TreatmentsAndProcedures1742518800006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS treatments (
        id SERIAL PRIMARY KEY,
        encounter_id int NOT NULL,
        status treatment_status_enum NOT NULL DEFAULT 'ACTIVO',
        start_date date NOT NULL,
        end_date date,
        general_instructions text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_treatments_fechas CHECK (end_date IS NULL OR end_date >= start_date),
        CONSTRAINT fk_treatments_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS treatment_items (
        id SERIAL PRIMARY KEY,
        treatment_id int NOT NULL,
        medication varchar(120) NOT NULL,
        dose varchar(120) NOT NULL,
        frequency varchar(120) NOT NULL,
        duration_days integer NOT NULL,
        administration_route varchar(120) NOT NULL,
        notes text,
        status treatment_item_status_enum NOT NULL DEFAULT 'ACTIVO',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_treatment_items_duration CHECK (duration_days > 0),
        CONSTRAINT fk_treatment_items_treatment FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vaccination_events (
        id SERIAL PRIMARY KEY,
        encounter_id int NOT NULL,
        vaccine_id int NOT NULL,
        application_date date NOT NULL,
        suggested_next_date date,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_vaccination_events_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
        CONSTRAINT fk_vaccination_events_vaccine FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deworming_events (
        id SERIAL PRIMARY KEY,
        encounter_id int NOT NULL,
        product_id int NOT NULL,
        application_date date NOT NULL,
        suggested_next_date date,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_deworming_events_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
        CONSTRAINT fk_deworming_events_product FOREIGN KEY (product_id) REFERENCES antiparasitics(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS surgeries (
        id SERIAL PRIMARY KEY,
        encounter_id int NOT NULL,
        surgery_type varchar(120) NOT NULL,
        scheduled_date timestamp without time zone,
        performed_date timestamp without time zone,
        surgery_status surgery_status_enum NOT NULL DEFAULT 'PROGRAMADA',
        description text,
        postoperative_instructions text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_surgeries_fechas CHECK (
          scheduled_date IS NULL OR performed_date IS NULL OR performed_date >= scheduled_date
        ),
        CONSTRAINT fk_surgeries_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS procedures (
        id SERIAL PRIMARY KEY,
        encounter_id int NOT NULL,
        procedure_type varchar(120) NOT NULL,
        performed_date timestamp without time zone NOT NULL,
        description text,
        result text,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_procedures_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS procedures CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS surgeries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS deworming_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vaccination_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS treatment_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS treatments CASCADE`);
  }
}
