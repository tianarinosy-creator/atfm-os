import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { DocumentCategory } from "@atfm/db";
import { DOC_PERMISSIONS } from "../documents.constants";

export class CreateDocumentDto {
  @IsString()
  society!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  // Propriétaire — person_id du Core Directory (actif chez `society`, vérifié
  // côté service), jamais un nom stocké (voir section 5 du dossier de passation).
  @IsUUID()
  ownerPersonId!: string;

  @IsOptional()
  @IsIn(DOC_PERMISSIONS)
  permissions?: (typeof DOC_PERMISSIONS)[number];
}
