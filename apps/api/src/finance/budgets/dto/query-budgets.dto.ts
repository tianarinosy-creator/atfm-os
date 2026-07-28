import { IsString } from "class-validator";

export class QueryBudgetsDto {
  @IsString()
  society!: string;
}
