import { BadRequestException, Injectable } from "@nestjs/common";
import { Currency, DealStage, OdooModuleId } from "@atfm/db";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { assertSocietyMember } from "../../../common/access/assert-society-member";
import { PeopleService } from "../../../people/people.service";
import { ContactsService } from "../../../crm/contacts/contacts.service";
import { DealsService } from "../../../crm/deals/deals.service";
import { InvoicesService } from "../../../finance/invoices/invoices.service";
import { ProjectsService } from "../../../projects/projects.service";
import { DocumentsService } from "../../../documents/documents.service";
import { CURRENCIES, INVOICE_STATUSES } from "../../../finance/finance.constants";
import { OdooClient } from "../odoo-client";
import { decryptSecret } from "../odoo-crypto.util";
import { IMPORT_PAGE_SIZE } from "../odoo.constants";

interface ModuleImportResult {
  available: number;
  imported: number;
  truncated: boolean;
  errors: string[];
}

/// Moteur d'import réel — pour chaque module sélectionné, interroge réellement
/// l'instance Odoo (search_count + search_read, jamais de données simulées) et
/// crée de vrais enregistrements via les services métier déjà existants
/// (PeopleService, ContactsService...), qui appliquent leurs propres règles
/// (ex. "seul le RH crée une personne"). Un enregistrement Odoo en échec ne
/// bloque jamais les suivants — son message d'erreur réel est conservé dans le
/// rapport, jamais une progression fictive.
@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly peopleService: PeopleService,
    private readonly contactsService: ContactsService,
    private readonly dealsService: DealsService,
    private readonly invoicesService: InvoicesService,
    private readonly projectsService: ProjectsService,
    private readonly documentsService: DocumentsService,
  ) {}

  async runImport(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const connection = await this.prisma.client.odooConnection.findUnique({ where: { society } });
    if (!connection || !connection.connected) {
      throw new BadRequestException("Aucune connexion Odoo active pour cette société — connectez-vous d'abord.");
    }
    if (connection.selectedModules.length === 0) {
      throw new BadRequestException("Sélectionnez au moins un module à importer avant de lancer l'import.");
    }

    const client = new OdooClient({
      url: connection.url,
      database: connection.database,
      username: connection.username,
      apiKey: decryptSecret(connection.apiKeyEncrypted),
    });
    // Réauthentification systématique — jamais un uid mis en cache : une clé
    // API révoquée côté Odoo doit immédiatement bloquer l'import.
    const uid = await client.authenticate();

    const reports = [];
    for (const moduleId of connection.selectedModules) {
      const result = await this.importModule(moduleId, society, actor, client, uid);
      const report = await this.prisma.client.odooMigrationReport.create({
        data: { society, moduleId, ...result },
      });
      reports.push(report);
    }

    return reports;
  }

  async getReports(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);
    return this.prisma.client.odooMigrationReport.findMany({ where: { society }, orderBy: { runAt: "desc" } });
  }

  private importModule(
    moduleId: OdooModuleId,
    society: string,
    actor: AuthenticatedUser,
    client: OdooClient,
    uid: number,
  ): Promise<ModuleImportResult> {
    switch (moduleId) {
      case "crm":
        return this.importCrm(society, actor, client, uid);
      case "documents":
        return this.importDocuments(society, actor, client, uid);
      case "rh":
        return this.importRh(society, actor, client, uid);
      case "facturation":
        return this.importFacturation(society, actor, client, uid);
      case "projets":
        return this.importProjets(society, actor, client, uid);
    }
  }

  private async importCrm(society: string, actor: AuthenticatedUser, client: OdooClient, uid: number): Promise<ModuleImportResult> {
    const model = "crm.lead";
    const fields = ["name", "partner_name", "email_from", "phone", "expected_revenue", "stage_id"];
    const available = await client.searchCount(uid, model, []);
    const records = await client.searchRead(uid, model, [], fields, 0, IMPORT_PAGE_SIZE);

    let imported = 0;
    const errors: string[] = [];
    for (const record of records) {
      try {
        const contact = await this.contactsService.create(
          {
            society,
            name: this.asString(record.partner_name) ?? this.asString(record.name) ?? "Contact importé",
            email: this.sanitizeEmail(record.email_from),
            phone: this.asString(record.phone),
            company: this.asString(record.partner_name),
          },
          actor,
        );
        const deal = await this.dealsService.create(
          {
            society,
            contactId: contact.id,
            title: this.asString(record.name) ?? "Affaire importée",
            value: Math.max(0, Math.round(Number(record.expected_revenue) || 0)),
          },
          actor,
        );
        const stage = this.mapOdooCrmStage(record.stage_id);
        if (stage !== "prospect") {
          await this.dealsService.update(deal.id, { stage }, actor);
        }
        imported++;
      } catch (error) {
        errors.push(`Enregistrement Odoo #${record.id} : ${(error as Error).message}`);
      }
    }
    return { available, imported, truncated: available > records.length, errors };
  }

  private async importDocuments(
    society: string,
    actor: AuthenticatedUser,
    client: OdooClient,
    uid: number,
  ): Promise<ModuleImportResult> {
    const model = "documents.document";
    const fields = ["name", "folder_id", "owner_id", "create_date"];
    const available = await client.searchCount(uid, model, []);
    const records = await client.searchRead(uid, model, [], fields, 0, IMPORT_PAGE_SIZE);

    let imported = 0;
    const errors: string[] = [];
    for (const record of records) {
      try {
        // "Propriétaire" : Odoo ne renvoie qu'un utilisateur Odoo (owner_id),
        // sans garantie de correspondance avec une personne du Core Directory.
        // À défaut de correspondance fiable (ex. par email), le document
        // importé est rattaché à la personne qui exécute l'import — jamais un
        // nom libre (voir section 5 du dossier de passation).
        await this.documentsService.create(
          {
            society,
            name: this.asString(record.name) ?? "Document importé",
            category: this.mapOdooDocumentCategory(record.folder_id),
            ownerPersonId: actor.personId,
          },
          actor,
        );
        imported++;
      } catch (error) {
        errors.push(`Enregistrement Odoo #${record.id} : ${(error as Error).message}`);
      }
    }
    return { available, imported, truncated: available > records.length, errors };
  }

  private async importRh(society: string, actor: AuthenticatedUser, client: OdooClient, uid: number): Promise<ModuleImportResult> {
    const isRh = actor.roles.some((r) => r.role === "RH" && r.society === society);
    if (!isRh) {
      return {
        available: 0,
        imported: 0,
        truncated: false,
        errors: [`Seul le RH de "${society}" peut importer des employés depuis Odoo — reconnectez-vous avec un compte RH.`],
      };
    }

    const model = "hr.employee";
    const fields = ["name", "work_email", "job_title", "department_id", "parent_id"];
    const available = await client.searchCount(uid, model, []);
    const records = await client.searchRead(uid, model, [], fields, 0, IMPORT_PAGE_SIZE);

    let imported = 0;
    const errors: string[] = [];
    for (const record of records) {
      try {
        const fullName = this.asString(record.name);
        if (!fullName) throw new Error("Nom manquant.");
        const [firstName, ...rest] = fullName.split(" ");
        const lastName = rest.join(" ") || firstName;
        const email = this.sanitizeEmail(record.work_email) ?? `${firstName}.${lastName}.odoo${record.id}@atfm-group.com`.toLowerCase();

        await this.peopleService.create(
          {
            firstName,
            lastName,
            gender: "Non précisé",
            email,
            society,
            department: this.manyToOneLabel(record.department_id) ?? "Importé d'Odoo",
            position: this.asString(record.job_title) ?? "Importé d'Odoo",
            manager: this.manyToOneLabel(record.parent_id) ?? undefined,
          },
          actor,
        );
        imported++;
      } catch (error) {
        errors.push(`Enregistrement Odoo #${record.id} : ${(error as Error).message}`);
      }
    }
    return { available, imported, truncated: available > records.length, errors };
  }

  private async importFacturation(
    society: string,
    actor: AuthenticatedUser,
    client: OdooClient,
    uid: number,
  ): Promise<ModuleImportResult> {
    const model = "account.move";
    const fields = ["partner_id", "amount_total", "currency_id", "invoice_date_due", "payment_state"];
    // Ne migre que les factures clients (out_invoice), jamais les avoirs ou factures fournisseurs.
    const domain = [["move_type", "=", "out_invoice"]];
    const available = await client.searchCount(uid, model, domain);
    const records = await client.searchRead(uid, model, domain, fields, 0, IMPORT_PAGE_SIZE);

    let imported = 0;
    const errors: string[] = [];
    for (const record of records) {
      try {
        const dueDate = this.asString(record.invoice_date_due) ?? new Date().toISOString().slice(0, 10);
        const invoice = await this.invoicesService.create(
          {
            society,
            client: this.manyToOneLabel(record.partner_id) ?? "Client importé",
            amount: Math.max(0, Math.round(Number(record.amount_total) || 0)),
            currency: this.mapOdooCurrency(record.currency_id),
            dueDate,
          },
          actor,
        );
        const status = this.mapOdooPaymentState(record.payment_state, dueDate);
        if (status !== "En attente") {
          await this.invoicesService.update(invoice.id, { status }, actor);
        }
        imported++;
      } catch (error) {
        errors.push(`Enregistrement Odoo #${record.id} : ${(error as Error).message}`);
      }
    }
    return { available, imported, truncated: available > records.length, errors };
  }

  private async importProjets(
    society: string,
    actor: AuthenticatedUser,
    client: OdooClient,
    uid: number,
  ): Promise<ModuleImportResult> {
    const model = "project.project";
    const fields = ["name", "partner_id", "date_start", "date"];
    const available = await client.searchCount(uid, model, []);
    const records = await client.searchRead(uid, model, [], fields, 0, IMPORT_PAGE_SIZE);

    const fallbackStart = new Date().toISOString().slice(0, 10);
    const fallbackEnd = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);

    let imported = 0;
    const errors: string[] = [];
    for (const record of records) {
      try {
        await this.projectsService.create(
          {
            society,
            name: this.asString(record.name) ?? "Projet importé",
            client: this.manyToOneLabel(record.partner_id) ?? undefined,
            startDate: this.asString(record.date_start) ?? fallbackStart,
            endDate: this.asString(record.date) ?? fallbackEnd,
          },
          actor,
        );
        imported++;
      } catch (error) {
        errors.push(`Enregistrement Odoo #${record.id} : ${(error as Error).message}`);
      }
    }
    return { available, imported, truncated: available > records.length, errors };
  }

  /// Les champs many2one d'Odoo sont renvoyés par search_read soit `false`
  /// (aucune valeur), soit un tuple `[id, "Libellé affiché"]`.
  private manyToOneLabel(value: unknown): string | null {
    return Array.isArray(value) && typeof value[1] === "string" ? value[1] : null;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private sanitizeEmail(value: unknown): string | undefined {
    const str = this.asString(value);
    return str && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) ? str : undefined;
  }

  private mapOdooCrmStage(value: unknown): DealStage {
    const label = (this.manyToOneLabel(value) ?? "").toLowerCase();
    if (/won|gagn/.test(label)) return "gagne";
    if (/lost|perdu/.test(label)) return "perdu";
    if (/n[ée]goti/.test(label)) return "negociation";
    if (/propos|devis/.test(label)) return "proposition";
    if (/qualif/.test(label)) return "qualification";
    return "prospect";
  }

  private mapOdooDocumentCategory(value: unknown): "Contrats" | "Gouvernance" | "Finance" | "RH" | "Projets" {
    const label = (this.manyToOneLabel(value) ?? "").toLowerCase();
    if (/contrat|contract/.test(label)) return "Contrats";
    if (/gouvernance|governance|legal/.test(label)) return "Gouvernance";
    if (/finance|comptab|invoic/.test(label)) return "Finance";
    if (/rh|hr|human/.test(label)) return "RH";
    if (/projet|project/.test(label)) return "Projets";
    return "Contrats";
  }

  private mapOdooCurrency(value: unknown): Currency {
    const code = (this.manyToOneLabel(value) ?? "EUR").toUpperCase();
    return (CURRENCIES as readonly string[]).includes(code) ? (code as Currency) : "EUR";
  }

  private mapOdooPaymentState(value: unknown, dueDate: string): (typeof INVOICE_STATUSES)[number] {
    const state = this.asString(value) ?? "";
    if (state === "paid" || state === "in_payment") return "Payée";
    if (new Date(dueDate).getTime() < Date.now()) return "En retard";
    return "En attente";
  }
}
