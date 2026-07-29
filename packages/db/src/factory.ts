import type { RepositoryBundle } from '@firecare/types';
import type { Db } from './index';
import { DrizzleAssetRepository } from './repositories/asset';
import { DrizzleAuthRepository } from './repositories/auth';
import { DrizzleBranchRepository } from './repositories/branch';
import { DrizzleChecklistTemplateRepository } from './repositories/checklist-template';
import { DrizzleCustomerRepository } from './repositories/customer';
import { DrizzleFaultRepository } from './repositories/fault';
import { DrizzleInspectionRepository } from './repositories/inspection';
import { DrizzleSiteRepository } from './repositories/site';
import { DrizzleUserRepository } from './repositories/user';

/** Production repository bundle backed by Postgres/Drizzle. */
export function createDrizzleRepositories(db: Db): RepositoryBundle {
  return {
    auth: new DrizzleAuthRepository(db),
    users: new DrizzleUserRepository(db),
    branches: new DrizzleBranchRepository(db),
    customers: new DrizzleCustomerRepository(db),
    sites: new DrizzleSiteRepository(db),
    assets: new DrizzleAssetRepository(db),
    checklistTemplates: new DrizzleChecklistTemplateRepository(db),
    inspections: new DrizzleInspectionRepository(db),
    faults: new DrizzleFaultRepository(db),
  };
}
