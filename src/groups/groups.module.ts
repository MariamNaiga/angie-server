import { HttpModule, Module } from '@nestjs/common';
import { GroupsService } from './services/groups.service';
import { GroupCategoriesService } from './services/group-categories.service';
import { GroupController } from './controllers/group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { groupEntities } from './groups.helpers';
import { GroupCategoryController } from './controllers/group-category.controller';
import { GroupComboController } from './controllers/group-combo.controller';
import { GroupsMembershipService } from './services/group-membership.service';
import { GroupMembershipController } from './controllers/group-membership.controller';
import { VendorModule } from '../vendor/vendor.module';
import { GroupMembershipReqeustController } from './controllers/group-membership-request.contoller';
import { GroupMembershipRequestService } from './services/group-membership-request.service';
import { ContactsService } from 'src/crm/contacts.service';
import { crmEntities } from 'src/crm/crm.helpers';
import { GoogleService } from '../vendor/google.service';
import { PrismaService } from '../shared/prisma.service';
import { EventsService } from 'src/events/events.service';
import { eventEntities } from 'src/events/events.helpers';

@Module({
  imports: [
    VendorModule,
    HttpModule,
    TypeOrmModule.forFeature([...groupEntities, ...crmEntities, ...eventEntities]),
  ],
  providers: [
    GroupsService,
    GroupCategoriesService,
    GroupsMembershipService,
    GroupMembershipRequestService,
    ContactsService,
    GoogleService,
    PrismaService,
    EventsService,
  ],
  controllers: [
    GroupController,
    GroupCategoryController,
    GroupComboController,
    GroupMembershipController,
    GroupMembershipReqeustController,
  ],
  exports: [GroupsService, GroupCategoriesService],
})
export class GroupsModule {}
