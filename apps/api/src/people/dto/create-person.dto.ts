import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

/// Réservé au module RH — voir PeopleService.create() et RequireRole('RH').
export class CreatePersonDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  gender!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Identité nationale — sensible, voir PeopleService.findOne (masquée hors RH).
  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsDateString()
  nationalIdDate?: string;

  @IsOptional()
  @IsString()
  nationalIdPlace?: string;

  // Première affectation, ouverte dans la société qui crée la personne.
  @IsString()
  society!: string;

  @IsString()
  department!: string;

  @IsString()
  position!: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsDateString()
  entryDate?: string;

  // Salaire de cette première affectation — sensible, même règle d'accès.
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;
}
