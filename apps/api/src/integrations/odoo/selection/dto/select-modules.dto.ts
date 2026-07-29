import { IsArray, IsEnum } from "class-validator";
import { OdooModuleId } from "@atfm/db";

export class SelectModulesDto {
  @IsArray()
  @IsEnum(OdooModuleId, { each: true })
  moduleIds!: OdooModuleId[];
}
