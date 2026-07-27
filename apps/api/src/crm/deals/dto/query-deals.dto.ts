import { IsEnum, IsOptional, IsString } from "class-validator";
import { DealStage } from "@atfm/db";

export class QueryDealsDto {
  @IsString()
  society!: string;

  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;
}
