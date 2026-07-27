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

async function main() {
  const today = Date.now();
  const inDays = (n: number) => new Date(today + n * 86_400_000);

  // Compte "RH" par société, seul habilité à créer des personnes (voir PeopleService.create).
  const rhAccounts: { society: string; username: string }[] = [];
  // person_id des commerciaux par société — pour assigner "Commercial en charge" /
  // "Traité par" dans le CRM sans jamais dupliquer leur nom (voir plus bas).
  const commercialsBySociety: Record<string, string[]> = {};

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

  console.log(`Seed terminé : ${i} personnes créées, ${dealsCreated} contacts/affaires CRM.`);
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
