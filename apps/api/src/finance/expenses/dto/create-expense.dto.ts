import { IsDateString, IsIn, IsInt, Min, MinLength, IsString } from "class-validator";
import { Currency } from "@atfm/db";
import { CURRENCIES, EXPENSE_CATEGORIES } from "../../finance.constants";

export class CreateExpenseDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsIn(CURRENCIES)
  currency!: Currency;

  @IsIn(EXPENSE_CATEGORIES)
  category!: (typeof EXPENSE_CATEGORIES)[number];

  @IsDateString()
  date!: string;
}
