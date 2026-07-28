import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { QueryInvoicesDto } from "./dto/query-invoices.dto";

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryInvoicesDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    return this.prisma.client.financeInvoice.findMany({
      where: { society: query.society, ...(query.status ? { status: query.status } : {}) },
      orderBy: { issueDate: "desc" },
    });
  }

  async create(dto: CreateInvoiceDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.financeInvoice.create({
      data: {
        society: dto.society,
        client: dto.client,
        amount: dto.amount,
        currency: dto.currency,
        status: "En attente",
        issueDate: new Date(),
        dueDate: new Date(dto.dueDate),
        category: dto.category ?? "Vente de services",
      },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.financeInvoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Facture introuvable.");
    assertSocietyMember(actor, existing.society);

    return this.prisma.client.financeInvoice.update({
      where: { id },
      data: {
        client: dto.client,
        amount: dto.amount,
        currency: dto.currency,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        category: dto.category,
      },
    });
  }
}
