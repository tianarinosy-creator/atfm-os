import { IsString, MinLength } from "class-validator";

/// Les identifiants (dont la clé API) ne transitent que dans ce corps de
/// requête HTTPS, une seule fois, vers le backend — jamais renvoyés ensuite
/// (voir ConnectionService.toStatus). Voir aussi OdooConnectionStep du
/// prototype : mêmes quatre champs, mais réellement vérifiés ici.
export class UpsertConnectionDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  @MinLength(1)
  database!: string;

  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  apiKey!: string;
}
