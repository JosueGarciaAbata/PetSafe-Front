import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersAndAuth1742518800001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
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
      CREATE TABLE IF NOT EXISTS persons (
        id SERIAL PRIMARY KEY,
        person_type person_type_enum NOT NULL,
        first_name varchar(120) NOT NULL,
        last_name varchar(120) NOT NULL,
        document_id varchar(20),
        phone varchar(25),
        address varchar(255),
        gender gender_enum,
        birth_date date,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        person_id int NOT NULL,
        email citext NOT NULL,
        password_hash varchar(255) NOT NULL,
        last_login_at timestamp without time zone,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_users_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        person_id int NOT NULL,
        code varchar(40),
        job_title varchar(120),
        professional_license varchar(80),
        is_vet boolean NOT NULL DEFAULT false,
        hire_date date,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_employees_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        person_id int NOT NULL,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_clients_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id int NOT NULL,
        role_id int NOT NULL,
        assigned_at timestamp without time zone NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id int NOT NULL,
        token_hash varchar(255) NOT NULL,
        expires_at timestamp without time zone NOT NULL,
        revoked boolean NOT NULL DEFAULT false,
        revoked_at timestamp without time zone,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id int NOT NULL,
        code_hash varchar(255) NOT NULL,
        channel varchar(50) NOT NULL,
        destination varchar(255) NOT NULL,
        expires_at timestamp without time zone NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        max_attempts int NOT NULL DEFAULT 5,
        used_at timestamp without time zone,
        invalidated_at timestamp without time zone,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_password_reset_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_refresh_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS employees CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS persons CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE`);
  }
}
