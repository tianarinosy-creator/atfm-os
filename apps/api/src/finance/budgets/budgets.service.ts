import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { toEUR } from "../finance.constants";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { QueryBudgetsDto } from "./dto/query-budgets.dto";

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  /// GET /finance/budgets?society= — budget vs réel consommé par catégorie (voir
  /// BudgetsView du prototype).
  async findAll(query: QueryBudgetsDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    const [budgets, expenses] = await Promise.all([
      this.prisma.client.financeBudget.findMany({ where: { society: query.society } }),
      this.prisma.client.financeExpense.findMany({ where: { society: query.society } }),
    ]);

    return budgets.map((b) => {
      const actual = expenses
        .filter((e) => e.category === b.category)
        .reduce((s, e) => s + toEUR(e.amount, e.currency), 0);
      const pct = b.budgeted ? Math.min(100, Math.round((actual / b.budgeted) * 100)) : 0;
      const over = actual > b.budgeted;
      return { ...b, actual, pct, over };
    });
  }

  async create(dto: CreateBudgetDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.financeBudget.create({
      data: { society: dto.society, category: dto.category, budgeted: dto.budgeted, period: dto.period },
    });
  }
}
