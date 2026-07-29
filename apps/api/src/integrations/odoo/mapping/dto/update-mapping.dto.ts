import { IsEnum, IsString, MinLength } from "class-validator";
import { OdooModuleId } from "@atfm/db";

export class UpdateMappingDto {
  @IsEnum(OdooModuleId)
  moduleId!: OdooModuleId;

  @IsString()
  odooField!: string;

  @IsString()
  @MinLength(1)
  atfmLabel!: string;
}
