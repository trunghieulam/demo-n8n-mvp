import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('workflow_tags')
export class WorkflowTag {
  @PrimaryColumn('uuid')
  workflowId!: string;

  @PrimaryColumn('uuid')
  tagId!: string;

  @ManyToOne('Workflow', 'tags')
  @JoinColumn({ name: 'workflowId' })
  workflow!: any;

  @ManyToOne('Tag', 'workflows')
  @JoinColumn({ name: 'tagId' })
  tag!: any;
}
