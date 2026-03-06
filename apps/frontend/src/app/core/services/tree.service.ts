// apps/frontend/src/app/core/services/tree.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  Member,
  Relationship,
  Chi,
  FamilyTreeNode,
  RelationshipType,
} from '@gia-pha/shared-types';

export interface TreeData {
  members: Member[];
  relationships: Relationship[];
  chiList: Chi[];
  treeNodes: FamilyTreeNode[];
  ungrouped: Member[];
  stats: {
    totalMembers: number;
    totalGenerations: number;
    chiCount: number;
    phaiCount: number;
  };
}

export type ViewMode = 'bloodline' | 'organization' | 'combined';

@Injectable({ providedIn: 'root' })
export class TreeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api`;

  // ── State ──────────────────────────────────────────────────
  treeData = signal<TreeData | null>(null);
  loading = signal(false);
  viewMode = signal<ViewMode>('combined');
  selectedChi = signal<string | null>(null); // filter theo chi
  selectedPhai = signal<string | null>(null); // filter theo phái

  // ── Computed ───────────────────────────────────────────────

  // Toàn bộ members (lookup map)
  memberMap = computed(() => {
    const map = new Map<string, Member>();
    this.treeData()?.members.forEach((m) => map.set(m.id, m));
    return map;
  });

  // Members filtered theo chi/phái đang chọn
  filteredMembers = computed(() => {
    const data = this.treeData();
    if (!data) return [];

    return data.members.filter((m) => {
      if (this.selectedChi() && m.chiId !== this.selectedChi()) return false;
      if (this.selectedPhai() && m.phaiId !== this.selectedPhai()) return false;
      return true;
    });
  });

  // Nodes filtered theo chi/phái
  filteredNodes = computed(() => {
    const data = this.treeData();
    if (!data) return [];

    return data.treeNodes.filter((node) => {
      if (this.selectedChi() && node.chiId !== this.selectedChi()) return false;
      if (this.selectedPhai() && node.phaiId !== this.selectedPhai())
        return false;
      return true;
    });
  });

  // Phân nhóm theo đời — dùng cho timeline view
  byGeneration = computed(() => {
    const members = this.filteredMembers();
    const map = new Map<number, Member[]>();
    for (const m of members) {
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
        label: `Đời ${gen}`,
      }));
  });

  // Phân nhóm theo chi — dùng cho organization view
  byChiPhai = computed(() => {
    const data = this.treeData();
    if (!data) return [];

    return data.chiList.map((chi) => ({
      chi,
      phaiList: chi.phaiList.map((phai) => ({
        phai,
        members: data.members
          .filter((m) => m.phaiId === phai.id)
          .sort((a, b) => a.generation - b.generation),
      })),
      membersNoPhai: data.members.filter(
        (m) => m.chiId === chi.id && !m.phaiId,
      ),
    }));
  });

  // Cha mẹ của 1 member
  getParents(memberId: string): Member[] {
    const rels = this.treeData()?.relationships ?? [];
    const map = this.memberMap();
    return rels
      .filter((r) => r.type === 'PARENT' && r.toMemberId === memberId)
      .map((r) => map.get(r.fromMemberId))
      .filter(Boolean) as Member[];
  }

  // Con cái của 1 member
  getChildren(memberId: string): Member[] {
    const rels = this.treeData()?.relationships ?? [];
    const map = this.memberMap();
    return rels
      .filter((r) => r.type === 'PARENT' && r.fromMemberId === memberId)
      .map((r) => map.get(r.toMemberId))
      .filter(Boolean) as Member[];
  }

  // Vợ/chồng của 1 member
  getSpouses(memberId: string): Member[] {
    const rels = this.treeData()?.relationships ?? [];
    const map = this.memberMap();
    return rels
      .filter(
        (r) =>
          r.type === 'SPOUSE' &&
          (r.fromMemberId === memberId || r.toMemberId === memberId),
      )
      .map((r) =>
        r.fromMemberId === memberId
          ? map.get(r.toMemberId)
          : map.get(r.fromMemberId),
      )
      .filter(Boolean) as Member[];
  }

  // ── Load ──────────────────────────────────────────────────
  async loadTree(familyId: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: TreeData }>(
          `${this.api}/families/${familyId}/tree`,
        ),
      );
      this.treeData.set(res.data);
    } catch (e) {
      console.error('[TreeService] load error', e);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Filters ───────────────────────────────────────────────
  filterByChi(chiId: string | null) {
    this.selectedChi.set(chiId);
    this.selectedPhai.set(null);
  }
  filterByPhai(phaiId: string | null) {
    this.selectedPhai.set(phaiId);
  }
  clearFilter() {
    this.selectedChi.set(null);
    this.selectedPhai.set(null);
  }
  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
  }
  clear() {
    this.treeData.set(null);
  }
}
