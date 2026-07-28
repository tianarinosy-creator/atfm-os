import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices/invoices.controller";
import { InvoicesService } from "./invoices/invoices.service";
import { ExpensesController } from "./expenses/expenses.controller";
import { ExpensesService } from "./expenses/expenses.service";
import { BudgetsController } from "./budgets/budgets.controller";
import { BudgetsService } from "./budgets/budgets.service";
import { SummaryController } from "./summary/summary.controller";
import { SummaryService } from "./summary/summary.service";

@Module({
  controllers: [InvoicesController, ExpensesController, BudgetsController, SummaryController],
  providers: [InvoicesService, ExpensesService, BudgetsService, SummaryService],
})
export class FinanceModule {}
