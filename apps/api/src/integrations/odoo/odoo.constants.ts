import { OdooModuleId } from "@atfm/db";

export interface OdooFieldConfig {
  odoo: string;
  atfmLabel: string;
}

export interface OdooModuleConfig {
  id: OdooModuleId;
  label: string;
  odooModel: string;
  fields: OdooFieldConfig[];
}

/// Reprend ODOO_MODULES du prototype : catalogue des modules migrables depuis
/// Odoo, le modèle Odoo source, et l'intitulé par défaut de chaque champ dans
/// l'écran de correspondance (personnalisable ensuite par société, voir
/// OdooFieldMapping). Détermine aussi, de façon fixe, QUEL champ Odoo alimente
/// quelle colonne ATFM — voir OdooImportService pour la transformation réelle.
export const ODOO_MODULES: OdooModuleConfig[] = [
  {
    id: "crm",
    label: "CRM",
    odooModel: "crm.lead",
    fields: [
      { odoo: "name", atfmLabel: "Titre de l'affaire" },
      { odoo: "partner_name", atfmLabel: "Entreprise" },
      { odoo: "email_from", atfmLabel: "Email du contact" },
      { odoo: "phone", atfmLabel: "Téléphone" },
      { odoo: "expected_revenue", atfmLabel: "Valeur de l'affaire" },
      { odoo: "stage_id", atfmLabel: "Étape du pipeline" },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    odooModel: "documents.document",
    fields: [
      { odoo: "name", atfmLabel: "Nom du document" },
      { odoo: "folder_id", atfmLabel: "Catégorie" },
      { odoo: "owner_id", atfmLabel: "Propriétaire" },
      { odoo: "create_date", atfmLabel: "Date de mise à jour" },
    ],
  },
  {
    id: "rh",
    label: "RH",
    odooModel: "hr.employee",
    fields: [
      { odoo: "name", atfmLabel: "Nom de l'employé" },
      { odoo: "work_email", atfmLabel: "Email professionnel" },
      { odoo: "job_title", atfmLabel: "Poste" },
      { odoo: "department_id", atfmLabel: "Département" },
      { odoo: "parent_id", atfmLabel: "Manager" },
    ],
  },
  {
    id: "facturation",
    label: "Facturation",
    odooModel: "account.move",
    fields: [
      { odoo: "partner_id", atfmLabel: "Client" },
      { odoo: "amount_total", atfmLabel: "Montant" },
      { odoo: "currency_id", atfmLabel: "Devise" },
      { odoo: "invoice_date_due", atfmLabel: "Échéance" },
      { odoo: "payment_state", atfmLabel: "Statut de paiement" },
    ],
  },
  {
    id: "projets",
    label: "Projets",
    odooModel: "project.project",
    fields: [
      { odoo: "name", atfmLabel: "Nom du projet" },
      { odoo: "partner_id", atfmLabel: "Client" },
      { odoo: "date_start", atfmLabel: "Date de début" },
      { odoo: "date", atfmLabel: "Date de fin prévue" },
    ],
  },
];

export function findModuleConfig(id: OdooModuleId): OdooModuleConfig {
  const config = ODOO_MODULES.find((m) => m.id === id);
  if (!config) throw new Error(`Module Odoo "${id}" inconnu.`);
  return config;
}

/// Plafond de sécurité par module et par exécution — un import réel synchrone
/// (une requête HTTP) ne doit pas tenter de rapatrier un jeu de données Odoo
/// arbitrairement grand. Si l'instance en contient davantage, le rapport
/// l'indique explicitement (`truncated: true`, `available` > `imported`) —
/// jamais une troncature silencieuse.
export const IMPORT_PAGE_SIZE = 100;
