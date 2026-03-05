import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Member } from '@gia-pha/shared-types';

// ✅ Optional fields dùng undefined (không phải null) — khớp với ReactiveForm .value
export interface CreateMemberDto {
  familyId: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  generation: number;
  birthDate?: string; // ✅ optional = string | undefined
  deathDate?: string;
  biography?: string; // ✅ biography — khớp Prisma schema
  photoUrl?: string;
}

export type UpdateMemberDto = Partial<Omit<CreateMemberDto, 'familyId'>>;

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/members`;

  members = signal<Member[]>([]);
  selectedMember = signal<Member | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  count = computed(() => this.members().length);

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

  async create(dto: CreateMemberDto): Promise<Member> {
    const res = await firstValueFrom(
      this.http.post<{ data: Member }>(this.baseUrl, dto),
    );
    const member = res.data!;
    this.members.update((list) => [...list, member]);
    return member;
  }

  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
    const res = await firstValueFrom(
      this.http.patch<{ data: Member }>(`${this.baseUrl}/${id}`, dto),
    );
    const updated = res.data!;
    this.members.update((list) => list.map((m) => (m.id === id ? updated : m)));
    if (this.selectedMember()?.id === id) this.selectedMember.set(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
    this.members.update((list) => list.filter((m) => m.id !== id));
    if (this.selectedMember()?.id === id) this.selectedMember.set(null);
  }

  // ✅ Method family-detail.page.ts cần trong ngOnDestroy
  clearSelected() {
    this.selectedMember.set(null);
  }

  select(member: Member) {
    this.selectedMember.set(member);
  }

  clear() {
    this.members.set([]);
    this.selectedMember.set(null);
  }
}
