import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Workflow } from './Workflow.js';
import { Tag } from './Tag.js';

@Entity('workflow_tags')
export class WorkflowTag {
  @PrimaryColumn('varchar', { length: 36 })
  workflowId!: string;

  @PrimaryColumn('varchar', { length: 36 })
  tagId!: string;

  @ManyToOne(() => Workflow)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @ManyToOne(() => Tag)
  @JoinColumn({ name: 'tagId' })
  tag!: Tag;
}
