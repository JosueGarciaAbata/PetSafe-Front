import { MigrationInterface, QueryRunner } from 'typeorm';

export class Encounters1742518800005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounters (
        id SERIAL PRIMARY KEY,
        appointment_id int,
        queue_entry_id int,
        patient_id int NOT NULL,
        vet_id int NOT NULL,
        start_time timestamp without time zone NOT NULL,
        end_time timestamp without time zone,
        status encounter_status_enum NOT NULL DEFAULT 'ACTIVA',
        general_notes text,
        created_by_user_id int,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_encounters_fechas CHECK (end_time IS NULL OR end_time >= start_time),
        CONSTRAINT ck_encounters_status_end CHECK (
          (status = 'ACTIVA' AND end_time IS NULL) OR
          (status IN ('FINALIZADA', 'ANULADA'))
        ),
        CONSTRAINT fk_encounters_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
        CONSTRAINT fk_encounters_queue FOREIGN KEY (queue_entry_id) REFERENCES queue_entries(id) ON DELETE SET NULL,
        CONSTRAINT fk_encounters_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_encounters_vet FOREIGN KEY (vet_id) REFERENCES employees(id) ON DELETE RESTRICT,
        CONSTRAINT fk_encounters_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounter_consultation_reasons (
        encounter_id int PRIMARY KEY,
        consultation_reason text NOT NULL,
        current_illness_history text,
        referred_previous_diagnoses text,
        referred_previous_treatments text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_reason_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounter_anamnesis (
        encounter_id int PRIMARY KEY,
        problem_start_text text,
        previous_surgeries_text text,
        how_problem_started_text text,
        vaccines_up_to_date boolean,
        deworming_up_to_date boolean,
        has_pet_at_home boolean,
        pet_at_home_detail text,
        administered_medication_text text,
        appetite_status appetite_status_enum,
        water_intake_status water_intake_status_enum,
        feces_text text,
        vomit_text text,
        number_of_bowel_movements integer,
        urine_text text,
        respiratory_problems_text text,
        difficulty_walking_text text,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_anamnesis_bowel CHECK (number_of_bowel_movements IS NULL OR number_of_bowel_movements >= 0),
        CONSTRAINT fk_anamnesis_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounter_clinical_exams (
        encounter_id int PRIMARY KEY,
        weight_kg numeric(8,2),
        temperature_c numeric(5,2),
        pulse integer,
        heart_rate integer,
        respiratory_rate integer,
        mucous_membranes mucosa_status_enum,
        lymph_nodes varchar(120),
        hydration hydration_status_enum,
        crt_seconds integer,
        exam_notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_exam_weight CHECK (weight_kg IS NULL OR weight_kg > 0),
        CONSTRAINT ck_exam_temperature CHECK (temperature_c IS NULL OR (temperature_c >= 20 AND temperature_c <= 50)),
        CONSTRAINT ck_exam_pulse CHECK (pulse IS NULL OR pulse >= 0),
        CONSTRAINT ck_exam_hr CHECK (heart_rate IS NULL OR heart_rate >= 0),
        CONSTRAINT ck_exam_rr CHECK (respiratory_rate IS NULL OR respiratory_rate >= 0),
        CONSTRAINT ck_exam_crt CHECK (crt_seconds IS NULL OR crt_seconds >= 0),
        CONSTRAINT fk_exam_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounter_environmental_data (
        encounter_id int PRIMARY KEY,
        environment_notes text,
        nutrition_notes text,
        lifestyle_notes text,
        feeding_type_notes text,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_env_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounter_clinical_impressions (
        encounter_id int PRIMARY KEY,
        presumptive_diagnosis text,
        differential_diagnosis text,
        prognosis text,
        clinical_notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_impression_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS encounter_plans (
        encounter_id int PRIMARY KEY,
        clinical_plan text,
        requires_follow_up boolean NOT NULL DEFAULT false,
        suggested_follow_up_date date,
        plan_notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_plan_follow_up CHECK (
          (requires_follow_up = false) OR
          (requires_follow_up = true AND suggested_follow_up_date IS NOT NULL)
        ),
        CONSTRAINT fk_plan_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS encounter_plans CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS encounter_clinical_impressions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS encounter_environmental_data CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS encounter_clinical_exams CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS encounter_anamnesis CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS encounter_consultation_reasons CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS encounters CASCADE`);
  }
}
