import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import { DealStage } from "@atfm/db";

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @IsOptional()
  @IsUUID()
  ownerPersonId?: string | null;

  @IsOptional()
  @IsDateString()
  nextActionDate?: string | null;
}
