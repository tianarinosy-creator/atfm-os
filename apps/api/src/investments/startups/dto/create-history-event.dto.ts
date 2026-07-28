import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateHistoryEventDto {
  @IsString()
  @MinLength(1)
  event!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date!: string;
}
