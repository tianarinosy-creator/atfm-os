import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

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
}
