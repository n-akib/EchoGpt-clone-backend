import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthAndUserSchema1727500000000
  implements MigrationInterface
{
  name = 'InitialAuthAndUserSchema1727500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable uuid extension if not enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Create user role enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "users_role_enum" AS ENUM('admin', 'user');
        END IF;
      END$$;
    `);

    // 3. Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'user',
        "first_name" character varying(100),
        "last_name" character varying(100),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);

    // 4. Create index on users email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
    `);

    // 5. Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "device_info" character varying(500),
        "ip_address" character varying(45),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    // 6. Create indexes on refresh_tokens
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_token_hash";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum";`);
  }
}
