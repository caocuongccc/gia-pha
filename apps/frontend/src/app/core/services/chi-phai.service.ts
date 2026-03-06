// apps/frontend/src/app/core/services/chi-phai.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class ChiPhaiService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api`;

  chiList = signal<Chi[]>([]);
  loading = signal(false);

  allPhai = computed(() =>
    this.chiList().flatMap((c) =>
      c.phaiList.map((p) => ({ ...p, chiName: c.name })),
    ),
  );
  totalMembers = computed(() =>
    this.chiList().reduce((s, c) => s + (c._count?.members ?? 0), 0),
  );

  async load(familyId: string) {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(
        this.http.get<{ data: Chi[] }>(`${this.api}/chi?familyId=${familyId}`),
      );
      this.chiList.set(r.data ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  async createChi(
    familyId: string,
    name: string,
    description?: string,
    founderNote?: string,
  ) {
    const r = await firstValueFrom(
      this.http.post<{ data: Chi }>(`${this.api}/chi`, {
        familyId,
        name,
        description,
        founderNote,
        orderIndex: this.chiList().length,
      }),
    );
    this.chiList.update((list) => [...list, { ...r.data, phaiList: [] }]);
    return r.data;
  }

  async updateChi(id: string, dto: Partial<Chi>) {
    const r = await firstValueFrom(
      this.http.patch<{ data: Chi }>(`${this.api}/chi/${id}`, dto),
    );
    this.chiList.update((list) =>
      list.map((c) => (c.id === id ? { ...r.data, phaiList: c.phaiList } : c)),
    );
  }

  async deleteChi(id: string) {
    await firstValueFrom(this.http.delete(`${this.api}/chi/${id}`));
    this.chiList.update((list) => list.filter((c) => c.id !== id));
  }

  async createPhai(chiId: string, name: string, founderNote?: string) {
    const chi = this.chiList().find((c) => c.id === chiId);
    const r = await firstValueFrom(
      this.http.post<{ data: Phai }>(`${this.api}/phai`, {
        chiId,
        name,
        founderNote,
        orderIndex: chi?.phaiList.length ?? 0,
      }),
    );
    this.chiList.update((list) =>
      list.map((c) =>
        c.id === chiId ? { ...c, phaiList: [...c.phaiList, r.data] } : c,
      ),
    );
    return r.data;
  }

  async updatePhai(id: string, chiId: string, dto: Partial<Phai>) {
    const r = await firstValueFrom(
      this.http.patch<{ data: Phai }>(`${this.api}/phai/${id}`, dto),
    );
    this.chiList.update((list) =>
      list.map((c) =>
        c.id === chiId
          ? {
              ...c,
              phaiList: c.phaiList.map((p) => (p.id === id ? r.data : p)),
            }
          : c,
      ),
    );
  }

  async deletePhai(id: string, chiId: string) {
    await firstValueFrom(this.http.delete(`${this.api}/phai/${id}`));
    this.chiList.update((list) =>
      list.map((c) =>
        c.id === chiId
          ? { ...c, phaiList: c.phaiList.filter((p) => p.id !== id) }
          : c,
      ),
    );
  }

  async assignMember(
    memberId: string,
    chiId: string | null,
    phaiId: string | null,
  ) {
    await firstValueFrom(
      this.http.patch(`${this.api}/members/${memberId}`, { chiId, phaiId }),
    );
  }

  clear() {
    this.chiList.set([]);
  }
}
