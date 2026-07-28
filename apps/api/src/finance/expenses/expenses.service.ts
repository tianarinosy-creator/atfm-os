import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { QueryExpensesDto } from "./dto/query-expenses.dto";

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryExpensesDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    return this.prisma.client.financeExpense.findMany({
      where: { society: query.society, ...(query.category ? { category: query.category } : {}) },
      orderBy: { date: "desc" },
    });
  }

  async create(dto: CreateExpenseDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.financeExpense.create({
      data: {
        society: dto.society,
        label: dto.label,
        amount: dto.amount,
        currency: dto.currency,
        category: dto.category,
        date: new Date(dto.date),
        status: "Payée",
      },
    });
  }

  async update(id: string, dto: UpdateExpenseDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.financeExpense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Dépense introuvable.");
    assertSocietyMember(actor, existing.society);

    return this.prisma.client.financeExpense.update({
      where: { id },
      data: {
        label: dto.label,
        amount: dto.amount,
        currency: dto.currency,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        status: dto.status,
      },
    });
  }
}
