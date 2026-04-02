import { MigrationInterface, QueryRunner } from 'typeorm';

export class Patients1742518800003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        code varchar(40),
        name varchar(120) NOT NULL,
        species_id int NOT NULL,
        breed_id int,
        color_id int,
        sex patient_sex_enum NOT NULL,
        birth_date date,
        current_weight numeric(8,2),
        is_sterilized boolean NOT NULL DEFAULT false,
        microchip_code varchar(80),
        distinguishing_marks text,
        general_allergies text,
        general_history text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_patients_current_weight CHECK (current_weight IS NULL OR current_weight > 0),
        CONSTRAINT fk_patients_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE RESTRICT,
        CONSTRAINT fk_patients_breed FOREIGN KEY (breed_id) REFERENCES breeds(id) ON DELETE SET NULL,
        CONSTRAINT fk_patients_color FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patient_tutors (
        patient_id int NOT NULL,
        client_id int NOT NULL,
        is_primary boolean NOT NULL DEFAULT false,
        relationship varchar(80),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        PRIMARY KEY (patient_id, client_id),
        CONSTRAINT fk_patient_tutors_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        CONSTRAINT fk_patient_tutors_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patient_conditions (
        id SERIAL PRIMARY KEY,
        patient_id int NOT NULL,
        type varchar(80) NOT NULL,
        name varchar(120) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_patient_conditions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS patient_conditions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS patient_tutors CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS patients CASCADE`);
  }
}
