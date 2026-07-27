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

async function main() {
  const today = Date.now();
  const inDays = (n: number) => new Date(today + n * 86_400_000);

  // Compte "RH" par société, seul habilité à créer des personnes (voir PeopleService.create).
  const rhAccounts: { society: string; username: string }[] = [];

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

  console.log(`Seed terminé : ${i} personnes créées.`);
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
