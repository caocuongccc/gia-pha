// apps/frontend/src/app/core/services/family.service.ts
// Thêm vào class FamilyService hiện có

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FamilyRole = 'OWNER' | 'EDITOR' | 'VIEWER' | null;

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/families`;

  families = signal<Family[]>([]);
  selectedFamily = signal<Family | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // ✅ Signal lưu role của user hiện tại trong family đang chọn
  private _currentUserRole = signal<FamilyRole>(null);

  // ✅ Public computed — dùng trong guard và directive
  currentUserRole = computed(() => this._currentUserRole());

  count = computed(() => this.families().length);

  // ✅ Load role của user trong 1 family cụ thể
  async loadUserRole(familyId: string): Promise<FamilyRole> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { role: FamilyRole } }>(
          `${this.baseUrl}/${familyId}/my-role`,
        ),
      );
      const role = res.data?.role ?? null;
      this._currentUserRole.set(role);
      return role;
    } catch {
      this._currentUserRole.set(null);
      return null;
    }
  }

  // ✅ Dùng cho guard — check role mà không set signal
  async getUserRole(familyId: string): Promise<FamilyRole> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { role: FamilyRole } }>(
          `${this.baseUrl}/${familyId}/my-role`,
        ),
      );
      return res.data?.role ?? null;
    } catch {
      return null;
    }
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Family[] }>(this.baseUrl),
      );
      this.families.set(res.data ?? []);
    } catch (err: any) {
      this.error.set(err.error?.error ?? 'Không tải được danh sách');
    } finally {
      this.loading.set(false);
    }
  }

  async loadOne(id: string): Promise<Family | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: Family }>(`${this.baseUrl}/${id}`),
      );
      this.selectedFamily.set(res.data ?? null);
      return res.data ?? null;
    } catch {
      return null;
    }
  }

  async create(dto: { name: string; description?: string }): Promise<Family> {
    const res = await firstValueFrom(
      this.http.post<{ data: Family }>(this.baseUrl, dto),
    );
    const family = res.data!;
    this.families.update((list) => [family, ...list]);
    return family;
  }

  async update(id: string, dto: Partial<Family>): Promise<Family> {
    const res = await firstValueFrom(
      this.http.patch<{ data: Family }>(`${this.baseUrl}/${id}`, dto),
    );
    const updated = res.data!;
    this.families.update((list) =>
      list.map((f) => (f.id === id ? updated : f)),
    );
    if (this.selectedFamily()?.id === id) this.selectedFamily.set(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
    this.families.update((list) => list.filter((f) => f.id !== id));
    if (this.selectedFamily()?.id === id) {
      this.selectedFamily.set(null);
      this._currentUserRole.set(null);
    }
  }

  select(family: Family) {
    this.selectedFamily.set(family);
  }

  clearRole() {
    this._currentUserRole.set(null);
  }
}

export interface Family {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
}
