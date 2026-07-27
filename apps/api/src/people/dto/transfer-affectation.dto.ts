import { IsDateString, IsOptional, IsString } from "class-validator";

/// Transfert de société : clôture l'affectation active dans fromSociety, en ouvre
/// une nouvelle dans toSociety. L'historique lié à fromSociety n'est jamais supprimé.
export class TransferAffectationDto {
  @IsString()
  fromSociety!: string;

  @IsString()
  toSociety!: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsDateString()
  entryDate?: string;
}
