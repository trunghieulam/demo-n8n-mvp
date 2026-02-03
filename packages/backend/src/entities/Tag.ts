import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { User } from './User.js';
import { Workflow } from './Workflow.js';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('varchar', { length: 36 })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Workflow, (workflow) => workflow.tags)
  workflows!: Workflow[];
}
