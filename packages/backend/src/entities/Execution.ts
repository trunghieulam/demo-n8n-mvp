import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.js';
import { Workflow } from './Workflow.js';
import type { ExecutionMode, ExecutionStatus, ExecutionData, WorkflowSnapshot } from '@shared/types';

@Entity('executions')
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @Column('varchar', { length: 36 })
  workflowId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('varchar', { length: 36 })
  userId!: string;

  @Column('varchar')
  mode!: ExecutionMode;

  @Column('varchar')
  status!: ExecutionStatus;

  @Column('datetime')
  startedAt!: Date;

  @Column('datetime', { nullable: true })
  finishedAt?: Date;

  @Column('json')
  executionData!: ExecutionData;

  @Column('json')
  workflowData!: WorkflowSnapshot;

  @Column('varchar', { length: 36, nullable: true })
  retryOf?: string;
}
