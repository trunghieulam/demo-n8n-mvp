import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.js';
import type { ExecutionMode, ExecutionStatus, ExecutionData, WorkflowSnapshot } from '@shared/types';

@Entity('executions')
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Workflow', 'executions')
  @JoinColumn({ name: 'workflowId' })
  workflow!: any;

  @Column('uuid')
  workflowId!: string;

  @ManyToOne('User', 'executions')
  @JoinColumn({ name: 'userId' })
  user!: any;

  @Column('uuid')
  userId!: string;

  @Column('varchar')
  mode!: ExecutionMode;

  @Column('varchar')
  status!: ExecutionStatus;

  @Column('timestamp')
  startedAt!: Date;

  @Column('timestamp', { nullable: true })
  finishedAt?: Date;

  @Column('json')
  executionData!: ExecutionData;

  @Column('json')
  workflowData!: WorkflowSnapshot;

  @Column('uuid', { nullable: true })
  retryOf?: string;
}
