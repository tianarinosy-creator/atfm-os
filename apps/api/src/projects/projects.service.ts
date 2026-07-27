import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@atfm/db";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { assertSocietyMember } from "../common/access/assert-society-member";
import { DirectoryLookupService } from "../directory/directory-lookup.service";
import { EmployeeView } from "../people/people.types";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { QueryProjectsDto } from "./dto/query-projects.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { CreateRiskDto } from "./dto/create-risk.dto";
import { UpdateRiskDto } from "./dto/update-risk.dto";

const detailInclude = {
  members: true,
  tasks: { include: { checklist: true, comments: { orderBy: { date: "desc" as const } } }, orderBy: { createdAt: "asc" as const } },
  expenses: { orderBy: { date: "desc" as const } },
  risks: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.ProjectInclude;

type ProjectDetail = Prisma.ProjectGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: DirectoryLookupService,
  ) {}

  private resolvePerson(society: string, personId: string | null, members: Map<string, EmployeeView>) {
    if (!personId) return null;
    return members.get(personId) ?? null;
  }

  /// Résout équipe / assigné / auteur des commentaires depuis le Core Directory —
  /// un Project ne stocke jamais de nom, uniquement des person_id.
  private async withResolvedPeople(project: ProjectDetail) {
    const members = await this.directory.loadSocietyMembers(project.society);
    return {
      ...project,
      members: project.members.map((m) => ({ ...m, person: this.resolvePerson(project.society, m.personId, members) })),
      tasks: project.tasks.map((t) => ({
        ...t,
        assignee: this.resolvePerson(project.society, t.assigneeId, members),
        comments: t.comments.map((c) => ({ ...c, author: this.resolvePerson(project.society, c.authorId, members) })),
      })),
    };
  }

  /// GET /projects?society=&status= — vue "cartes" (progression, budget consommé,
  /// alerte risque) équivalente à la grille du prototype.
  async findAll(query: QueryProjectsDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    const projects = await this.prisma.client.project.findMany({
      where: { society: query.society, ...(query.status ? { status: query.status } : {}) },
      include: {
        tasks: { select: { column: true } },
        expenses: { select: { amount: true } },
        risks: { select: { level: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return projects.map((p) => {
      const done = p.tasks.filter((t) => t.column === "done").length;
      const progress = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
      const spent = p.expenses.reduce((s, e) => s + e.amount, 0);
      const hasOpenHighRisk = p.risks.some((r) => r.status === "Ouvert" && (r.level === "Élevé" || r.level === "Critique"));
      return {
        id: p.id,
        society: p.society,
        name: p.name,
        client: p.client,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        budget: p.budget,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        progress,
        spent,
        hasOpenHighRisk,
      };
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({ where: { id }, include: detailInclude });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);
    return this.withResolvedPeople(project);
  }

  async create(dto: CreateProjectDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    const memberIds = [...new Set(dto.memberIds ?? [])];
    await Promise.all(memberIds.map((personId) => this.directory.assertActiveMember(dto.society, personId)));

    const created = await this.prisma.client.project.create({
      data: {
        society: dto.society,
        name: dto.name,
        client: dto.client,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        budget: dto.budget ?? 0,
        members: { create: memberIds.map((personId) => ({ personId })) },
      },
      include: detailInclude,
    });

    return this.withResolvedPeople(created);
  }

  async update(id: string, dto: UpdateProjectDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, existing.society);

    const updated = await this.prisma.client.project.update({
      where: { id },
      data: {
        name: dto.name,
        client: dto.client,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
      },
      include: detailInclude,
    });

    return this.withResolvedPeople(updated);
  }

  async addMember(id: string, dto: AddMemberDto, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);
    await this.directory.assertActiveMember(project.society, dto.personId);

    try {
      await this.prisma.client.projectMember.create({ data: { projectId: id, personId: dto.personId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Cette personne est déjà membre de l'équipe.");
      }
      throw error;
    }

    return this.findOne(id, actor);
  }

  async removeMember(id: string, personId: string, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);

    await this.prisma.client.projectMember.deleteMany({ where: { projectId: id, personId } });
    return this.findOne(id, actor);
  }

  async addExpense(id: string, dto: CreateExpenseDto, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);

    await this.prisma.client.projectExpense.create({
      data: { projectId: id, label: dto.label, amount: dto.amount, category: dto.category, date: new Date(dto.date) },
    });
    return this.findOne(id, actor);
  }

  async addRisk(id: string, dto: CreateRiskDto, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);

    await this.prisma.client.projectRisk.create({
      data: { projectId: id, text: dto.text, level: dto.level, mitigation: dto.mitigation, status: "Ouvert" },
    });
    return this.findOne(id, actor);
  }

  async updateRiskStatus(id: string, riskId: string, dto: UpdateRiskDto, actor: AuthenticatedUser) {
    const project = await this.prisma.client.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    assertSocietyMember(actor, project.society);

    const risk = await this.prisma.client.projectRisk.findUnique({ where: { id: riskId } });
    if (!risk || risk.projectId !== id) throw new NotFoundException("Risque introuvable pour ce projet.");

    await this.prisma.client.projectRisk.update({ where: { id: riskId }, data: { status: dto.status } });
    return this.findOne(id, actor);
  }
}
