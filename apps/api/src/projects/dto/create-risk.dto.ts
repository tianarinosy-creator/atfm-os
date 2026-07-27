import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { RISK_LEVELS } from "../projects.constants";

export class CreateRiskDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsIn(RISK_LEVELS)
  level!: (typeof RISK_LEVELS)[number];

  @IsOptional()
  @IsString()
  mitigation?: string;
}
