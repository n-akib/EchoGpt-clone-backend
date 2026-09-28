import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiProvidersTable1727520000000
  implements MigrationInterface
{
  name = 'CreateAiProvidersTable1727520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create provider_type_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type_enum') THEN
          CREATE TYPE "provider_type_enum" AS ENUM('openai', 'anthropic', 'gemini');
        END IF;
      END$$;
    `);

    // 2. Create ai_providers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "type" "provider_type_enum" NOT NULL,
        "api_key_encrypted" text NOT NULL,
        "api_key_iv" character varying(100) NOT NULL,
        "api_key_tag" character varying(100) NOT NULL,
        "base_url" character varying(255),
        "models" text NOT NULL DEFAULT '',
        "default_model" character varying(100) NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_providers_id" PRIMARY KEY ("id")
      );
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_providers_type" ON "ai_providers" ("type");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_providers_is_default" ON "ai_providers" ("is_default");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_providers_is_default";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_providers_type";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_providers";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_type_enum";`);
  }
}
