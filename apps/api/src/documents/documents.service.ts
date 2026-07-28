import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { assertSocietyMember } from "../common/access/assert-society-member";
import { DirectoryLookupService } from "../directory/directory-lookup.service";
import { QueryDocumentsDto } from "./dto/query-documents.dto";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { DOC_PERMISSIONS } from "./documents.constants";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: DirectoryLookupService,
  ) {}

  private async withResolvedOwner(society: string, doc: { ownerPersonId: string }) {
    const members = await this.directory.loadSocietyMembers(society);
    return { ...doc, owner: members.get(doc.ownerPersonId) ?? null };
  }

  private async withResolvedOwners<T extends { ownerPersonId: string }>(society: string, docs: T[]) {
    const members = await this.directory.loadSocietyMembers(society);
    return docs.map((d) => ({ ...d, owner: members.get(d.ownerPersonId) ?? null }));
  }

  /// GET /documents?society=&category=&archived=&search= — reprend le filtrage
  /// de DocumentsMain (categoryFilter, showArchived par défaut à false, recherche
  /// sur le nom ET le propriétaire résolu).
  async findAll(query: QueryDocumentsDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);
    const archived = query.archived === "true";

    const docs = await this.prisma.client.document.findMany({
      where: {
        society: query.society,
        archived,
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: { updatedDate: "desc" },
    });

    const resolved = await this.withResolvedOwners(query.society, docs);

    const q = query.search?.trim().toLowerCase();
    if (!q) return resolved;
    return resolved.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.owner?.name.toLowerCase().includes(q) ?? false),
    );
  }

  async create(dto: CreateDocumentDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);
    await this.directory.assertActiveMember(dto.society, dto.ownerPersonId);

    const created = await this.prisma.client.document.create({
      data: {
        society: dto.society,
        name: dto.name,
        category: dto.category,
        ownerPersonId: dto.ownerPersonId,
        permissions: dto.permissions ?? DOC_PERMISSIONS[0],
        signatureStatus: dto.category === "Contrats" ? "En attente" : null,
      },
    });

    return this.withResolvedOwner(dto.society, created);
  }

  /// PATCH /documents/:id/new-version — incrémente la version et rafraîchit
  /// updatedDate (voir newVersion(id) du prototype).
  async newVersion(id: string, actor: AuthenticatedUser) {
    const existing = await this.assertExists(id, actor);

    const updated = await this.prisma.client.document.update({
      where: { id },
      data: { version: { increment: 1 }, updatedDate: new Date() },
    });
    return this.withResolvedOwner(existing.society, updated);
  }

  /// PATCH /documents/:id/archive-toggle (voir toggleArchive(id) du prototype).
  async toggleArchive(id: string, actor: AuthenticatedUser) {
    const existing = await this.assertExists(id, actor);

    const updated = await this.prisma.client.document.update({
      where: { id },
      data: { archived: !existing.archived },
    });
    return this.withResolvedOwner(existing.society, updated);
  }

  /// PATCH /documents/:id/signature-toggle — bascule Signé <-> En attente
  /// (voir toggleSignature(id) du prototype ; n'a de sens que si une signature
  /// est déjà attendue, ex. un Contrat).
  async toggleSignature(id: string, actor: AuthenticatedUser) {
    const existing = await this.assertExists(id, actor);
    if (!existing.signatureStatus) {
      throw new BadRequestException("Ce document n'est associé à aucun processus de signature.");
    }

    const updated = await this.prisma.client.document.update({
      where: { id },
      data: { signatureStatus: existing.signatureStatus === "Signé" ? "En attente" : "Signé" },
    });
    return this.withResolvedOwner(existing.society, updated);
  }

  /// PATCH /documents/:id/cycle-permission — fait tourner Public interne ->
  /// Restreint -> Direction uniquement -> Public interne (voir cyclePermission(id)).
  async cyclePermission(id: string, actor: AuthenticatedUser) {
    const existing = await this.assertExists(id, actor);

    const idx = DOC_PERMISSIONS.indexOf(existing.permissions as (typeof DOC_PERMISSIONS)[number]);
    const next = DOC_PERMISSIONS[(idx + 1) % DOC_PERMISSIONS.length];

    const updated = await this.prisma.client.document.update({ where: { id }, data: { permissions: next } });
    return this.withResolvedOwner(existing.society, updated);
  }

  private async assertExists(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Document introuvable.");
    assertSocietyMember(actor, existing.society);
    return existing;
  }
}
