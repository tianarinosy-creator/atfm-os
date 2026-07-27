import { IsEnum, IsOptional, IsString } from "class-validator";
import { AffectationStatus } from "@atfm/db";

/// Ex. GET /people?society=logistics&department=Commercial — c'est l'endpoint que le
/// CRM interroge en lecture seule pour peupler "Commercial en charge" (jamais de
/// duplication de la liste des commerciaux côté CRM). Le filtre porte sur
/// `department` : `position` est un intitulé de poste libre (ex. "Chargée grands
/// comptes"), pas une valeur stable à filtrer.
export class QueryPeopleDto {
  @IsOptional()
  @IsString()
  society?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(AffectationStatus)
  status?: AffectationStatus;
}
