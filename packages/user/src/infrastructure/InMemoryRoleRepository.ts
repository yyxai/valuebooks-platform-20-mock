import { Role } from '../domain/Role.js';
import { RoleRepository } from './RoleRepository.js';
import { getAllSystemRoles } from '../domain/SystemRoles.js';

export class InMemoryRoleRepository implements RoleRepository {
  private roles = new Map<string, Role>();

  constructor(includeSystemRoles = true) {
    if (includeSystemRoles) {
      for (const role of getAllSystemRoles()) {
        this.roles.set(role.id, role);
      }
    }
  }

  async save(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async findByName(name: string): Promise<Role | null> {
    const normalizedName = name.toLowerCase();
    for (const role of this.roles.values()) {
      if (role.name.toLowerCase() === normalizedName) {
        return role;
      }
    }
    return null;
  }

  async findAll(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async findByIds(ids: string[]): Promise<Role[]> {
    const roles: Role[] = [];
    for (const id of ids) {
      const role = this.roles.get(id);
      if (role) {
        roles.push(role);
      }
    }
    return roles;
  }

  async delete(id: string): Promise<void> {
    const role = this.roles.get(id);
    if (role?.isSystem) {
      throw new Error('Cannot delete system role');
    }
    this.roles.delete(id);
  }

  // Test helper methods
  clear(keepSystemRoles = true): void {
    if (keepSystemRoles) {
      const systemRoles = Array.from(this.roles.values()).filter(
        (r) => r.isSystem
      );
      this.roles.clear();
      for (const role of systemRoles) {
        this.roles.set(role.id, role);
      }
    } else {
      this.roles.clear();
    }
  }

  size(): number {
    return this.roles.size;
  }
}
