import { Module } from "@nestjs/common";
import { PeopleModule } from "../../people/people.module";
import { CrmModule } from "../../crm/crm.module";
import { FinanceModule } from "../../finance/finance.module";
import { ProjectsModule } from "../../projects/projects.module";
import { DocumentsModule } from "../../documents/documents.module";
import { ConnectionController } from "./connection/connection.controller";
import { ConnectionService } from "./connection/connection.service";
import { ModulesController } from "./modules/modules.controller";
import { SelectionController } from "./selection/selection.controller";
import { SelectionService } from "./selection/selection.service";
import { MappingController } from "./mapping/mapping.controller";
import { MappingService } from "./mapping/mapping.service";
import { ImportController } from "./import/import.controller";
import { ImportService } from "./import/import.service";

@Module({
  imports: [PeopleModule, CrmModule, FinanceModule, ProjectsModule, DocumentsModule],
  controllers: [ConnectionController, ModulesController, SelectionController, MappingController, ImportController],
  providers: [ConnectionService, SelectionService, MappingService, ImportService],
})
export class OdooModule {}
