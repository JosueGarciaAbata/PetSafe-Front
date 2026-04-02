import { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetNotifications1742518800012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Note: Table 'user_password_reset_tokens' is created in 1742518800001-UsersAndAuth.ts
    // We only add specific indexes here to maintain the sequence of the original migrations.
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
      ON user_password_reset_tokens (user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
      ON user_password_reset_tokens (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_password_reset_tokens_user_created`);
  }
}
