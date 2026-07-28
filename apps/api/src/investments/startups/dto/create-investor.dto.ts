import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { INVESTOR_TYPES } from "../../investments.constants";

export class CreateInvestorDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(INVESTOR_TYPES)
  type!: (typeof INVESTOR_TYPES)[number];

  @IsOptional()
  @IsString()
  contact?: string;
}
