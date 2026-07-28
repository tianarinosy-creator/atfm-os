import { IsIn, IsOptional, IsString } from "class-validator";
import { EXPENSE_CATEGORIES } from "../../finance.constants";

export class QueryExpensesDto {
  @IsString()
  society!: string;

  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES)
  category?: (typeof EXPENSE_CATEGORIES)[number];
}
