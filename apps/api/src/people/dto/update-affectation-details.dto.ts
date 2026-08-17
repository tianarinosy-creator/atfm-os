import { IsInt, IsOptional, IsString, Min } from "class-validator";

/// Édition des champs "métier" d'une affectation existante (poste, département,
/// manager, salaire) — distinct du changement de statut et du transfert de société,
/// qui restent des opérations séparées (voir people.service.ts).
export class UpdateAffectationDetailsDto {
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  // Sensible — voir PeopleService.findOne (masqué hors RH).
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;
}
