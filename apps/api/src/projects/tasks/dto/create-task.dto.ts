import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { TaskColumn } from "@atfm/db";

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsEnum(TaskColumn)
  column?: TaskColumn;

  @IsOptional()
  @IsString()
  sprint?: string;

  // Doit être membre de l'équipe du projet (voir TasksService.assertProjectMember).
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
