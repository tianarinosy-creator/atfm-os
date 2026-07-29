import { Controller, Get } from "@nestjs/common";
import { ODOO_MODULES } from "../odoo.constants";

/// GET /integrations/odoo/modules — catalogue statique (voir ODOO_MODULES),
/// consommé par les étapes "Sélection" et "Correspondance" de l'assistant.
@Controller("integrations/odoo/modules")
export class ModulesController {
  @Get()
  findAll() {
    return ODOO_MODULES;
  }
}
