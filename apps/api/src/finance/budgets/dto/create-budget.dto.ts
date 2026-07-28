import { IsIn, IsInt, IsString, Min } from "class-validator";
import { BUDGET_PERIODS, EXPENSE_CATEGORIES } from "../../finance.constants";

export class CreateBudgetDto {
  @IsString()
  society!: string;

  @IsIn(EXPENSE_CATEGORIES)
  category!: (typeof EXPENSE_CATEGORIES)[number];

  @IsInt()
  @Min(0)
  budgeted!: number;

  @IsIn(BUDGET_PERIODS)
  period!: (typeof BUDGET_PERIODS)[number];
}
