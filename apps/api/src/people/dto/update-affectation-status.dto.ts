import { IsEnum, IsOptional, IsString } from "class-validator";
import { AffectationStatus } from "@atfm/db";

export class UpdateAffectationStatusDto {
  @IsEnum(AffectationStatus)
  status!: AffectationStatus;

  // Qui prend le relais si le statut passe à Inactif (voir prototype "replacement").
  @IsOptional()
  @IsString()
  replacement?: string;
}
