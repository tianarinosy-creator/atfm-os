import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { TaskColumn } from "@atfm/db";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsEnum(TaskColumn)
  column?: TaskColumn;

  @IsOptional()
  @IsString()
  sprint?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
