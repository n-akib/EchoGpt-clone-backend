import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionsTable1727510000000
  implements MigrationInterface
{
  name = 'CreateSubscriptionsTable1727510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create subscription_plan_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan_enum') THEN
          CREATE TYPE "subscription_plan_enum" AS ENUM('free', 'premium');
        END IF;
      END$$;
    `);

    // 2. Create subscription_status_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
          CREATE TYPE "subscription_status_enum" AS ENUM('active', 'cancelled', 'expired');
        END IF;
      END$$;
    `);

    // 3. Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "plan" "subscription_plan_enum" NOT NULL DEFAULT 'free',
        "status" "subscription_status_enum" NOT NULL DEFAULT 'active',
        "monthly_limit" integer NOT NULL DEFAULT 50,
        "requests_used" integer NOT NULL DEFAULT 0,
        "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "current_period_end" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_subscriptions_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    // 4. Create index on user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_user_id" ON "subscriptions" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_plan_enum";`);
  }
}
