import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProjectStatus } from "@atfm/db";

export class QueryProjectsDto {
  @IsString()
  society!: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
