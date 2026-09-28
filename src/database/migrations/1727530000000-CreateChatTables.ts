import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatTables1727530000000 implements MigrationInterface {
  name = 'CreateChatTables1727530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create message_role_enum if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_role_enum') THEN
          CREATE TYPE "message_role_enum" AS ENUM('system', 'user', 'assistant');
        END IF;
      END$$;
    `);

    // 2. Create chat_conversations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL DEFAULT 'New Chat',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_conversations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_conversations_user_id" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    // 3. Create indexes for chat_conversations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_conversations_user_id" ON "chat_conversations" ("user_id");
    `);

    // 4. Create chat_messages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "role" "message_role_enum" NOT NULL DEFAULT 'user',
        "content" text NOT NULL,
        "provider_id" uuid,
        "model" character varying(100),
        "prompt_tokens" integer,
        "completion_tokens" integer,
        "total_tokens" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_conversation_id" FOREIGN KEY ("conversation_id") 
          REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_messages_provider_id" FOREIGN KEY ("provider_id") 
          REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // 5. Create indexes for chat_messages
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_conversation_id" ON "chat_messages" ("conversation_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_messages_conversation_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_conversations_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_conversations";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_role_enum";`);
  }
}
