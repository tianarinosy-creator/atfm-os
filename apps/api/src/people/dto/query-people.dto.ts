import { IsEnum, IsOptional, IsString } from "class-validator";
import { AffectationStatus } from "@atfm/db";

/// Ex. GET /people?society=logistics&position=Commercial — c'est l'endpoint que le
/// CRM interroge en lecture seule pour peupler "Commercial en charge" (jamais de
/// duplication de la liste des commerciaux côté CRM).
export class QueryPeopleDto {
  @IsOptional()
  @IsString()
  society?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(AffectationStatus)
  status?: AffectationStatus;
}
