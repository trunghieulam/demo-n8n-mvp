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
import { Execution } from './Execution.js';
import { Webhook } from './Webhook.js';
import { Tag } from './Tag.js';
import { WorkflowTag } from './WorkflowTag.js';
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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('varchar', { length: 36 })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Execution, (execution) => execution.workflow)
  executions!: Execution[];

  @OneToMany(() => Webhook, (webhook) => webhook.workflow)
  webhooks!: Webhook[];

  @ManyToMany(() => Tag, (tag) => tag.workflows)
  @JoinTable({
    name: 'workflow_tags',
    joinColumn: { name: 'workflowId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags!: Tag[];
}
