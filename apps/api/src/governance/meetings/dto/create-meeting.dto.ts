import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsString, MinLength } from "class-validator";
import { MeetingType } from "@atfm/db";

export class CreateMeetingDto {
  @IsString()
  society!: string;

  @IsEnum(MeetingType)
  type!: MeetingType;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  agenda!: string[];
}
