import { IsString } from "class-validator";

export class QuerySummaryDto {
  @IsString()
  society!: string;
}
