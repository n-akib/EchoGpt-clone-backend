import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebSearchesTable1727540000000 implements MigrationInterface {
  name = 'CreateWebSearchesTable1727540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "web_searches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "query" character varying(500) NOT NULL,
        "results_count" integer NOT NULL DEFAULT 0,
        "results" jsonb DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_web_searches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_web_searches_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_web_searches_user_id" ON "web_searches" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_web_searches_created_at" ON "web_searches" ("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_web_searches_query" ON "web_searches" ("query");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_web_searches_query";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_web_searches_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_web_searches_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "web_searches";`);
  }
}
