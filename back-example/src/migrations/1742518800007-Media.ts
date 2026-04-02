import { MigrationInterface, QueryRunner } from 'typeorm';

export class Media1742518800007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id SERIAL PRIMARY KEY,
        owner_type media_owner_type_enum NOT NULL,
        owner_id int NOT NULL,
        media_type media_type_enum NOT NULL,
        provider storage_provider_enum NOT NULL,
        url text NOT NULL,
        storage_key varchar(255),
        original_name varchar(255) NOT NULL,
        mime_type varchar(120),
        size_bytes bigint,
        width integer,
        height integer,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id int,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT ck_media_files_size CHECK (size_bytes IS NULL OR size_bytes >= 0),
        CONSTRAINT ck_media_files_width CHECK (width IS NULL OR width >= 0),
        CONSTRAINT ck_media_files_height CHECK (height IS NULL OR height >= 0),
        CONSTRAINT fk_media_files_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS media_files CASCADE`);
  }
}
