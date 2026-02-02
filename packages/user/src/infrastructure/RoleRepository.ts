import { Role } from '../domain/Role.js';

export interface RoleRepository {
  save(role: Role): Promise<void>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  findByIds(ids: string[]): Promise<Role[]>;
  delete(id: string): Promise<void>;
}
