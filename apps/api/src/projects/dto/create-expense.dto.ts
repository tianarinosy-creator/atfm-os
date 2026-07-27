import { IsDateString, IsInt, IsString, Min, MinLength } from "class-validator";

export class CreateExpenseDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  category!: string;

  @IsDateString()
  date!: string;
}
