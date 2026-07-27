import { IsArray, IsDateString, IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateContactDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  position?: string;

  // Introducteur — texte libre (pas nécessairement une personne du Core Directory).
  @IsOptional()
  @IsString()
  referredBy?: string;

  @IsOptional()
  @IsDateString()
  entryDate?: string;

  // "Traité par" — jamais un nom, uniquement un person_id du Core Directory
  // (doit être un Commercial actif de `society`, vérifié côté service).
  @IsOptional()
  @IsUUID()
  handledByPersonId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
