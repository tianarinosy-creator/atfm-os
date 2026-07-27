import { Module } from "@nestjs/common";
import { PeopleModule } from "../people/people.module";
import { DirectoryLookupService } from "./directory-lookup.service";

@Module({
  imports: [PeopleModule],
  providers: [DirectoryLookupService],
  exports: [DirectoryLookupService],
})
export class DirectoryModule {}
