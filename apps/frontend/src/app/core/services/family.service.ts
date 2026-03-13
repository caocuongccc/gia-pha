// apps/frontend/src/app/core/services/family.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type FamilyRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Family {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  slug?: string | null;
  myRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
  _count?: { members: number };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private http = inject(HttpClient);

  families = signal<Family[]>([]);
  selectedFamily = signal<Family | null>(null);
  loading = signal(false);
  error = signal('');

  count = computed(() => this.families().length);

  // Role của user hiện tại trong gia phả đang chọn
  currentUserRole = signal<FamilyRole | null>(null);

  async loadAll() {
    this.loading.set(true);
    this.error.set('');
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families`)
        .toPromise();
      this.families.set(r?.data ?? []);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Không tải được danh sách họ');
    } finally {
      this.loading.set(false);
    }
  }

  select(family: Family) {
    this.selectedFamily.set(family);
  }

  async loadOne(familyId: string): Promise<void> {
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${familyId}`)
        .toPromise();
      const family: Family = r.data;
      this.selectedFamily.set(family);
      // Cập nhật lại trong danh sách nếu đã có
      this.families.update((list) =>
        list.some((f) => f.id === familyId)
          ? list.map((f) => (f.id === familyId ? { ...f, ...family } : f))
          : list,
      );
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Không tải được gia phả');
    }
  }

  async getUserRole(familyId: string): Promise<FamilyRole | null> {
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${familyId}/my-role`)
        .toPromise();
      const role = r.data?.role ?? null;
      this.currentUserRole.set(role);
      return role;
    } catch {
      this.currentUserRole.set(null);
      return null;
    }
  }

  async create(data: {
    name: string;
    description?: string;
    isPublic?: boolean;
    slug?: string;
  }): Promise<Family> {
    const r: any = await this.http
      .post(`${environment.apiUrl}/api/families`, data)
      .toPromise();
    const family: Family = r.data;
    this.families.update((list) => [family, ...list]);
    return family;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      coverUrl: string;
      isPublic: boolean;
      slug: string | null;
    }>,
  ): Promise<Family> {
    const r: any = await this.http
      .patch(`${environment.apiUrl}/api/families/${id}`, data)
      .toPromise();
    const updated: Family = r.data;
    this.families.update((list) =>
      list.map((f) => (f.id === id ? { ...f, ...updated } : f)),
    );
    if (this.selectedFamily()?.id === id) {
      this.selectedFamily.update((f) => (f ? { ...f, ...updated } : f));
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.http
      .delete(`${environment.apiUrl}/api/families/${id}`)
      .toPromise();
    this.families.update((list) => list.filter((f) => f.id !== id));
    if (this.selectedFamily()?.id === id) {
      this.selectedFamily.set(null);
    }
  }
}
