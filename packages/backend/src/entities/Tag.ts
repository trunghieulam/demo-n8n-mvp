import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
} from 'typeorm';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @ManyToOne('User', 'tags')
  @JoinColumn({ name: 'userId' })
  user!: any;

  @Column('uuid')
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany('Workflow', 'tags')
  workflows!: any[];
}
