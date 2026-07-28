import { IsIn, IsOptional, IsString } from "class-validator";
import { MEETING_STATUSES } from "../../governance.constants";

export class UpdateMeetingDto {
  @IsOptional()
  @IsIn(MEETING_STATUSES)
  status?: (typeof MEETING_STATUSES)[number];

  @IsOptional()
  @IsString()
  minutes?: string;
}
