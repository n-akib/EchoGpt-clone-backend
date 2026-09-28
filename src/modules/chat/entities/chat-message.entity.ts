import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatConversation } from './chat-conversation.entity';
import { AiProvider } from '../../providers/entities/ai-provider.entity';

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ChatConversation, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ChatConversation;

  @Column({
    type: 'enum',
    enum: MessageRole,
    default: MessageRole.USER,
  })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @ManyToOne(() => AiProvider, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider: AiProvider | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ name: 'prompt_tokens', type: 'integer', nullable: true })
  promptTokens: number | null;

  @Column({ name: 'completion_tokens', type: 'integer', nullable: true })
  completionTokens: number | null;

  @Column({ name: 'total_tokens', type: 'integer', nullable: true })
  totalTokens: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
