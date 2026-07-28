import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";
import { QueryMeetingsDto } from "./dto/query-meetings.dto";
import { CreateResolutionDto } from "./dto/create-resolution.dto";
import { UpdateResolutionDto } from "./dto/update-resolution.dto";

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryMeetingsDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    return this.prisma.client.governanceMeeting.findMany({
      where: { society: query.society },
      include: { resolutions: true },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const meeting = await this.prisma.client.governanceMeeting.findUnique({
      where: { id },
      include: { resolutions: { orderBy: { createdAt: "asc" } } },
    });
    if (!meeting) throw new NotFoundException("Réunion introuvable.");
    assertSocietyMember(actor, meeting.society);
    return meeting;
  }

  async create(dto: CreateMeetingDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.governanceMeeting.create({
      data: { society: dto.society, type: dto.type, title: dto.title, date: new Date(dto.date), agenda: dto.agenda, status: "Planifiée" },
      include: { resolutions: true },
    });
  }

  async update(id: string, dto: UpdateMeetingDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.governanceMeeting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Réunion introuvable.");
    assertSocietyMember(actor, existing.society);

    return this.prisma.client.governanceMeeting.update({
      where: { id },
      data: { status: dto.status, minutes: dto.minutes },
      include: { resolutions: { orderBy: { createdAt: "asc" } } },
    });
  }

  async addResolution(meetingId: string, dto: CreateResolutionDto, actor: AuthenticatedUser) {
    const meeting = await this.prisma.client.governanceMeeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable.");
    assertSocietyMember(actor, meeting.society);

    await this.prisma.client.governanceResolution.create({
      data: { meetingId, text: dto.text, status: "En délibération" },
    });
    return this.findOne(meetingId, actor);
  }

  async updateResolution(meetingId: string, resolutionId: string, dto: UpdateResolutionDto, actor: AuthenticatedUser) {
    const meeting = await this.prisma.client.governanceMeeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException("Réunion introuvable.");
    assertSocietyMember(actor, meeting.society);

    const resolution = await this.prisma.client.governanceResolution.findUnique({ where: { id: resolutionId } });
    if (!resolution || resolution.meetingId !== meetingId) throw new NotFoundException("Résolution introuvable pour cette réunion.");

    await this.prisma.client.governanceResolution.update({
      where: { id: resolutionId },
      data: { votesFor: dto.votesFor, votesAgainst: dto.votesAgainst, votesAbstain: dto.votesAbstain, status: dto.status },
    });
    return this.findOne(meetingId, actor);
  }

  /// GET /governance/decisions?society= — Historique des décisions : jamais une
  /// table à part, une vue dérivée qui aplatit les résolutions de toutes les
  /// réunions, triée par date de réunion décroissante (voir HistoriqueView).
  async findDecisions(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const meetings = await this.prisma.client.governanceMeeting.findMany({
      where: { society },
      include: { resolutions: true },
    });

    return meetings
      .flatMap((m) =>
        m.resolutions.map((r) => ({
          ...r,
          meetingId: m.id,
          meetingTitle: m.title,
          meetingDate: m.date,
        })),
      )
      .sort((a, b) => b.meetingDate.getTime() - a.meetingDate.getTime());
  }
}
