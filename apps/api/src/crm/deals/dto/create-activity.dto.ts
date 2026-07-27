import { IsEnum, IsString, MinLength } from "class-validator";
import { ActivityType } from "@atfm/db";

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type!: ActivityType;

  @IsString()
  @MinLength(1)
  text!: string;
}
