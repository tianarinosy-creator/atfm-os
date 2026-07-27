import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { QueryPeopleDto } from "./query-people.dto";

// Reproduit les options du ValidationPipe global (main.ts) pour verrouiller le
// comportement réellement exposé par l'API, pas seulement la forme de la classe.
async function validateQuery(plain: Record<string, unknown>) {
  const instance = plainToInstance(QueryPeopleDto, plain);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe("QueryPeopleDto", () => {
  it("accepte society, department et status", async () => {
    const errors = await validateQuery({ society: "logistics", department: "Commercial", status: "Actif" });
    expect(errors).toHaveLength(0);
  });

  it("rejette position — le filtre CRM doit passer par department, pas position", async () => {
    const errors = await validateQuery({ society: "logistics", position: "Commercial" });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === "position")).toBe(true);
  });

  it("rejette un statut hors énumération", async () => {
    const errors = await validateQuery({ status: "PasUnStatut" });
    expect(errors.some((e) => e.property === "status")).toBe(true);
  });
});
