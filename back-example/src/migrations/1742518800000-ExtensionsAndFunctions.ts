import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtensionsAndFunctions1742518800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ──
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);

    // ── Enums ──
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
          CREATE TYPE gender_enum AS ENUM ('F', 'M', 'OTRO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'person_type_enum') THEN
          CREATE TYPE person_type_enum AS ENUM ('EMPLEADO', 'CLIENTE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_sex_enum') THEN
          CREATE TYPE patient_sex_enum AS ENUM ('MACHO', 'HEMBRA', 'INTERSEXUAL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_reason_enum') THEN
          CREATE TYPE appointment_reason_enum AS ENUM ('CONSULTA_GENERAL', 'VACUNACION', 'TRATAMIENTO', 'CIRUGIA', 'PROCEDIMIENTO', 'CONTROL', 'EMERGENCIA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status_enum') THEN
          CREATE TYPE appointment_status_enum AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA', 'NO_ASISTIO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_entry_type_enum') THEN
          CREATE TYPE queue_entry_type_enum AS ENUM ('CON_CITA', 'SIN_CITA', 'EMERGENCIA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status_enum') THEN
          CREATE TYPE queue_status_enum AS ENUM ('EN_ESPERA', 'EN_ATENCION', 'FINALIZADA', 'CANCELADA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'encounter_status_enum') THEN
          CREATE TYPE encounter_status_enum AS ENUM ('ACTIVA', 'FINALIZADA', 'ANULADA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_status_enum') THEN
          CREATE TYPE treatment_status_enum AS ENUM ('ACTIVO', 'FINALIZADO', 'SUSPENDIDO', 'CANCELADO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_item_status_enum') THEN
          CREATE TYPE treatment_item_status_enum AS ENUM ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO', 'CANCELADO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'surgery_status_enum') THEN
          CREATE TYPE surgery_status_enum AS ENUM ('PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'antiparasitic_type_enum') THEN
          CREATE TYPE antiparasitic_type_enum AS ENUM ('INTERNO', 'EXTERNO', 'MIXTO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vaccine_species_enum') THEN
          CREATE TYPE vaccine_species_enum AS ENUM ('PERRO', 'GATO', 'OTRO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appetite_status_enum') THEN
          CREATE TYPE appetite_status_enum AS ENUM ('NORMAL', 'DISMINUIDO', 'AUMENTADO', 'ANOREXIA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'water_intake_status_enum') THEN
          CREATE TYPE water_intake_status_enum AS ENUM ('NORMAL', 'DISMINUIDO', 'AUMENTADO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hydration_status_enum') THEN
          CREATE TYPE hydration_status_enum AS ENUM ('NORMAL', 'LEVE_DESHIDRATACION', 'MODERADA_DESHIDRATACION', 'SEVERA_DESHIDRATACION');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mucosa_status_enum') THEN
          CREATE TYPE mucosa_status_enum AS ENUM ('NORMAL', 'PALIDA', 'ICTERICA', 'CIANOTICA', 'HIPEREMICA');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_owner_type_enum') THEN
          CREATE TYPE media_owner_type_enum AS ENUM ('PACIENTE', 'ATENCION', 'USUARIO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
          CREATE TYPE media_type_enum AS ENUM ('IMAGEN', 'PDF', 'DOCUMENTO', 'VIDEO', 'OTRO');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider_enum') THEN
          CREATE TYPE storage_provider_enum AS ENUM ('LOCAL', 'S3', 'R2', 'CLOUDINARY', 'CONTABO_OBJECT_STORAGE', 'OTRO');
        END IF;
      END
      $$;
    `);

    // ── Functions ──
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_softdelete_consistency()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.deleted_at IS NOT NULL THEN
          NEW.is_active = false;
        END IF;
        IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
          NEW.deleted_by_user_id = NULL;
        END IF;
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_softdelete_user_reference()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.deleted_by_user_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
          RAISE EXCEPTION 'deleted_by_user_id requiere deleted_at';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validar_raza_corresponde_especie()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
        especie_raza int;
      BEGIN
        IF NEW.breed_id IS NULL THEN
          RETURN NEW;
        END IF;
        SELECT species_id INTO especie_raza
        FROM breeds
        WHERE id = NEW.breed_id AND deleted_at IS NULL;
        IF especie_raza IS NULL THEN
          RAISE EXCEPTION 'La raza especificada no existe o fue eliminada';
        END IF;
        IF especie_raza <> NEW.species_id THEN
          RAISE EXCEPTION 'La raza no corresponde a la especie del paciente';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS validar_raza_corresponde_especie() CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS validate_softdelete_user_reference() CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS enforce_softdelete_consistency() CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at() CASCADE`);

    const enums = [
      'storage_provider_enum', 'media_type_enum', 'media_owner_type_enum',
      'mucosa_status_enum', 'hydration_status_enum', 'water_intake_status_enum',
      'appetite_status_enum', 'vaccine_species_enum', 'antiparasitic_type_enum',
      'surgery_status_enum', 'treatment_item_status_enum', 'treatment_status_enum',
      'encounter_status_enum', 'queue_status_enum', 'queue_entry_type_enum',
      'appointment_status_enum', 'appointment_reason_enum', 'patient_sex_enum',
      'person_type_enum', 'gender_enum',
    ];
    for (const e of enums) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${e}`);
    }

    await queryRunner.query(`DROP EXTENSION IF EXISTS citext`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto`);
  }
}
