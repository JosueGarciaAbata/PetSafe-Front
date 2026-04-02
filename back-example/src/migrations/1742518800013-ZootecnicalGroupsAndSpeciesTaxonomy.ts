import { MigrationInterface, QueryRunner } from 'typeorm';

export class ZootecnicalGroupsAndSpeciesTaxonomy1742518800013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zootecnical_groups (
        id SERIAL PRIMARY KEY,
        name varchar(100) NOT NULL,
        description varchar(255),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int
      )
    `);

    await queryRunner.query(`
      ALTER TABLE species
      ADD COLUMN IF NOT EXISTS zootecnical_group_id int
    `);

    await queryRunner.query(`
      INSERT INTO zootecnical_groups (name, description, is_active)
      SELECT 'Otros', 'Grupo zootécnico genérico para especies no clasificadas', true
      WHERE NOT EXISTS (
        SELECT 1 FROM zootecnical_groups WHERE LOWER(name) = LOWER('Otros')
      )
    `);

    await queryRunner.query(`
      UPDATE species
      SET zootecnical_group_id = (
        SELECT id FROM zootecnical_groups WHERE LOWER(name) = LOWER('Otros') LIMIT 1
      )
      WHERE zootecnical_group_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE species
      ALTER COLUMN zootecnical_group_id SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_species_zootecnical_group'
            AND table_name = 'species'
        ) THEN
          ALTER TABLE species
          ADD CONSTRAINT fk_species_zootecnical_group
          FOREIGN KEY (zootecnical_group_id) REFERENCES zootecnical_groups(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE vaccines
      ADD COLUMN IF NOT EXISTS species_id int
    `);

    await queryRunner.query(`
      UPDATE vaccines v
      SET species_id = s.id
      FROM species s
      WHERE v.species_id IS NULL
        AND (
          (v.species::text = 'PERRO' AND LOWER(s.name) = LOWER('Perro'))
          OR (v.species::text = 'GATO' AND LOWER(s.name) = LOWER('Gato'))
          OR (v.species::text = 'OTRO' AND LOWER(s.name) = LOWER('Otro'))
        )
    `);

    await queryRunner.query(`
      UPDATE vaccines
      SET species_id = (
        SELECT id FROM species WHERE LOWER(name) = LOWER('Otro') LIMIT 1
      )
      WHERE species_id IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE vaccines
      ALTER COLUMN species_id SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_vaccines_species'
            AND table_name = 'vaccines'
        ) THEN
          ALTER TABLE vaccines
          ADD CONSTRAINT fk_vaccines_species
          FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE vaccines
      DROP COLUMN IF EXISTS species
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vaccines
      ADD COLUMN IF NOT EXISTS species vaccine_species_enum
    `);

    await queryRunner.query(`
      UPDATE vaccines v
      SET species = CASE
        WHEN LOWER(s.name) = LOWER('Perro') THEN 'PERRO'::vaccine_species_enum
        WHEN LOWER(s.name) = LOWER('Gato') THEN 'GATO'::vaccine_species_enum
        ELSE 'OTRO'::vaccine_species_enum
      END
      FROM species s
      WHERE s.id = v.species_id
    `);

    await queryRunner.query(`ALTER TABLE vaccines DROP CONSTRAINT IF EXISTS fk_vaccines_species`);
    await queryRunner.query(`ALTER TABLE vaccines DROP COLUMN IF EXISTS species_id`);

    await queryRunner.query(`ALTER TABLE species DROP CONSTRAINT IF EXISTS fk_species_zootecnical_group`);
    await queryRunner.query(`ALTER TABLE species DROP COLUMN IF EXISTS zootecnical_group_id`);

    await queryRunner.query(`DROP TABLE IF EXISTS zootecnical_groups CASCADE`);
  }
}
