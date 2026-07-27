import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { CreateChecklistItemDto } from "./dto/create-checklist-item.dto";
import { UpdateChecklistItemDto } from "./dto/update-checklist-item.dto";
import { LogTimeDto } from "./dto/log-time.dto";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

@Controller("projects/:projectId/tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasksService.createTask(projectId, dto, actor);
  }

  @Patch(":taskId")
  update(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasksService.updateTask(projectId, taskId, dto, actor);
  }

  @Post(":taskId/checklist")
  addChecklistItem(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasksService.addChecklistItem(projectId, taskId, dto, actor);
  }

  @Patch(":taskId/checklist/:itemId")
  updateChecklistItem(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasksService.updateChecklistItem(projectId, taskId, itemId, dto, actor);
  }

  @Delete(":taskId/checklist/:itemId")
  removeChecklistItem(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasksService.removeChecklistItem(projectId, taskId, itemId, actor);
  }

  @Post(":taskId/time-entries")
  logTime(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Body() dto: LogTimeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasksService.logTime(projectId, taskId, dto, actor);
  }

  @Post(":taskId/comments")
  addComment(
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tasksService.addComment(projectId, taskId, dto, actor);
  }
}
