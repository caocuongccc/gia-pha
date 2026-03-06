// libs/shared-types/src/index.ts

// ── Enums ─────────────────────────────────────────────────────
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}
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

// ── Chi / Phái ────────────────────────────────────────────────
export interface Phai {
  id: string;
  chiId: string;
  name: string;
  description: string | null;
  founderNote: string | null;
  orderIndex: number;
  _count?: { members: number };
}

export interface Chi {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  founderNote: string | null;
  orderIndex: number;
  phaiList: Phai[];
  _count?: { members: number };
}

// ── Member ────────────────────────────────────────────────────
export interface Member {
  id: string;
  familyId: string;
  fullName: string;
  gender: Gender;
  generation: number;
  birthDate: string | null;
  deathDate: string | null;
  photoUrl: string | null;
  biography: string | null;

  // Từ DB người em
  alias: string | null; // tên khác / tên tự
  childOrder: number | null; // thứ tự con (1=trưởng, 2=thứ...)
  burialPlace: string | null; // nơi an táng
  isOutPerson: boolean; // người ngoại tộc (vợ/chồng lấy vào)
  deathYearAm: string | null; // năm mất âm lịch

  // Đơn vị hiển thị trên cây
  coupleGroupId: string | null; // nhóm "ô gia đình" (chồng + vợ + con chưa lập gia đình)

  // Phân cấp tổ chức
  chiId: string | null;
  phaiId: string | null;
  chi?: { id: string; name: string } | null;
  phai?: { id: string; name: string } | null;

  createdAt: string;
  updatedAt: string;
}

// ── Relationship ──────────────────────────────────────────────
export interface Relationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
  marriageDate: string | null;
  divorceDate: string | null;
  // Populated khi include
  fromMember?: Pick<Member, 'id' | 'fullName' | 'gender' | 'generation'>;
  toMember?: Pick<Member, 'id' | 'fullName' | 'gender' | 'generation'>;
}

// ── Family ────────────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  members?: Member[];
  chiList?: Chi[];
}

// ── Node cây gia phả (dùng cho D3) ───────────────────────────
// Một node = một "ô" trên cây, chứa 1 cặp vợ chồng + con chưa lập gia đình
export interface FamilyTreeNode {
  coupleGroupId: string; // ID của ô
  husband: Member | null; // người đàn ông chính (họ nội)
  wives: Member[]; // vợ (isOutPerson = true)
  children: Member[]; // con (chưa có coupleGroup riêng)
  // Metadata cho D3
  generation: number;
  chiId: string | null;
  phaiId: string | null;
  parentGroupId: string | null; // coupleGroupId của cha (để vẽ đường nối)
}

// ── DTOs ──────────────────────────────────────────────────────
export interface CreateMemberDto {
  fullName: string;
  gender: Gender;
  generation: number;
  birthDate?: string | null;
  deathDate?: string | null;
  biography?: string | null;
  photoUrl?: string | null;
  alias?: string | null;
  childOrder?: number | null;
  burialPlace?: string | null;
  isOutPerson?: boolean;
  deathYearAm?: string | null;
  coupleGroupId?: string | null;
  chiId?: string | null;
  phaiId?: string | null;
}

export interface UpdateMemberDto extends Partial<CreateMemberDto> {}

export interface CreateRelationshipDto {
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
  marriageDate?: string | null;
}

export interface CreateChiDto {
  familyId: string;
  name: string;
  description?: string | null;
  founderNote?: string | null;
  orderIndex?: number;
}

export interface CreatePhaiDto {
  chiId: string;
  name: string;
  description?: string | null;
  founderNote?: string | null;
  orderIndex?: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  detail?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
