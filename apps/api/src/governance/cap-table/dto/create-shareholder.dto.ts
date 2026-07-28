import { IsIn, IsInt, IsString, Max, Min, MinLength } from "class-validator";
import { SHAREHOLDER_TYPES } from "../../governance.constants";

export class CreateShareholderDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(SHAREHOLDER_TYPES)
  type!: (typeof SHAREHOLDER_TYPES)[number];

  @IsInt()
  @Min(0)
  @Max(100)
  percentage!: number;
}
