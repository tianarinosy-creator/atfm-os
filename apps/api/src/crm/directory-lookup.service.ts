import { BadRequestException, Injectable } from "@nestjs/common";
import { PeopleService } from "../people/people.service";
import { EmployeeView } from "../people/people.types";

/// Le CRM ne stocke jamais sa propre liste de commerciaux : il interroge le Core
/// Directory (PeopleService, en interne — équivalent d'un GET /people?society=&
/// department=Commercial) à chaque lecture/écriture. Ce service centralise cette
/// résolution pour ContactsService et DealsService.
@Injectable()
export class DirectoryLookupService {
  constructor(private readonly people: PeopleService) {}

  /// Tous les Commerciaux de la société, quel que soit leur statut (Actif/Inactif/
  /// Suspendu) — pour l'affichage (ex. un contact historiquement traité par
  /// quelqu'un depuis passé Inactif doit rester visible avec son relais).
  async loadCommercials(society: string): Promise<Map<string, EmployeeView>> {
    const employees = (await this.people.findAll({ society, department: "Commercial" })) as EmployeeView[];
    return new Map(employees.map((e) => [e.personId, e]));
  }

  /// Empêche d'assigner "Commercial en charge" / "Traité par" à quelqu'un qui n'est
  /// pas (ou plus) un Commercial actif de cette société — imposé côté API.
  async assertActiveCommercial(society: string, personId: string) {
    const commercials = await this.loadCommercials(society);
    const match = commercials.get(personId);
    if (!match || match.status !== "Actif") {
      throw new BadRequestException(
        `La personne assignée doit être un Commercial actif chez "${society}".`,
      );
    }
  }
}
