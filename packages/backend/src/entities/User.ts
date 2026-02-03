import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

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

  @OneToMany('Workflow', 'user')
  workflows!: any[];

  @OneToMany('Execution', 'user')
  executions!: any[];

  @OneToMany('Credential', 'user')
  credentials!: any[];

  @OneToMany('Tag', 'user')
  tags!: any[];
}
