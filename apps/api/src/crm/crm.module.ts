import { Module } from "@nestjs/common";
import { DirectoryModule } from "../directory/directory.module";
import { ContactsController } from "./contacts/contacts.controller";
import { ContactsService } from "./contacts/contacts.service";
import { DealsController } from "./deals/deals.controller";
import { ContractsController } from "./deals/contracts.controller";
import { DealsService } from "./deals/deals.service";

@Module({
  imports: [DirectoryModule],
  controllers: [ContactsController, DealsController, ContractsController],
  providers: [ContactsService, DealsService],
  exports: [ContactsService, DealsService],
})
export class CrmModule {}
