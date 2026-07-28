import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { ROUND_TYPES } from "../../investments.constants";

export class CreateStartupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  founder?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(ROUND_TYPES)
  round!: (typeof ROUND_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  amountTarget?: number;
}
