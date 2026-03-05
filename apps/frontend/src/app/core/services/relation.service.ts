import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ✅ Import thẳng từ shared-types để đồng bộ với TreeViewComponent
import type { Relationship } from '@gia-pha/shared-types';

// ✅ Re-export để các file khác import từ 1 chỗ
export type { Relationship };

export type RelationType = 'PARENT' | 'SPOUSE' | 'SIBLING';

export interface CreateRelationDto {
  familyId: string;
  fromMemberId: string; // ✅ dùng đúng tên field của Relationship
  toMemberId: string;
  type: RelationType;
}

@Injectable({ providedIn: 'root' })
export class RelationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/relations`;

  // ✅ Signal dùng type Relationship (có fromMemberId, toMemberId)
  relations = signal<Relationship[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  async loadByFamily(familyId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Relationship[] }>(
          `${this.baseUrl}?familyId=${familyId}`,
        ),
      );
      this.relations.set(res.data ?? []);
    } catch (err: any) {
      this.error.set(err.error?.error ?? 'Không tải được quan hệ');
    } finally {
      this.loading.set(false);
    }
  }

  async create(dto: CreateRelationDto): Promise<Relationship> {
    const res = await firstValueFrom(
      this.http.post<{ data: Relationship }>(this.baseUrl, dto),
    );
    const relation = res.data!;
    this.relations.update((list) => [...list, relation]);
    return relation;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
    this.relations.update((list) => list.filter((r) => r.id !== id));
  }

  getRelationsOf(memberId: string) {
    return this.relations().filter(
      (r) => r.fromMemberId === memberId || r.toMemberId === memberId,
    );
  }

  getChildren(memberId: string) {
    return this.relations()
      .filter((r) => r.type === 'PARENT' && r.fromMemberId === memberId)
      .map((r) => r.toMemberId);
  }

  getSpouses(memberId: string) {
    return this.relations()
      .filter(
        (r) =>
          r.type === 'SPOUSE' &&
          (r.fromMemberId === memberId || r.toMemberId === memberId),
      )
      .map((r) =>
        r.fromMemberId === memberId ? r.toMemberId : r.fromMemberId,
      );
  }

  clear() {
    this.relations.set([]);
  }
}
