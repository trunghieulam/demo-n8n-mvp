import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workflow } from './Workflow.js';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @Column('varchar', { length: 36 })
  workflowId!: string;

  @Column('varchar')
  nodeId!: string;

  @Column('varchar')
  webhookPath!: string;

  @Column('varchar')
  method!: string;

  @Column('boolean', { default: false })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
