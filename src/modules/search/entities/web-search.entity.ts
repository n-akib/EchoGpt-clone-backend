import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedDate?: string;
}

@Entity('web_searches')
export class WebSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 500 })
  query: string;

  @Column({ name: 'results_count', type: 'integer', default: 0 })
  resultsCount: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  results: SearchResultItem[];

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
