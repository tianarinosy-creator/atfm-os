import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { InvestmentStage } from "@atfm/db";
import { DUE_DILIGENCE_STATUSES, ROUND_STATUSES, ROUND_TYPES } from "../../investments.constants";

/// Reflète `updateStartup(id, patch)` du prototype : un patch générique, tous les
/// champs sont optionnels — utilisé aussi bien pour le drag & drop du pipeline
/// (juste `stage`) que pour les notes, le statut de DD ou la levée en cours.
export class UpdateStartupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  founder?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(InvestmentStage)
  stage?: InvestmentStage;

  @IsOptional()
  @IsString()
  pitchNotes?: string;

  @IsOptional()
  @IsString()
  businessPlanNotes?: string;

  @IsOptional()
  @IsIn(DUE_DILIGENCE_STATUSES)
  dueDiligenceStatus?: (typeof DUE_DILIGENCE_STATUSES)[number];

  @IsOptional()
  @IsIn(ROUND_TYPES)
  round?: (typeof ROUND_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  amountTarget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountRaised?: number;

  @IsOptional()
  @IsIn(ROUND_STATUSES)
  roundStatus?: (typeof ROUND_STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  valuationPreMoney?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  valuationPostMoney?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentValuation?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  atfmInvested?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  atfmStakePercentage?: number;

  @IsOptional()
  @IsDateString()
  dateInvested?: string | null;
}
