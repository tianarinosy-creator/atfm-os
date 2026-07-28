import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mot de passe de dev commun à tous les comptes amorcés — à changer en environnement réel.
const DEV_PASSWORD = "atfm-dev-2026";

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

// Reprend RH_SEED_TEAMS du prototype atfm-legacy-os-platform.jsx :
// [nom complet, poste, département, manager, estCommercial]
const RH_SEED_TEAMS: Record<string, [string, string, string, string, boolean][]> = {
  atfm: [
    ["Marc Delacroix", "Conseiller stratégie senior", "Conseil", "Marion Costa", false],
    ["Sophie Renard", "Chargée de gouvernance", "Direction", "Marion Costa", false],
    ["Julie Farge", "Chargée d'affaires", "Commercial", "Marion Costa", true],
  ],
  logistics: [
    ["Karim Fassi", "Responsable opérations", "Opérations", "Direction Havanana Logistics", false],
    ["Elodie Vasseur", "Chargée grands comptes", "Commercial", "Karim Fassi", true],
    ["Sarah Kaced", "Chargée de comptes clés (intérim)", "Commercial", "Karim Fassi", true],
    ["Julien Roche", "Chef de projet supply chain", "Opérations", "Karim Fassi", false],
  ],
  housing: [
    ["Nadia Belkacem", "Directrice de programme", "Programmes", "Direction Havanana Housing", false],
    ["Thomas Girard", "Gestionnaire locatif", "Gestion locative", "Nadia Belkacem", false],
    ["Manon Rey", "Chargée de commercialisation", "Commercial", "Nadia Belkacem", true],
  ],
  films: [
    ["Claire Aubert", "Chargée de production", "Production", "Direction Havanana Films", false],
    ["Yanis Cherif", "Producteur associé", "Production", "Direction Havanana Films", false],
    ["Théo Blanchard", "Chargé de développement commercial", "Commercial", "Direction Havanana Films", true],
  ],
  tech: [
    ["Léa Fontaine", "Product Manager", "Produit", "Direction Havanana Tech", false],
    ["Hugo Marchand", "Lead Développeur", "Ingénierie", "Direction Havanana Tech", false],
    ["Inès Zeroual", "Développeuse Full Stack", "Ingénierie", "Hugo Marchand", false],
    ["Maxime Le Bris", "Account Executive", "Commercial", "Léa Fontaine", true],
  ],
  impact: [
    ["Paul Lemercier", "Chargé de mission ESG", "Impact", "Direction Havanana Impact", false],
    ["Aïcha Diallo", "Chargée de partenariats", "Commercial", "Direction Havanana Impact", true],
  ],
  dsfamily: [
    ["Dominique Serrano", "Gérant", "Direction", "—", false],
    ["Olivier Weiss", "Conseiller clientèle patrimoniale", "Commercial", "Dominique Serrano", true],
  ],
  creatic: [
    ["Amélie Nguyen", "Directrice de création", "Création", "Direction Creatic", false],
    ["Victor Vidal", "Directeur artistique", "Création", "Amélie Nguyen", false],
    ["Camille Faucher", "Chargée de clientèle", "Commercial", "Amélie Nguyen", true],
  ],
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(" ");
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] };
}

