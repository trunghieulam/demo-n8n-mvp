import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('Workflow', 'webhooks')
  @JoinColumn({ name: 'workflowId' })
  workflow!: any;

  @Column('uuid')
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
