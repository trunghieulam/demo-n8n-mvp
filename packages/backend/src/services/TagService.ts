import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { Tag } from '../entities/Tag.js';
import { WorkflowTag } from '../entities/WorkflowTag.js';
import { Workflow } from '../entities/Workflow.js';

export class TagService {
  private tagRepository: Repository<Tag>;
  private workflowTagRepository: Repository<WorkflowTag>;
  private workflowRepository: Repository<Workflow>;

  constructor() {
    this.tagRepository = AppDataSource.getRepository(Tag);
    this.workflowTagRepository = AppDataSource.getRepository(WorkflowTag);
    this.workflowRepository = AppDataSource.getRepository(Workflow);
  }

  async create(userId: string, name: string): Promise<Tag> {
    // Check for duplicate name per user (case-insensitive)
    const existing = await this.tagRepository.findOne({
      where: { userId, name: name.toLowerCase() },
    });

    if (existing) {
      throw new Error('Tag with this name already exists');
    }

    const tag = this.tagRepository.create({
      userId,
      name: name.toLowerCase(),
    });

    return await this.tagRepository.save(tag);
  }

  async list(userId: string): Promise<Array<Tag & { workflowCount: number }>> {
    const tags = await this.tagRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });

    // Get workflow counts for each tag
    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        const count = await this.workflowTagRepository.count({
          where: { tagId: tag.id },
        });
        return { ...tag, workflowCount: count };
      })
    );

    return tagsWithCounts;
  }

  async delete(tagId: string, userId: string): Promise<void> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId, userId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    // Remove all workflow associations
    await this.workflowTagRepository.delete({ tagId });

    // Delete tag
    await this.tagRepository.remove(tag);
  }

  async addToWorkflow(workflowId: string, tagIds: string[], userId: string): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Verify all tags belong to user
    const tags = await this.tagRepository.find({
      where: { id: tagIds as any, userId },
    });

    if (tags.length !== tagIds.length) {
      throw new Error('One or more tags not found');
    }

    // Remove existing associations
    await this.workflowTagRepository.delete({ workflowId });

    // Create new associations
    const workflowTags = tagIds.map((tagId) =>
      this.workflowTagRepository.create({ workflowId, tagId })
    );

    await this.workflowTagRepository.save(workflowTags);
  }

  async removeFromWorkflow(workflowId: string, tagIds: string[], userId: string): Promise<void> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await this.workflowTagRepository.delete({
      workflowId,
      tagId: tagIds as any,
    });
  }
}