function slugEmail(firstName: string, lastName: string) {
  return `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "") + "@atfm-group.com";
}

// Reprend seedCRMForTenant() du prototype : contacts externes par société. "handledBy"
// n'est jamais stocké ici — résolu plus bas vers un person_id parmi les commerciaux
// RH_SEED_TEAMS de la même société (jamais de duplication du Core Directory).
const CRM_CONTACT_SEEDS: Record<
  string,
  { name: string; email: string; phone: string; company: string; position: string; tags: string[] }[]
> = {
  atfm: [
    { name: "Marc Delacroix", email: "m.delacroix@partenaire.fr", phone: "+33 6 12 34 56 78", company: "Cabinet Delacroix & Associés", position: "Associé", tags: ["Conseil"] },
    { name: "Sophie Renard", email: "s.renard@bpifrance.fr", phone: "+33 6 45 12 90 33", company: "Bpifrance", position: "Chargée de partenariats", tags: ["Institutionnel"] },
  ],
  logistics: [
    { name: "Karim Fassi", email: "k.fassi@transalliance.com", phone: "+33 6 22 11 44 55", company: "Transalliance", position: "Directeur des opérations", tags: ["Transport"] },
    { name: "Elodie Vasseur", email: "e.vasseur@carrefour-supply.fr", phone: "+33 6 33 22 11 09", company: "Carrefour Supply Chain", position: "Responsable achats", tags: ["Grande distribution"] },
    { name: "Julien Roche", email: "j.roche@geodis.com", phone: "+33 6 88 77 66 55", company: "Geodis", position: "Chef de projet", tags: ["Fret"] },
  ],
  housing: [
    { name: "Nadia Belkacem", email: "n.belkacem@nexity.fr", phone: "+33 6 19 28 37 46", company: "Nexity", position: "Directrice de programme", tags: ["Promotion"] },
    { name: "Thomas Girard", email: "t.girard@foncia.com", phone: "+33 6 55 44 33 22", company: "Foncia", position: "Responsable gestion locative", tags: ["Gestion locative"] },
  ],
  films: [
    { name: "Claire Aubert", email: "c.aubert@canalplus.fr", phone: "+33 6 71 62 53 44", company: "Canal+", position: "Directrice des acquisitions", tags: ["Diffuseur"] },
    { name: "Yanis Cherif", email: "y.cherif@studiocanal.com", phone: "+33 6 40 30 20 10", company: "StudioCanal", position: "Producteur associé", tags: ["Coproduction"] },
  ],
  tech: [
    { name: "Léa Fontaine", email: "l.fontaine@decathlon.com", phone: "+33 6 90 80 70 60", company: "Decathlon", position: "Directrice digitale", tags: ["Retail Tech"] },
    { name: "Hugo Marchand", email: "h.marchand@axa.fr", phone: "+33 6 15 25 35 45", company: "AXA", position: "Head of Innovation", tags: ["InsurTech"] },
    { name: "Inès Zeroual", email: "i.zeroual@doctolib.com", phone: "+33 6 60 50 40 30", company: "Doctolib", position: "Product Manager", tags: ["SaaS"] },
  ],
  impact: [
    { name: "Paul Lemercier", email: "p.lemercier@ademe.fr", phone: "+33 6 24 34 44 54", company: "ADEME", position: "Chargé de mission", tags: ["Institutionnel"] },
  ],
  dsfamily: [
    { name: "Dominique Serrano", email: "d.serrano@familyoffice.fr", phone: "+33 6 11 22 33 44", company: "Serrano Family Office", position: "Gérant", tags: ["Patrimoine"] },
  ],
  creatic: [
    { name: "Amélie Nguyen", email: "a.nguyen@loreal.com", phone: "+33 6 77 66 55 44", company: "L'Oréal", position: "Directrice marque", tags: ["Branding"] },
    { name: "Victor Vidal", email: "v.vidal@lvmh.com", phone: "+33 6 20 21 22 23", company: "LVMH", position: "Directeur artistique", tags: ["Luxe"] },
  ],
};

const DEAL_STAGES_CYCLE = ["prospect", "qualification", "proposition", "negociation", "gagne", "perdu"] as const;
const DEAL_VALUES_CYCLE = [8000, 15000, 24000, 42000, 60000, 12000];

// Reprend seedProjectsForTenant() du prototype. "team" référence des noms complets
// de RH_SEED_TEAMS (résolus en person_id plus bas) — jamais un nom stocké tel quel
// dans un projet.
const PROJECT_SEEDS: Record<string, { name: string; client: string; team: string[] }[]> = {
  atfm: [{ name: "Refonte gouvernance groupe", client: "Direction ATFM", team: ["Marc Delacroix", "Sophie Renard"] }],
  logistics: [
    { name: "Optimisation flotte régionale", client: "Transalliance", team: ["Karim Fassi", "Elodie Vasseur"] },
    { name: "Déploiement WMS entrepôt Nord", client: "Geodis", team: ["Julien Roche"] },
  ],
  housing: [{ name: "Programme résidentiel Le Clos Vert", client: "Nexity", team: ["Nadia Belkacem", "Thomas Girard"] }],
  films: [
    { name: "Post-production 'Horizon Bleu'", client: "Canal+", team: ["Claire Aubert"] },
    { name: "Coproduction série originale", client: "StudioCanal", team: ["Yanis Cherif"] },
  ],
  tech: [
    { name: "Plateforme retail connectée", client: "Decathlon", team: ["Léa Fontaine", "Hugo Marchand"] },
    { name: "Module IA prédictive assurance", client: "AXA", team: ["Hugo Marchand", "Inès Zeroual"] },
  ],
  impact: [{ name: "Bilan carbone filiales 2026", client: "ADEME", team: ["Paul Lemercier"] }],
  dsfamily: [{ name: "Structuration patrimoniale", client: "Serrano Family Office", team: ["Dominique Serrano"] }],
  creatic: [
    { name: "Campagne de marque premium", client: "L'Oréal", team: ["Amélie Nguyen"] },
    { name: "Refonte identité visuelle", client: "LVMH", team: ["Victor Vidal"] },
  ],
};

// Reprend seedFinanceForTenant() du prototype. Aucune référence Core Directory :
// "client" est une société externe en texte libre, comme dans le prototype.
const FINANCE_SECONDARY_CURRENCY: Record<string, "USD" | "GBP"> = { films: "USD", tech: "GBP" };
const FINANCE_CLIENTS_BY_SOCIETY: Record<string, string[]> = {
  atfm: ["Cabinet Delacroix & Associés", "Bpifrance"],
  logistics: ["Transalliance", "Carrefour Supply Chain", "Geodis"],
  housing: ["Nexity", "Foncia"],
  films: ["Canal+", "StudioCanal"],
  tech: ["Decathlon", "AXA", "Doctolib"],
  impact: ["ADEME"],
  dsfamily: ["Serrano Family Office"],
  creatic: ["L'Oréal", "LVMH"],
};
const FINANCE_INVOICE_VALUES_CYCLE = [8000, 15000, 24000, 42000, 60000, 12000];
const FINANCE_EXPENSE_SEEDS: { label: string; amount: number; daysAgo: number; category: string; status: string; useSecondaryCurrency?: boolean }[] = [
  { label: "Salaires équipe", amount: 22000, daysAgo: 15, category: "Personnel", status: "Payée" },
  { label: "Sous-traitance spécialisée", amount: 6800, daysAgo: 22, category: "Prestation", status: "Payée" },
  { label: "Loyer bureaux", amount: 3200, daysAgo: 5, category: "Loyer", status: "Payée" },
  { label: "Licences SaaS", amount: 1450, daysAgo: 8, category: "Outils & Licences", status: "En attente" },
  { label: "Campagne acquisition", amount: 4200, daysAgo: 12, category: "Marketing", status: "Payée", useSecondaryCurrency: true },
];
const FINANCE_BUDGET_SEEDS = [
  { category: "Personnel", budgeted: 26000 },
  { category: "Prestation", budgeted: 8000 },
  { category: "Loyer", budgeted: 3200 },
  { category: "Outils & Licences", budgeted: 1800 },
  { category: "Marketing", budgeted: 5000 },
];

// Reprend seedGovernanceForTenant() du prototype. Membres du Conseil et
// actionnaires en texte libre (voir commentaire du schéma) : un Conseil peut
// inclure des personnes hors Core Directory.
type BoardSeed = { name: string; role: "presidence" | "direction" | "administrateur"; title: string; since: string };
type ShareholderSeed = { name: string; type: string; percentage: number };

function genericBoard(names: string[]): BoardSeed[] {
  return names.map((name, i) => ({
    name,
    role: i === 0 ? "presidence" : i === 1 ? "direction" : "administrateur",
    title: i === 0 ? "Président" : i === 1 ? "Directeur Général" : "Administrateur",
    since: String(2021 + (i % 3)),
  }));
}

const GENERIC_SHAREHOLDERS: ShareholderSeed[] = [
  { name: "ATFM Legacy (holding)", type: "Société", percentage: 65 },
  { name: "Management local", type: "Personne", percentage: 20 },
  { name: "Investisseurs tiers", type: "Société", percentage: 15 },
];

const GOVERNANCE_SEEDS: Record<string, { valuation: number; board: BoardSeed[]; shareholders: ShareholderSeed[] }> = {
  atfm: {
    valuation: 42_000_000,
    board: [
      { name: "Alexandre Ferrand", role: "presidence", title: "Président du Conseil", since: "2019" },
      { name: "Marion Costa", role: "direction", title: "Directrice Générale", since: "2020" },
      { name: "Marc Delacroix", role: "administrateur", title: "Administrateur indépendant", since: "2021" },
      { name: "Sophie Renard", role: "administrateur", title: "Administratrice — Bpifrance", since: "2022" },
    ],
    shareholders: [
      { name: "Alexandre Ferrand", type: "Personne", percentage: 38 },
      { name: "Famille Ferrand (Holding perso.)", type: "Société", percentage: 22 },
      { name: "Bpifrance", type: "Société", percentage: 15 },
      { name: "Management (pool)", type: "Personne", percentage: 10 },
      { name: "Investisseurs minoritaires", type: "Société", percentage: 15 },
    ],
  },
  logistics: { valuation: 18_500_000, board: genericBoard(["Karim Fassi", "Elodie Vasseur", "Julien Roche"]), shareholders: GENERIC_SHAREHOLDERS },
  housing: { valuation: 26_000_000, board: genericBoard(["Nadia Belkacem", "Thomas Girard"]), shareholders: GENERIC_SHAREHOLDERS },
  films: { valuation: 9_800_000, board: genericBoard(["Claire Aubert", "Yanis Cherif"]), shareholders: GENERIC_SHAREHOLDERS },
  tech: { valuation: 31_000_000, board: genericBoard(["Léa Fontaine", "Hugo Marchand", "Inès Zeroual"]), shareholders: GENERIC_SHAREHOLDERS },
  impact: { valuation: 4_200_000, board: genericBoard(["Paul Lemercier"]), shareholders: GENERIC_SHAREHOLDERS },
  dsfamily: { valuation: 15_000_000, board: genericBoard(["Dominique Serrano"]), shareholders: GENERIC_SHAREHOLDERS },
  creatic: { valuation: 7_600_000, board: genericBoard(["Amélie Nguyen", "Victor Vidal"]), shareholders: GENERIC_SHAREHOLDERS },
};

// Reprend seedInvestments() du prototype — portée Groupe, pas de society.
interface StartupSeed {
  name: string;
  sector: string;
  stage: "sourcing" | "pitch" | "dd" | "termsheet" | "investi" | "refuse";
  founder: string;
  description: string;
  pitchNotes: string;
  businessPlanNotes: string;
  dueDiligenceStatus: string;
  dueDiligenceChecklist: { text: string; done: boolean }[];
  round: string;
  amountTarget: number;
  amountRaised: number;
  roundStatus: string;
  valuationPreMoney: number | null;
  valuationPostMoney: number | null;
  currentValuation: number;
  atfmInvested: number;
  atfmStakePercentage: number;
  dateInvestedInDays: number | null;
  capTable: { investor: string; percentage: number; amount: number }[];
  investors: { name: string; type: string; contact: string }[];
  history: { event: string; description: string; dateInDays: number }[];
}

const INVESTMENT_SEEDS: StartupSeed[] = [
  {
    name: "NovaFret",
    sector: "Logistique verte",
    stage: "investi",
    founder: "Yasmine Touré",
    description: "Plateforme d'optimisation de tournées pour flottes de livraison électriques.",
    pitchNotes: "Deck solide, traction B2B forte auprès de 3 grands comptes retail. Équipe technique expérimentée.",
    businessPlanNotes: "Objectif de rentabilité à 18 mois, marché adressable estimé à 400M€ en France.",
    dueDiligenceStatus: "Terminée",
    dueDiligenceChecklist: [
      { text: "Audit financier", done: true },
      { text: "Vérification des contrats clients", done: true },
      { text: "Due diligence juridique", done: true },
    ],
    round: "Série A",
    amountTarget: 3_000_000,
    amountRaised: 3_000_000,
    roundStatus: "Clôturée",
    valuationPreMoney: 9_000_000,
    valuationPostMoney: 12_000_000,
    currentValuation: 18_000_000,
    atfmInvested: 1_200_000,
    atfmStakePercentage: 10,
    dateInvestedInDays: -380,
    capTable: [
      { investor: "ATFM Legacy", percentage: 10, amount: 1_200_000 },
      { investor: "Fondateurs", percentage: 55, amount: 0 },
      { investor: "Business Angels", percentage: 15, amount: 1_800_000 },
      { investor: "Kima Ventures", percentage: 20, amount: 0 },
    ],
    investors: [
      { name: "Kima Ventures", type: "VC", contact: "contact@kimaventures.com" },
      { name: "Business Angels Réseau Est", type: "Business Angels", contact: "réseau-est@ba.fr" },
    ],
    history: [
      { event: "Investissement", description: "Clôture de la Série A à 12M€ post-money, ATFM investit 1,2M€.", dateInDays: -380 },
      { event: "Valorisation", description: "Nouvelle valorisation à 18M€ suite à la levée de contrats stratégiques.", dateInDays: -90 },
    ],
  },
  {
    name: "Mira Health",
    sector: "Impact & Santé",
    stage: "investi",
    founder: "Dr. Antoine Vidal",
    description: "Téléconsultation dédiée aux zones rurales sous-dotées médicalement.",
    pitchNotes: "Fort impact social, mission alignée avec Havanana Impact. Monétisation encore à consolider.",
    businessPlanNotes: "Partenariats en cours avec 12 collectivités, subventions ADEME/régionales en discussion.",
    dueDiligenceStatus: "Terminée",
    dueDiligenceChecklist: [
      { text: "Audit financier", done: true },
      { text: "Vérification conformité RGPD/santé", done: true },
    ],
    round: "Seed",
    amountTarget: 1_200_000,
    amountRaised: 1_200_000,
    roundStatus: "Clôturée",
    valuationPreMoney: 3_800_000,
    valuationPostMoney: 5_000_000,
    currentValuation: 6_200_000,
    atfmInvested: 500_000,
    atfmStakePercentage: 10,
    dateInvestedInDays: -210,
    capTable: [
      { investor: "ATFM Legacy", percentage: 10, amount: 500_000 },
      { investor: "Fondateurs", percentage: 70, amount: 0 },
      { investor: "Impact Partners", percentage: 20, amount: 700_000 },
    ],
    investors: [{ name: "Impact Partners", type: "Fonds à impact", contact: "invest@impactpartners.fr" }],
    history: [{ event: "Investissement", description: "Clôture du Seed à 5M€ post-money, ATFM investit 500K€.", dateInDays: -210 }],
  },
  {
    name: "Reelio",
    sector: "Production audiovisuelle",
    stage: "termsheet",
    founder: "Camille Faure",
    description: "Plateforme de financement participatif dédiée aux courts et longs métrages indépendants.",
    pitchNotes: "Traction communautaire forte, mais dépendance à un unique canal d'acquisition à surveiller.",
    businessPlanNotes: "Modèle de commission à 8% sur les fonds levés, break-even projeté à 24 mois.",
    dueDiligenceStatus: "En cours",
    dueDiligenceChecklist: [
      { text: "Audit financier", done: true },
      { text: "Vérification des CGU/plateforme", done: false },
      { text: "Analyse de la concurrence", done: true },
    ],
    round: "Seed",
    amountTarget: 900_000,
    amountRaised: 600_000,
    roundStatus: "En cours",
    valuationPreMoney: 3_200_000,
    valuationPostMoney: 4_100_000,
    currentValuation: 4_100_000,
    atfmInvested: 0,
    atfmStakePercentage: 0,
    dateInvestedInDays: null,
    capTable: [{ investor: "Fondateurs", percentage: 100, amount: 0 }],
    investors: [],
    history: [{ event: "Term Sheet", description: "Term sheet signée pour un investissement de 400K€, en attente de clôture.", dateInDays: -15 }],
  },
  {
    name: "Ledgr",
    sector: "Fintech / Tech",
    stage: "dd",
    founder: "Samir Belkaïd",
    description: "Outil de rapprochement comptable automatisé par IA pour PME.",
    pitchNotes: "Produit encore en beta, deck à consolider sur les métriques de rétention.",
    businessPlanNotes: "Pricing SaaS envisagé à 199€/mois, marché cible : 40 000 PME françaises.",
    dueDiligenceStatus: "En cours",
    dueDiligenceChecklist: [
      { text: "Audit financier", done: false },
      { text: "Test produit avec un client pilote", done: true },
    ],
    round: "Pre-seed",
    amountTarget: 500_000,
    amountRaised: 150_000,
    roundStatus: "En cours",
    valuationPreMoney: 2_000_000,
    valuationPostMoney: 2_500_000,
    currentValuation: 2_500_000,
    atfmInvested: 0,
    atfmStakePercentage: 0,
    dateInvestedInDays: null,
    capTable: [{ investor: "Fondateurs", percentage: 100, amount: 0 }],
    investors: [],
    history: [],
  },
  {
    name: "Urbanest",
    sector: "Immobilier / PropTech",
    stage: "pitch",
    founder: "Lucie Barbier",
    description: "Marketplace de coliving pour jeunes actifs dans les métropoles secondaires.",
    pitchNotes: "Premier échange prometteur, pitch deck reçu, à challenger sur la scalabilité opérationnelle.",
    businessPlanNotes: "",
    dueDiligenceStatus: "Non démarrée",
    dueDiligenceChecklist: [],
    round: "Seed",
    amountTarget: 1_000_000,
    amountRaised: 0,
    roundStatus: "Non démarrée",
    valuationPreMoney: 3_500_000,
    valuationPostMoney: null,
    currentValuation: 3_500_000,
    atfmInvested: 0,
    atfmStakePercentage: 0,
    dateInvestedInDays: null,
    capTable: [{ investor: "Fondateurs", percentage: 100, amount: 0 }],
    investors: [],
    history: [],
  },
  {
    name: "GreenPallet",
    sector: "Logistique circulaire",
    stage: "sourcing",
    founder: "Nicolas Ferreira",
    description: "Location de palettes réutilisables consignées pour la grande distribution.",
    pitchNotes: "",
    businessPlanNotes: "",
    dueDiligenceStatus: "Non démarrée",
    dueDiligenceChecklist: [],
    round: "Seed",
    amountTarget: 800_000,
    amountRaised: 0,
    roundStatus: "Non démarrée",
    valuationPreMoney: null,
    valuationPostMoney: null,
    currentValuation: 0,
    atfmInvested: 0,
    atfmStakePercentage: 0,
    dateInvestedInDays: null,
    capTable: [],
    investors: [],
    history: [],
  },
];

// Reprend seedDocumentsForTenant() du prototype — GED par société. `owner` est
// résolu vers un person_id existant de l'équipe (personIdByKey), jamais un nom
// de service en texte libre comme dans le prototype : le dossier de passation
// (section 5) cite "Documents" parmi les modules devant "Sélectionner une
// personne existante".
const DOC_CLIENTS_BY_SOCIETY: Record<string, string> = {
  atfm: "Cabinet Delacroix & Associés",
  logistics: "Transalliance",
  housing: "Nexity",
  films: "Canal+",
  tech: "Decathlon",
  impact: "ADEME",
  dsfamily: "Serrano Family Office",
  creatic: "L'Oréal",
};

interface DocumentSeedTemplate {
  name: (client: string) => string;
  category: "Contrats" | "Gouvernance" | "Finance" | "RH" | "Projets";
  version: number;
  dateInDays: number;
  permissions: string;
  archived: boolean;
  signatureStatus: string | null;
}

const DOCUMENT_SEED_TEMPLATES: DocumentSeedTemplate[] = [
  {
    name: (c) => `Contrat de prestation — ${c}`,
    category: "Contrats",
    version: 2,
    dateInDays: -12,
    permissions: "Restreint",
    archived: false,
    signatureStatus: "Signé",
  },
  {
    name: () => "PV Conseil d'administration — Revue trimestrielle",
    category: "Gouvernance",
    version: 1,
    dateInDays: -25,
    permissions: "Direction uniquement",
    archived: false,
    signatureStatus: null,
  },
  {
    name: () => "Facture émise — T2",
    category: "Finance",
    version: 1,
    dateInDays: -18,
    permissions: "Restreint",
    archived: false,
    signatureStatus: null,
  },
  {
    name: () => "Budget prévisionnel 2027",
    category: "Finance",
    version: 3,
    dateInDays: -6,
    permissions: "Direction uniquement",
    archived: false,
    signatureStatus: null,
  },
  {
    name: () => "Fiche de poste — Recrutement en cours",
    category: "RH",
    version: 1,
    dateInDays: -9,
    permissions: "Public interne",
    archived: false,
    signatureStatus: null,
  },
  {
    name: () => "Cahier des charges — Projet en cours",
    category: "Projets",
    version: 4,
    dateInDays: -3,
    permissions: "Public interne",
    archived: false,
    signatureStatus: null,
  },
  {
    name: () => "Ancien contrat cadre (résilié)",
    category: "Contrats",
    version: 1,
    dateInDays: -400,
    permissions: "Restreint",
    archived: true,
    signatureStatus: "Signé",
  },
];

async function main() {
  const today = Date.now();
  const inDays = (n: number) => new Date(today + n * 86_400_000);

  // Compte "RH" par société, seul habilité à créer des personnes (voir PeopleService.create).
  const rhAccounts: { society: string; username: string }[] = [];
  // person_id des commerciaux par société — pour assigner "Commercial en charge" /
  // "Traité par" dans le CRM sans jamais dupliquer leur nom (voir plus bas).
  const commercialsBySociety: Record<string, string[]> = {};
  // person_id par "société::nom complet" — pour résoudre les équipes projet.
  const personIdByKey: Record<string, string> = {};

  let i = 0;
  for (const [society, team] of Object.entries(RH_SEED_TEAMS)) {
    for (const [teamIndex, [fullName, position, department, manager, isCommercial]] of team.entries()) {
      const { firstName, lastName } = splitName(fullName);
      const email = slugEmail(firstName, lastName);
      const isElodie = society === "logistics" && fullName === "Elodie Vasseur";

      const person = await prisma.person.create({
        data: {
          firstName,
          lastName,
          gender: "Non précisé",
          email,
          phone: "+33 6 00 00 00 00",
          address: "",
          createdAt: inDays(-400 - i * 120),
          updatedAt: inDays(-400 - i * 120),
          affectations: {
            create: {
              society,
              department,
              position,
              manager,
              entryDate: inDays(-400 - i * 120),
              status: isElodie ? "Inactif" : "Actif",
              replacement: isElodie ? "Sarah Kaced (intérim)" : null,
            },
          },
          account: {
            create: {
              username: `${firstName}.${lastName}`.toLowerCase(),
              passwordHash: hashPassword(DEV_PASSWORD),
              mfaEnabled: false,
              lastLogin: inDays(-1),
            },
          },
        },
      });

      personIdByKey[`${society}::${fullName}`] = person.id;

      if (isCommercial) {
        await prisma.role.create({
          data: { personId: person.id, society, role: "Commercial" },
        });
        (commercialsBySociety[society] ??= []).push(person.id);
      }

      // La première personne listée pour chaque société (référence hiérarchique des
      // autres membres de l'équipe) porte aussi le rôle RH — seul rôle habilité à
      // créer des personnes dans cette société.
      if (teamIndex === 0) {
        await prisma.role.create({ data: { personId: person.id, society, role: "RH" } });
        rhAccounts.push({ society, username: `${firstName}.${lastName}`.toLowerCase() });
      }

      await prisma.coreEvent.create({
        data: {
          type: "EmployeeCreated",
          personId: person.id,
          personName: fullName,
          description: `Créé·e chez ${society} en tant que ${position} (amorçage)`,
          createdAt: inDays(-400 - i * 120),
        },
      });

      i += 1;
    }
  }

  // CRM : contacts + affaires par société, reprenant seedCRMForTenant() du prototype.
  // "Commercial en charge" / "Traité par" ne sont jamais des noms : uniquement le
  // person_id d'un commercial RH_SEED_TEAMS de la même société (round-robin, comme
  // dans le prototype), résolu via la table Role, jamais dupliqué dans le CRM.
  let dealsCreated = 0;
  for (const [society, contactSeeds] of Object.entries(CRM_CONTACT_SEEDS)) {
    const commercials = commercialsBySociety[society] ?? [];
    const pickCommercial = (idx: number) => (commercials.length ? commercials[idx % commercials.length] : null);

    for (const [idx, seed] of contactSeeds.entries()) {
      const handledById = pickCommercial(idx);
      const contact = await prisma.crmContact.create({
        data: {
          society,
          name: seed.name,
          email: seed.email,
          phone: seed.phone,
          company: seed.company,
          position: seed.position,
          tags: seed.tags,
          handledById,
        },
      });

      const deal = await prisma.crmDeal.create({
        data: {
          society,
          contactId: contact.id,
          title: `Mission — ${seed.company}`,
          value: DEAL_VALUES_CYCLE[idx % DEAL_VALUES_CYCLE.length],
          stage: DEAL_STAGES_CYCLE[idx % DEAL_STAGES_CYCLE.length],
          ownerPersonId: handledById,
          nextActionDate: idx % 2 === 0 ? inDays(2 + idx) : null,
        },
      });

      await prisma.crmActivity.create({
        data: {
          dealId: deal.id,
          type: "call",
          text: "Premier contact téléphonique, intérêt confirmé.",
          date: inDays(-3),
        },
      });

      dealsCreated += 1;
    }
  }

  // Projets : reprend seedProjectsForTenant() du prototype. L'équipe, l'assigné et
  // l'auteur des commentaires sont toujours résolus en person_id via personIdByKey
  // (jamais un nom stocké dans un Project/ProjectTask/ProjectTaskComment).
  let projectsCreated = 0;
  for (const [society, templates] of Object.entries(PROJECT_SEEDS)) {
    for (const [idx, tpl] of templates.entries()) {
      const teamIds = tpl.team.map((name) => personIdByKey[`${society}::${name}`]).filter(Boolean);
      if (teamIds.length === 0) continue;

      const start = inDays(-20 - idx * 5);
      const end = inDays(45 + idx * 10);
      const budget = 40000 + idx * 15000;
      const lead = teamIds[0];
      const last = teamIds[teamIds.length - 1];

      const project = await prisma.project.create({
        data: {
          society,
          name: tpl.name,
          client: tpl.client,
          status: "actif",
          startDate: start,
          endDate: end,
          budget,
          members: { create: teamIds.map((personId) => ({ personId })) },
          expenses: {
            create: [
              { label: "Sous-traitance spécialisée", amount: Math.round(budget * 0.18), category: "Prestation", date: inDays(-8) },
              { label: "Licences logicielles", amount: Math.round(budget * 0.05), category: "Outils", date: inDays(-3) },
            ],
          },
          risks: {
            create: [
              {
                text: "Dépendance à une ressource clé côté client",
                level: "Modéré",
                mitigation: "Identifier un contact suppléant.",
                status: "Ouvert",
              },
            ],
          },
        },
      });

      const analyseTask = await prisma.projectTask.create({
        data: {
          projectId: project.id,
          title: "Analyse des besoins",
          column: "inprogress",
          sprint: "Sprint 2",
          assigneeId: lead,
          dueDate: inDays(5),
          timeLoggedH: 18,
          checklist: {
            create: [
              { text: "Interviews parties prenantes", done: true },
              { text: "Synthèse des besoins", done: false },
            ],
          },
        },
      });
      await prisma.projectTaskComment.create({
        data: { taskId: analyseTask.id, authorId: lead, text: "Premier draft partagé au client.", date: inDays(-2) },
      });

      await prisma.projectTask.create({
        data: {
          projectId: project.id,
          title: "Cadrage & lancement",
          column: "done",
          sprint: "Sprint 1",
          assigneeId: lead,
          dueDate: inDays(-10),
          timeLoggedH: 12,
          checklist: {
            create: [
              { text: "Atelier de cadrage", done: true },
              { text: "Charte projet validée", done: true },
            ],
          },
        },
      });
      await prisma.projectTask.create({
        data: {
          projectId: project.id,
          title: "Livrable intermédiaire",
          column: "review",
          sprint: "Sprint 2",
          assigneeId: last,
          dueDate: inDays(8),
          timeLoggedH: 6,
          checklist: { create: [{ text: "Relecture qualité", done: false }] },
        },
      });
      await prisma.projectTask.create({
        data: {
          projectId: project.id,
          title: "Plan de déploiement",
          column: "todo",
          sprint: "Sprint 3",
          assigneeId: last,
          dueDate: inDays(22),
        },
      });

      projectsCreated += 1;
    }
  }

  // Finance : factures + dépenses + budgets par société, reprenant
  // seedFinanceForTenant() du prototype (multi-devises selon la société).
  let invoicesCreated = 0;
  for (const [society, clients] of Object.entries(FINANCE_CLIENTS_BY_SOCIETY)) {
    const secondaryCurrency = FINANCE_SECONDARY_CURRENCY[society] ?? "EUR";

    for (const [idx, client] of clients.entries()) {
      const currency = idx % 3 === 0 ? secondaryCurrency : "EUR";
      const amount = FINANCE_INVOICE_VALUES_CYCLE[idx % FINANCE_INVOICE_VALUES_CYCLE.length];
      const status = idx % 4 === 0 ? "En retard" : idx % 3 === 0 ? "En attente" : "Payée";

      await prisma.financeInvoice.create({
        data: {
          society,
          client,
          amount,
          currency,
          status,
          issueDate: inDays(-40 + idx * 6),
          dueDate: inDays(-10 + idx * 6),
          category: "Vente de services",
        },
      });
      invoicesCreated += 1;
    }

    for (const seed of FINANCE_EXPENSE_SEEDS) {
      await prisma.financeExpense.create({
        data: {
          society,
          label: seed.label,
          amount: seed.amount,
          currency: seed.useSecondaryCurrency ? secondaryCurrency : "EUR",
          category: seed.category,
          date: inDays(-seed.daysAgo),
          status: seed.status,
        },
      });
    }

    for (const budget of FINANCE_BUDGET_SEEDS) {
      await prisma.financeBudget.create({
        data: { society, category: budget.category, budgeted: budget.budgeted, period: "Mensuel" },
      });
    }
  }

  // Gouvernance : organigramme du Conseil, actionnariat, assemblées &
  // résolutions — reprend seedGovernanceForTenant() du prototype (les deux
  // mêmes réunions génériques sont répliquées pour chaque société, comme
  // dans le prototype qui ne les personnalisait pas par tenant).
  let meetingsCreated = 0;
  for (const [society, seed] of Object.entries(GOVERNANCE_SEEDS)) {
    await prisma.governanceValuation.create({ data: { society, valuation: seed.valuation } });

    for (const member of seed.board) {
      await prisma.boardMember.create({
        data: { society, name: member.name, role: member.role, title: member.title, since: member.since },
      });
    }

    for (const sh of seed.shareholders) {
      await prisma.shareholder.create({
        data: { society, name: sh.name, type: sh.type, percentage: sh.percentage },
      });
    }

    await prisma.governanceMeeting.create({
      data: {
        society,
        type: "ca",
        title: "Conseil d'administration — Revue trimestrielle",
        date: inDays(-25),
        status: "Tenue",
        agenda: ["Approbation des comptes du trimestre", "Point sur les filiales", "Validation du budget prévisionnel"],
        minutes:
          "Le Conseil s'est réuni en session ordinaire. Les comptes du trimestre ont été présentés et approuvés à l'unanimité. Le budget prévisionnel 2027 a été discuté et adopté à la majorité.",
        resolutions: {
          create: [
            { text: "Approbation des comptes du T2", votesFor: 4, votesAgainst: 0, votesAbstain: 0, status: "Adoptée" },
            { text: "Validation du budget prévisionnel 2027", votesFor: 3, votesAgainst: 1, votesAbstain: 0, status: "Adoptée" },
          ],
        },
      },
    });
    await prisma.governanceMeeting.create({
      data: {
        society,
        type: "ag",
        title: "Assemblée générale ordinaire annuelle",
        date: inDays(20),
        status: "Planifiée",
        agenda: ["Rapport de gestion", "Affectation du résultat", "Renouvellement des mandats"],
        resolutions: {
          create: [{ text: "Renouvellement du mandat du Président", votesFor: 0, votesAgainst: 0, votesAbstain: 0, status: "En délibération" }],
        },
      },
    });
    meetingsCreated += 2;
  }

  // Investissements (VC) — portée Groupe, reprend seedInvestments() du prototype.
  let startupsCreated = 0;
  for (const s of INVESTMENT_SEEDS) {
    await prisma.startup.create({
      data: {
        name: s.name,
        sector: s.sector,
        stage: s.stage,
        founder: s.founder,
        description: s.description,
        pitchNotes: s.pitchNotes,
        businessPlanNotes: s.businessPlanNotes,
        dueDiligenceStatus: s.dueDiligenceStatus,
        round: s.round,
        amountTarget: s.amountTarget,
        amountRaised: s.amountRaised,
        roundStatus: s.roundStatus,
        valuationPreMoney: s.valuationPreMoney,
        valuationPostMoney: s.valuationPostMoney,
        currentValuation: s.currentValuation,
        atfmInvested: s.atfmInvested,
        atfmStakePercentage: s.atfmStakePercentage,
        dateInvested: s.dateInvestedInDays === null ? null : inDays(s.dateInvestedInDays),
        dueDiligenceItems: { create: s.dueDiligenceChecklist.map((c) => ({ text: c.text, done: c.done })) },
        capTable: { create: s.capTable },
        investors: { create: s.investors },
        history: { create: s.history.map((h) => ({ event: h.event, description: h.description, date: inDays(h.dateInDays) })) },
      },
    });
    startupsCreated++;
  }

  // Documents (GED) — reprend seedDocumentsForTenant() pour chaque société.
  let documentsCreated = 0;
  for (const society of Object.keys(RH_SEED_TEAMS)) {
    const teamIds = RH_SEED_TEAMS[society].map(([fullName]) => personIdByKey[`${society}::${fullName}`]);
    const client = DOC_CLIENTS_BY_SOCIETY[society] ?? "Client";

    for (const [idx, tpl] of DOCUMENT_SEED_TEMPLATES.entries()) {
      await prisma.document.create({
        data: {
          society,
          name: tpl.name(client),
          category: tpl.category,
          version: tpl.version,
          updatedDate: inDays(tpl.dateInDays),
          ownerPersonId: teamIds[idx % teamIds.length],
          permissions: tpl.permissions,
          archived: tpl.archived,
          signatureStatus: tpl.signatureStatus,
        },
      });
      documentsCreated++;
    }
  }

  console.log(
    `Seed terminé : ${i} personnes créées, ${dealsCreated} contacts/affaires CRM, ${projectsCreated} projets, ${invoicesCreated} factures, ${meetingsCreated} réunions de gouvernance, ${startupsCreated} startups (Investissements), ${documentsCreated} documents (GED).`,
  );
  console.log(`Mot de passe de dev commun à tous les comptes : ${DEV_PASSWORD}`);
  console.log("Comptes RH (habilités à créer des personnes) :", rhAccounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
