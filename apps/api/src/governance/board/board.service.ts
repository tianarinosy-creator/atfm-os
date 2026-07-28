import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { CreateBoardMemberDto } from "./dto/create-board-member.dto";
import { QueryBoardDto } from "./dto/query-board.dto";

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryBoardDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    return this.prisma.client.boardMember.findMany({
      where: { society: query.society },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(dto: CreateBoardMemberDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.boardMember.create({
      data: { society: dto.society, name: dto.name, role: dto.role, title: dto.title, since: dto.since },
    });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.boardMember.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Membre du Conseil introuvable.");
    assertSocietyMember(actor, existing.society);

    await this.prisma.client.boardMember.delete({ where: { id } });
    return { id };
  }
}
