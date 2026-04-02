import { MigrationInterface, QueryRunner } from 'typeorm';

export class Catalogs1742518800002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS species (
        id SERIAL PRIMARY KEY,
        name varchar(80) NOT NULL,
        description varchar(255),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS breeds (
        id SERIAL PRIMARY KEY,
        species_id int NOT NULL,
        name varchar(100) NOT NULL,
        description varchar(255),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_breeds_species FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS colors (
        id SERIAL PRIMARY KEY,
        name varchar(80) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vaccines (
        id SERIAL PRIMARY KEY,
        name varchar(120) NOT NULL,
        species vaccine_species_enum NOT NULL,
        is_revaccination boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS antiparasitics (
        id SERIAL PRIMARY KEY,
        name varchar(120) NOT NULL,
        type antiparasitic_type_enum NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS antiparasitics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vaccines CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS colors CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS breeds CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS species CASCADE`);
  }
}
