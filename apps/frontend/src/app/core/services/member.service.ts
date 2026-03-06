// apps/frontend/src/app/core/services/member.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Member } from '@gia-pha/shared-types';

export interface CreateMemberDto {
  familyId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  generation: number;
  birthDate?: string | null;
  deathDate?: string | null;
  deathYearAm?: string | null;
  biography?: string | null;
  photoUrl?: string | null;
  alias?: string | null;
  childOrder?: number | null;
  burialPlace?: string | null;
  isOutPerson?: boolean;
  coupleGroupId?: string | null;
  chiId?: string | null;
  phaiId?: string | null;
}

export type UpdateMemberDto = Partial<Omit<CreateMemberDto, 'familyId'>>;

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/members`;

  // ── State signals ─────────────────────────────────────────
  members = signal<Member[]>([]);
  selectedMember = signal<Member | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────
  count = computed(() => this.members().length);

  byGeneration = computed(() => {
    const map = new Map<number, Member[]>();
    for (const m of this.members()) {
      if (!map.has(m.generation)) map.set(m.generation, []);
      map.get(m.generation)!.push(m);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([gen, list]) => ({
        generation: gen,
        members: list.sort(
          (a, b) => (a.childOrder ?? 99) - (b.childOrder ?? 99),
        ),
      }));
  });

  // ── Load ──────────────────────────────────────────────────
  async loadByFamily(familyId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Member[] }>(
          `${this.baseUrl}?familyId=${familyId}`,
        ),
      );
      this.members.set(res.data ?? []);
    } catch (err: any) {
      this.error.set(err.error?.error ?? 'Không tải được thành viên');
    } finally {
      this.loading.set(false);
    }
  }

  // ── CRUD ──────────────────────────────────────────────────
  async getById(id: string): Promise<Member> {
    const res = await firstValueFrom(
      this.http.get<{ data: Member }>(`${this.baseUrl}/${id}`),
    );
    return res.data;
  }

  async create(dto: CreateMemberDto): Promise<Member> {
    const res = await firstValueFrom(
      this.http.post<{ data: Member }>(this.baseUrl, dto),
    );
    const member = res.data;
    this.members.update((list) => [...list, member]);
    return member;
  }

  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
    const res = await firstValueFrom(
      this.http.patch<{ data: Member }>(`${this.baseUrl}/${id}`, dto),
    );
    const updated = res.data;
    this.members.update((list) => list.map((m) => (m.id === id ? updated : m)));
    if (this.selectedMember()?.id === id) this.selectedMember.set(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
    this.members.update((list) => list.filter((m) => m.id !== id));
    if (this.selectedMember()?.id === id) this.selectedMember.set(null);
  }

  // ── Assignment ────────────────────────────────────────────
  async assignChiPhai(id: string, chiId: string | null, phaiId: string | null) {
    return this.update(id, { chiId, phaiId });
  }

  async assignCoupleGroup(id: string, coupleGroupId: string | null) {
    return this.update(id, { coupleGroupId });
  }

  // ── Selection ─────────────────────────────────────────────
  select(member: Member | null) {
    this.selectedMember.set(member);
  }

  clearSelected() {
    this.selectedMember.set(null);
  }

  // ── Helpers ───────────────────────────────────────────────
  newCoupleGroupId(): string {
    return crypto.randomUUID();
  }

  displayName(m: Member): string {
    return m.alias ? `${m.fullName} (${m.alias})` : m.fullName;
  }

  lifespan(m: Member): string {
    const birth = m.birthDate ? new Date(m.birthDate).getFullYear() : '?';
    if (m.deathDate) return `${birth}–${new Date(m.deathDate).getFullYear()}`;
    if ((m as any).deathYearAm)
      return `${birth}–${(m as any).deathYearAm} (ÂL)`;
    return `${birth}–`;
  }

  childOrderLabel(order: number | null): string {
    if (!order) return '';
    const labels = [
      '',
      'Trưởng',
      'Thứ',
      'Ba',
      'Tư',
      'Năm',
      'Sáu',
      'Bảy',
      'Tám',
      'Chín',
      'Mười',
    ];
    return labels[order] ?? `Thứ ${order}`;
  }

  // ── Reset ─────────────────────────────────────────────────
  clear() {
    this.members.set([]);
    this.selectedMember.set(null);
    this.error.set(null);
  }
}
