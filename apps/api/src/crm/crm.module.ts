import { Module } from "@nestjs/common";
import { PeopleModule } from "../people/people.module";
import { DirectoryLookupService } from "./directory-lookup.service";
import { ContactsController } from "./contacts/contacts.controller";
import { ContactsService } from "./contacts/contacts.service";
import { DealsController } from "./deals/deals.controller";
import { ContractsController } from "./deals/contracts.controller";
import { DealsService } from "./deals/deals.service";

@Module({
  imports: [PeopleModule],
  controllers: [ContactsController, DealsController, ContractsController],
  providers: [DirectoryLookupService, ContactsService, DealsService],
})
export class CrmModule {}
