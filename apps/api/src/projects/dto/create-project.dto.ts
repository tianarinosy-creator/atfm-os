import { IsArray, IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  client?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;

  // Équipe initiale — person_id du Core Directory, jamais un nom (chacun doit
  // avoir une affectation active chez `society`, vérifié côté service).
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  memberIds?: string[];
}
