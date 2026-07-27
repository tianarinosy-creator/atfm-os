import { BadRequestException, Injectable } from "@nestjs/common";
import { PeopleService } from "../people/people.service";
import { EmployeeView } from "../people/people.types";

/// Point d'entrée partagé par tous les modules métier (CRM, Projets, et les
/// suivants) pour lire le Core Directory — jamais de copie locale des personnes.
/// Équivalent interne d'un GET /people?society=&department=, sans aller-retour
/// HTTP puisqu'on est dans le même processus NestJS.
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

  /// Toutes les personnes ayant une affectation (active ou non) chez cette société,
  /// tous départements confondus — utilisé par les modules qui composent des équipes
  /// (ex. Projets) plutôt qu'un rôle métier précis comme "Commercial".
  async loadSocietyMembers(society: string): Promise<Map<string, EmployeeView>> {
    const employees = (await this.people.findAll({ society })) as EmployeeView[];
    return new Map(employees.map((e) => [e.personId, e]));
  }

  /// Empêche d'ajouter à une équipe / d'assigner une tâche à quelqu'un qui n'a pas
  /// d'affectation active dans cette société — imposé côté API.
  async assertActiveMember(society: string, personId: string) {
    const members = await this.loadSocietyMembers(society);
    const match = members.get(personId);
    if (!match || match.status !== "Actif") {
      throw new BadRequestException(`La personne assignée doit être active chez "${society}".`);
    }
  }
}
