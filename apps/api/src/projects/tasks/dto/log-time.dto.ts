import { IsInt, Min } from "class-validator";

export class LogTimeDto {
  // Heures entières, ajoutées au temps déjà loggé (jamais un remplacement — voir
  // logTime() du prototype : `timeLoggedH: (task.timeLoggedH || 0) + h`).
  @IsInt()
  @Min(1)
  hours!: number;
}
