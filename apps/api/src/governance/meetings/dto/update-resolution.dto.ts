import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import { RESOLUTION_STATUSES } from "../../governance.constants";

export class UpdateResolutionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  votesFor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  votesAgainst?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  votesAbstain?: number;

  @IsOptional()
  @IsIn(RESOLUTION_STATUSES)
  status?: (typeof RESOLUTION_STATUSES)[number];
}
