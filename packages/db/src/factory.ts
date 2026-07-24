import type { RepositoryBundle } from '@firecare/types';
import type { Db } from './index';
import { DrizzleAuthRepository } from './repositories/auth';
import { DrizzleBranchRepository } from './repositories/branch';
import { DrizzleCustomerRepository } from './repositories/customer';
import { DrizzleUserRepository } from './repositories/user';

/** Production repository bundle backed by Postgres/Drizzle. */
export function createDrizzleRepositories(db: Db): RepositoryBundle {
  return {
    auth: new DrizzleAuthRepository(db),
    users: new DrizzleUserRepository(db),
    branches: new DrizzleBranchRepository(db),
    customers: new DrizzleCustomerRepository(db),
  };
}
