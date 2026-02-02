export interface CreateRoleAssignmentProps {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface ReconstructRoleAssignmentProps {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  expiresAt?: Date;
  scope?: string;
}

export class RoleAssignment {
  public readonly id: string;
  public readonly userId: string;
  public readonly roleId: string;
  public readonly assignedAt: Date;
  public readonly assignedBy?: string;
  public readonly expiresAt?: Date;
  public readonly scope?: string;

  private constructor(
    id: string,
    userId: string,
    roleId: string,
    assignedAt: Date,
    assignedBy?: string,
    expiresAt?: Date,
    scope?: string
  ) {
    this.id = id;
    this.userId = userId;
    this.roleId = roleId;
    this.assignedAt = assignedAt;
    this.assignedBy = assignedBy;
    this.expiresAt = expiresAt;
    this.scope = scope;
  }

  static create(props: CreateRoleAssignmentProps): RoleAssignment {
    const id = crypto.randomUUID();
    const now = new Date();

    return new RoleAssignment(
      id,
      props.userId,
      props.roleId,
      now,
      props.assignedBy,
      props.expiresAt,
      props.scope
    );
  }

  static reconstruct(props: ReconstructRoleAssignmentProps): RoleAssignment {
    return new RoleAssignment(
      props.id,
      props.userId,
      props.roleId,
      props.assignedAt,
      props.assignedBy,
      props.expiresAt,
      props.scope
    );
  }

  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return Date.now() > this.expiresAt.getTime();
  }

  isActive(): boolean {
    return !this.isExpired();
  }
}
