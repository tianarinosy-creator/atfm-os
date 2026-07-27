import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

export class CreateDealDto {
  @IsString()
  society!: string;

  @IsUUID()
  contactId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number;

  // "Commercial en charge" — person_id du Core Directory (Commercial actif de
  // `society`, vérifié côté service), jamais un nom stocké.
  @IsOptional()
  @IsUUID()
  ownerPersonId?: string;

  @IsOptional()
  @IsDateString()
  nextActionDate?: string;
}
