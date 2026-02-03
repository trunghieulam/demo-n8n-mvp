import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Workflow } from './Workflow.js';
import { Execution } from './Execution.js';
import { Credential } from './Credential.js';
import { Tag } from './Tag.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  email!: string;

  @Column('varchar')
  password!: string; // hashed

  @Column('varchar')
  firstName!: string;

  @Column('varchar')
  lastName!: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Workflow, (workflow) => workflow.user)
  workflows!: Workflow[];

  @OneToMany(() => Execution, (execution) => execution.user)
  executions!: Execution[];

  @OneToMany(() => Credential, (credential) => credential.user)
  credentials!: Credential[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags!: Tag[];
}
