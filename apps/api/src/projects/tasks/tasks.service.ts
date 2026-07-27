import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { DirectoryLookupService } from "../../directory/directory-lookup.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { CreateChecklistItemDto } from "./dto/create-checklist-item.dto";
import { UpdateChecklistItemDto } from "./dto/update-checklist-item.dto";
import { LogTimeDto } from "./dto/log-time.dto";
import { CreateCommentDto } from "./dto/create-comment.dto";

const taskInclude = {
  checklist: true,
  comments: { orderBy: { date: "desc" as const } },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: DirectoryLookupService,
  ) {}

  /// Charge le projet (avec équipe) et vérifie l'appartenance société — chaque
  /// mutation de tâche passe par cette porte d'entrée commune.
  private async loadProject(projectId: string, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);
    return project;
  }

  private async loadTask(projectId: string, taskId: string) {
    const task = await this.prisma.client.projectTask.findUnique({ where: { id: taskId }, include: taskInclude });
    if (!task || task.projectId !== projectId) throw new NotFoundException("Tâche introuvable pour ce projet.");
    return task;
  }

  private async resolveTask(society: string, task: Awaited<ReturnType<TasksService["loadTask"]>>) {
    const members = await this.directory.loadSocietyMembers(society);
    return {
      ...task,
      assignee: task.assigneeId ? (members.get(task.assigneeId) ?? null) : null,
      comments: task.comments.map((c) => ({ ...c, author: members.get(c.authorId) ?? null })),
    };
  }

  /// L'assigné d'une tâche doit être membre de l'équipe du projet (voir
  /// NewTaskModal du prototype, qui ne propose que `project.team`).
  private assertProjectMember(project: { members: { personId: string }[] }, personId: string) {
    if (!project.members.some((m) => m.personId === personId)) {
      throw new BadRequestException("L'assigné doit être membre de l'équipe du projet.");
    }
  }

  async createTask(projectId: string, dto: CreateTaskDto, actor: AuthenticatedUser) {
    const project = await this.loadProject(projectId, actor);
    if (dto.assigneeId) this.assertProjectMember(project, dto.assigneeId);

    const task = await this.prisma.client.projectTask.create({
      data: {
        projectId,
        title: dto.title,
        column: dto.column ?? "todo",
        sprint: dto.sprint,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: taskInclude,
    });
    return this.resolveTask(project.society, task);
  }

  async updateTask(projectId: string, taskId: string, dto: UpdateTaskDto, actor: AuthenticatedUser) {
    const project = await this.loadProject(projectId, actor);
    await this.loadTask(projectId, taskId);
    if (dto.assigneeId) this.assertProjectMember(project, dto.assigneeId);

    const updated = await this.prisma.client.projectTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        column: dto.column,
        sprint: dto.sprint,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: taskInclude,
    });
    return this.resolveTask(project.society, updated);
  }

  async addChecklistItem(projectId: string, taskId: string, dto: CreateChecklistItemDto, actor: AuthenticatedUser) {
    const project = await this.loadProject(projectId, actor);
    await this.loadTask(projectId, taskId);

    await this.prisma.client.projectTaskChecklistItem.create({ data: { taskId, text: dto.text } });
    return this.resolveTask(project.society, await this.loadTask(projectId, taskId));
  }

  async updateChecklistItem(
    projectId: string,
    taskId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
    actor: AuthenticatedUser,
  ) {
    const project = await this.loadProject(projectId, actor);
    await this.loadTask(projectId, taskId);

    const item = await this.prisma.client.projectTaskChecklistItem.findUnique({ where: { id: itemId } });
    if (!item || item.taskId !== taskId) throw new NotFoundException("Élément de checklist introuvable.");

    await this.prisma.client.projectTaskChecklistItem.update({ where: { id: itemId }, data: { done: dto.done } });
    return this.resolveTask(project.society, await this.loadTask(projectId, taskId));
  }

  async removeChecklistItem(projectId: string, taskId: string, itemId: string, actor: AuthenticatedUser) {
    const project = await this.loadProject(projectId, actor);
    await this.loadTask(projectId, taskId);

    const item = await this.prisma.client.projectTaskChecklistItem.findUnique({ where: { id: itemId } });
    if (!item || item.taskId !== taskId) throw new NotFoundException("Élément de checklist introuvable.");

    await this.prisma.client.projectTaskChecklistItem.delete({ where: { id: itemId } });
    return this.resolveTask(project.society, await this.loadTask(projectId, taskId));
  }

  /// Additif — jamais un remplacement (voir logTime() du prototype).
  async logTime(projectId: string, taskId: string, dto: LogTimeDto, actor: AuthenticatedUser) {
    const project = await this.loadProject(projectId, actor);
    await this.loadTask(projectId, taskId);

    const updated = await this.prisma.client.projectTask.update({
      where: { id: taskId },
      data: { timeLoggedH: { increment: dto.hours } },
      include: taskInclude,
    });
    return this.resolveTask(project.society, updated);
  }

  /// L'auteur est toujours l'acteur authentifié — jamais un champ libre côté client.
  async addComment(projectId: string, taskId: string, dto: CreateCommentDto, actor: AuthenticatedUser) {
    const project = await this.loadProject(projectId, actor);
    await this.loadTask(projectId, taskId);

    await this.prisma.client.projectTaskComment.create({
      data: { taskId, authorId: actor.personId, text: dto.text },
    });
    return this.resolveTask(project.society, await this.loadTask(projectId, taskId));
  }
}
