import { IsDateString, IsIn, IsInt, IsOptional, Min, MinLength, IsString } from "class-validator";
import { Currency } from "@atfm/db";
import { CURRENCIES, EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "../../finance.constants";

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: Currency;

  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: (typeof EXPENSE_CATEGORIES)[number];

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(EXPENSE_STATUSES)
  status?: (typeof EXPENSE_STATUSES)[number];
}
