// libs/shared-types/src/index.ts

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

// ✅ Giữ đúng Prisma enum: PARENT (không phải PARENT_CHILD)
export enum RelationshipType {
  PARENT = 'PARENT',
  SPOUSE = 'SPOUSE',
  SIBLING = 'SIBLING',
}

export enum FamilyRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface Family {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  members?: Member[];
}

export interface Member {
  id: string;
  familyId: string;
  fullName: string;
  generation: number;
  gender: Gender;
  birthDate: string | null;
  deathDate: string | null;
  photoUrl: string | null;
  // ✅ Prisma schema dùng 'biography' — đổi tên cho đúng
  biography: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
  marriageDate?: string;
  divorceDate?: string;
}

export interface CreateMemberDto {
  fullName: string;
  gender: Gender;
  birthDate?: string;
  generation: number;
}

export interface CreateRelationshipDto {
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
