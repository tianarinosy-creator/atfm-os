import { IsString } from "class-validator";

export class QueryMeetingsDto {
  @IsString()
  society!: string;
}
