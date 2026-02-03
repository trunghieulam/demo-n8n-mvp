import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  type!: string;

  @Column('text')
  data!: string; // encrypted JSON

  @ManyToOne('User', 'credentials')
  @JoinColumn({ name: 'userId' })
  user!: any;

  @Column('uuid')
  userId!: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
