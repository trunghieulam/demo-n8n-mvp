import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from './User.js';
import type { INode, IConnections, WorkflowSettings } from '@shared/types';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('json')
  nodes!: INode[];

  @Column('json')
  connections!: IConnections;

  @Column('boolean', { default: false })
  isActive!: boolean;

  @Column('json', { nullable: true })
  staticData?: Record<string, unknown>;

  @Column('json', { nullable: true })
  settings?: WorkflowSettings;

  @ManyToOne('User', 'workflows')
  @JoinColumn({ name: 'userId' })
  user!: any;

  @Column('uuid')
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany('Execution', 'workflow')
  executions!: any[];

  @OneToMany('Webhook', 'workflow')
  webhooks!: any[];

  @ManyToMany('Tag', 'workflows')
  @JoinTable({
    name: 'workflow_tags',
    joinColumn: { name: 'workflowId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags!: any[];
}
