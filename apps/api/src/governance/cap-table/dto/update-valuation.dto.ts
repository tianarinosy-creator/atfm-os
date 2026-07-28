import { IsInt, IsString, Min } from "class-validator";

export class UpdateValuationDto {
  @IsString()
  society!: string;

  @IsInt()
  @Min(0)
  valuation!: number;
}
