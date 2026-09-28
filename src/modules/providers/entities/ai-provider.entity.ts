import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ProviderType } from '../enums/provider-type.enum';

@Entity('ai_providers')
export class AiProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ProviderType,
  })
  type: ProviderType;

  @Column({
    name: 'api_key_encrypted',
    type: 'text',
    select: false,
  })
  apiKeyEncrypted: string;

  @Column({
    name: 'api_key_iv',
    type: 'varchar',
    length: 100,
    select: false,
  })
  apiKeyIv: string;

  @Column({
    name: 'api_key_tag',
    type: 'varchar',
    length: 100,
    select: false,
  })
  apiKeyTag: string;

  @Column({
    name: 'base_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  baseUrl: string | null;

  @Column({
    type: 'simple-array',
    default: '',
  })
  models: string[];

  @Column({
    name: 'default_model',
    type: 'varchar',
    length: 100,
  })
  defaultModel: string;

  @Column({
    name: 'is_enabled',
    type: 'boolean',
    default: true,
  })
  isEnabled: boolean;

  @Index()
  @Column({
    name: 'is_default',
    type: 'boolean',
    default: false,
  })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
