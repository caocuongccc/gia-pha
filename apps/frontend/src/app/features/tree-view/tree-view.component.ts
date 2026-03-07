// apps/frontend/src/app/features/tree-view/tree-view.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  effect,
  signal,
} from '@angular/core';
import * as d3 from 'd3';
import type { Member, Relationship } from '@gia-pha/shared-types';

interface TreeNode {
  id: string;
  data: Member;
  children?: TreeNode[];
}

interface GroupNode {
  id: string;
  patriarch: Member;
  leafChildren: Member[];
  children?: GroupNode[];
}

@Component({
  selector: 'app-tree-view',
  standalone: true,
  template: `
    <div class="search-wrap">
      <div class="search-row">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          placeholder="Tìm theo tên..."
          [value]="searchQuery()"
          (input)="onSearch($any($event.target).value)"
          (focus)="onSearchFocus()"
          (blur)="onSearchBlur()"
        />
        @if (searchQuery()) {
          <button class="search-clear" (mousedown)="clearSearch()">✕</button>
        }
        <div class="mode-divider"></div>
        <div class="mode-toggle">
          <button
            class="mode-btn"
            [class.active]="treeMode() === 'tree'"
            (mousedown)="setMode('tree')"
            title="Cây thường"
          >
            🌳
          </button>
          <button
            class="mode-btn"
            [class.active]="treeMode() === 'group'"
            (mousedown)="setMode('group')"
            title="Theo nhóm"
          >
            ⬜
          </button>
        </div>
      </div>
      @if (searchOpen()) {
        @if (searchResults().length > 0) {
          <div class="search-dropdown">
            @for (m of searchResults(); track m.id) {
              <div class="search-item" (mousedown)="selectResult(m)">
                <span class="si-gen">Đ{{ m.generation }}</span>
                <span class="si-name">{{ m.fullName }}</span>
                @if (m.alias) {
                  <span class="si-alias">({{ m.alias }})</span>
                }
                @if (m.chi) {
                  <span class="si-chi">{{ m.chi.name }}</span>
                }
              </div>
            }
          </div>
        }
        @if (searchQuery().length >= 2 && searchResults().length === 0) {
          <div class="search-empty">Không tìm thấy "{{ searchQuery() }}"</div>
        }
      }
    </div>

    <svg #svgRef id="family-tree-svg" class="tree-svg"></svg>

    @if (previewVisible()) {
      <div class="sp-overlay" (click)="previewVisible.set(false)">
        <div class="sp-panel" (click)="$event.stopPropagation()">
          <div class="sp-header">
            <div class="sp-info">
              <span class="sp-gen">Đời {{ previewMember()?.generation }}</span>
              <span class="sp-name">{{ previewMember()?.fullName }}</span>
              @if (previewMember()?.alias) {
                <span class="sp-alias">({{ previewMember()!.alias }})</span>
              }
            </div>
            <span class="sp-meta">{{ previewDescCount() }} hậu duệ</span>
            <button class="sp-close" (click)="previewVisible.set(false)">
              ✕
            </button>
          </div>
          <svg id="preview-svg" class="sp-svg"></svg>
        </div>
      </div>
    }

    <div
      #tooltip
      class="node-tooltip"
      [style.display]="tooltipVisible() ? 'block' : 'none'"
    >
      <strong>{{ tooltipData().name }}</strong>
      <span>{{ tooltipData().meta }}</span>
      @if (tooltipData().chi) {
        <span class="tt-chi">🌿 {{ tooltipData().chi }}</span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        height: 100%;
      }
      .tree-svg {
        flex: 1;
        width: 100%;
        min-height: 0;
      }
      .search-wrap {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 50;
        width: 300px;
      }
      .search-row {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #0c1828;
        border: 1px solid #3b4a6e;
        border-radius: 20px;
        padding: 0 14px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        transition: border-color 0.15s;
      }
      .search-row:focus-within {
        border-color: #3b82f6;
      }
      .search-icon {
        font-size: 13px;
      }
      .search-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: #e2e8f0;
        font-size: 12px;
        padding: 9px 0;
      }
      .search-input::placeholder {
        color: #475569;
      }
      .search-clear {
        background: none;
        border: none;
        color: #475569;
        cursor: pointer;
        font-size: 13px;
        padding: 0;
        line-height: 1;
      }
      .search-clear:hover {
        color: #e2e8f0;
      }
      .mode-divider {
        width: 1px;
        height: 16px;
        background: #1e3a6e;
        flex-shrink: 0;
        margin: 0 2px;
      }
      .mode-toggle {
        display: flex;
        gap: 1px;
        flex-shrink: 0;
      }
      .mode-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 4px;
        border-radius: 6px;
        opacity: 0.45;
        transition:
          opacity 0.15s,
          background 0.15s;
        line-height: 1;
      }
      .mode-btn:hover {
        opacity: 0.8;
      }
      .mode-btn.active {
        opacity: 1;
        background: #1e3a6e22;
      }
      .search-dropdown {
        background: #0c1828;
        border: 1px solid #1e3a6e;
        border-radius: 10px;
        margin-top: 4px;
        max-height: 240px;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      }
      .search-item {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 8px 14px;
        cursor: pointer;
        border-bottom: 1px solid #1a2540;
      }
      .search-item:last-child {
        border-bottom: none;
      }
      .search-item:hover {
        background: #0f1e38;
      }
      .si-gen {
        font-size: 9px;
        color: #d29922;
        background: #1a1200;
        padding: 1px 5px;
        border-radius: 6px;
        flex-shrink: 0;
      }
      .si-name {
        font-size: 12px;
        color: #e2e8f0;
        flex: 1;
      }
      .si-alias {
        font-size: 10px;
        color: #64748b;
      }
      .si-chi {
        font-size: 9px;
        color: #4ade80;
        background: #0a1a0a;
        padding: 1px 6px;
        border-radius: 6px;
      }
      .search-empty {
        padding: 14px;
        font-size: 12px;
        color: #475569;
        text-align: center;
        background: #0c1828;
        border: 1px solid #1e3a6e;
        border-radius: 10px;
        margin-top: 4px;
      }
      .sp-overlay {
        position: absolute;
        inset: 0;
        z-index: 100;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .sp-panel {
        background: #0c1120;
        border: 1px solid #1e3a6e;
        border-radius: 12px;
        width: 85%;
        max-width: 820px;
        height: 80%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
      }
      .sp-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .sp-info {
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .sp-gen {
        font-size: 11px;
        color: #d29922;
      }
      .sp-name {
        font-size: 14px;
        color: #e2e8f0;
      }
      .sp-alias {
        font-size: 12px;
        color: #64748b;
      }
      .sp-meta {
        font-size: 11px;
        color: #475569;
      }
      .sp-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 18px;
        padding: 0 4px;
      }
      .sp-close:hover {
        color: #e2e8f0;
      }
      .sp-svg {
        flex: 1;
        width: 100%;
      }
      .node-tooltip {
        position: absolute;
        background: #0f1728;
        border: 1px solid #3b82f6;
        border-radius: 8px;
        padding: 8px 12px;
        pointer-events: none;
        font-size: 12px;
        color: #e2e8f0;
        min-width: 160px;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      .node-tooltip strong {
        display: block;
        margin-bottom: 3px;
        font-size: 13px;
      }
      .node-tooltip span {
        display: block;
        color: #64748b;
        font-size: 11px;
      }
      .node-tooltip .tt-chi {
        color: #4ade80;
        margin-top: 3px;
      }
    `,
  ],
})
export class TreeViewComponent {
  @ViewChild('svgRef') svgRef!: ElementRef;
  @ViewChild('tooltip') tooltipEl!: ElementRef;

  members = input.required<Member[]>();
  relations = input.required<Relationship[]>();
  viewOnly = input(false);
  memberClicked = output<Member>();

  private userExpandedIds = new Set<string>();
  private userCollapsedIds = new Set<string>();
  private selectedId = signal<string | null>(null);
  private highlightIds = signal<Set<string>>(new Set());

  searchQuery = signal('');
  searchResults = signal<Member[]>([]);
  searchOpen = signal(false);
  treeMode = signal<'tree' | 'group'>('tree');

  previewVisible = signal(false);
  previewMember = signal<Member | null>(null);
  previewDescCount = signal(0);

  tooltipVisible = signal(false);
  tooltipData = signal({ name: '', meta: '', chi: '' });

  private nodeSelection!: d3.Selection<
    SVGGElement,
    d3.HierarchyPointNode<TreeNode>,
    SVGGElement,
    unknown
  >;
  private linkSelection!: d3.Selection<
    SVGPathElement,
    d3.HierarchyPointLink<TreeNode>,
    SVGGElement,
    unknown
  >;
  private rootHierarchy!: d3.HierarchyPointNode<TreeNode>;
  private zoomRef!: d3.ZoomBehavior<SVGSVGElement, unknown>;

  constructor() {
    effect(() => {
      const m = this.members();
      const r = this.relations();
      const mode = this.treeMode();
      if (m.length) {
        setTimeout(() => {
          if (!this.svgRef) return;
          if (mode === 'group') this.renderGroupTree(m, r);
          else this.renderTree(m, r);
        }, 0);
      }
    });
  }

  private buildHierarchy(
    members: Member[],
    relations: Relationship[],
  ): TreeNode {
    const parentRels = relations.filter((r) => r.type === ('PARENT' as any));
    const childrenMap = new Map<string, string[]>();
    parentRels.forEach((r) => {
      if (!childrenMap.has(r.fromMemberId)) childrenMap.set(r.fromMemberId, []);
      childrenMap.get(r.fromMemberId)!.push(r.toMemberId);
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const childIds = new Set(parentRels.map((r) => r.toMemberId));
    const roots = members.filter((m) => !childIds.has(m.id));
    const rootMember =
      roots.sort((a, b) => a.generation - b.generation)[0] ?? members[0];
    const visited = new Set<string>();
    const buildNode = (id: string): TreeNode => {
      const member = memberMap.get(id)!;
      visited.add(id);
      const kids = (childrenMap.get(id) ?? []).filter(
        (cid) => !visited.has(cid),
      );
      return { id, data: member, children: kids.map((cid) => buildNode(cid)) };
    };
    return buildNode(rootMember.id);
  }

  private getAncestorIds(node: d3.HierarchyPointNode<TreeNode>): Set<string> {
    const ids = new Set<string>();
    let cur: d3.HierarchyNode<TreeNode> | null = node;
    while (cur) {
      ids.add(cur.data.id);
      cur = cur.parent;
    }
    return ids;
  }

  private buildGroupHierarchy(
    members: Member[],
    relations: Relationship[],
  ): GroupNode {
    const parentRels = relations.filter((r) => (r as any).type === 'PARENT');
    const childrenMap = new Map<string, string[]>();
    parentRels.forEach((r) => {
      if (!childrenMap.has(r.fromMemberId)) childrenMap.set(r.fromMemberId, []);
      childrenMap.get(r.fromMemberId)!.push(r.toMemberId);
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));
    const childIds = new Set(parentRels.map((r) => r.toMemberId));
    const roots = members.filter((m) => !childIds.has(m.id));
    const rootMember =
      roots.sort((a, b) => a.generation - b.generation)[0] ?? members[0];
    const visited = new Set<string>();
    const buildGroup = (patriarchId: string): GroupNode => {
      visited.add(patriarchId);
      const patriarch = memberMap.get(patriarchId)!;
      const directKids = (childrenMap.get(patriarchId) ?? []).filter(
        (c) => !visited.has(c),
      );
      const leafChildren: Member[] = [];
      const subGroups: GroupNode[] = [];
      for (const kidId of directKids) {
        visited.add(kidId);
        const hasOwnKids = (childrenMap.get(kidId) ?? []).length > 0;
        if (hasOwnKids) {
          subGroups.push(buildGroup(kidId));
        } else {
          leafChildren.push(memberMap.get(kidId)!);
        }
      }
      return { id: patriarchId, patriarch, leafChildren, children: subGroups };
    };
    return buildGroup(rootMember.id);
  }

  private renderGroupTree(members: Member[], relations: Relationship[]) {
    const svgEl = this.svgRef.nativeElement;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.selectAll('*').remove();
    const W = svgEl.clientWidth || 900;
    const H = svgEl.clientHeight || 600;
    const g = svg.append('g').attr('class', 'tree-root');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    this.zoomRef = zoom;
    const CARD_W = 200;
    const LEAF_H = 20;
    const HEAD_H = 42;
    const PAD = 8;
    const cardH = (node: GroupNode) =>
      HEAD_H + PAD + Math.max(0, node.leafChildren.length) * LEAF_H + PAD;
    const groupRoot = this.buildGroupHierarchy(members, relations);
    const hier = d3.hierarchy<GroupNode>(groupRoot, (d) => d.children ?? []);
    const maxH = HEAD_H + PAD + 8 * LEAF_H + PAD;
    d3.tree<GroupNode>().nodeSize([CARD_W + 40, maxH + 60])(hier as any);
    g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(hier.links())
      .join('path')
      .attr('d', (d: any) => {
        const sh = cardH(d.source.data);
        const sx = d.source.x,
          sy = d.source.y + sh,
          tx = d.target.x,
          ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#2a3a4a')
      .attr('stroke-width', 1.5);
    const cards = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, d3.HierarchyPointNode<GroupNode>>('g')
      .data(hier.descendants() as d3.HierarchyPointNode<GroupNode>[])
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x - CARD_W / 2},${d.y})`)
      .style('cursor', 'pointer');
    cards
      .append('rect')
      .attr('width', CARD_W)
      .attr('height', (d) => cardH(d.data))
      .attr('rx', 10)
      .attr('fill', '#0c1828')
      .attr('stroke', '#1e3a6e')
      .attr('stroke-width', 1.5);
    cards
      .append('circle')
      .attr('cx', 22)
      .attr('cy', HEAD_H / 2)
      .attr('r', 14)
      .attr('fill', (d) =>
        d.data.patriarch.gender === 'MALE' ? '#0e2a4a' : '#2a0e3a',
      )
      .attr('stroke', (d) =>
        d.data.patriarch.gender === 'MALE' ? '#3b82f6' : '#a855f7',
      )
      .attr('stroke-width', 1.5);
    cards
      .append('text')
      .attr('x', 22)
      .attr('cy', HEAD_H / 2 + 1)
      .attr('y', HEAD_H / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#94a3b8')
      .text((d) => (d.data.patriarch.gender === 'MALE' ? '♂' : '♀'));
    cards
      .append('text')
      .attr('x', 44)
      .attr('y', HEAD_H / 2 - 5)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#e2e8f0')
      .text((d) => {
        const n = d.data.patriarch.fullName;
        return n.length > 18 ? n.slice(0, 16) + '…' : n;
      });
    cards
      .append('text')
      .attr('x', 44)
      .attr('y', HEAD_H / 2 + 9)
      .attr('font-size', '9px')
      .attr('fill', '#d2992280')
      .text((d) => `Đời ${d.data.patriarch.generation}`);
    cards
      .append('text')
      .attr('x', CARD_W - 8)
      .attr('y', 14)
      .attr('text-anchor', 'end')
      .attr('font-size', '9px')
      .attr('fill', '#475569')
      .text((d) => {
        const total =
          d.data.leafChildren.length + (d.data.children?.length ?? 0);
        return total > 0 ? `${total} con` : '';
      });
    cards
      .filter((d) => d.data.leafChildren.length > 0)
      .append('line')
      .attr('x1', 8)
      .attr('x2', CARD_W - 8)
      .attr('y1', HEAD_H + PAD / 2)
      .attr('y2', HEAD_H + PAD / 2)
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1);
    cards.each(function (d) {
      const cardG = d3.select(this);
      d.data.leafChildren.forEach((child, i) => {
        const y = HEAD_H + PAD + i * LEAF_H + LEAF_H / 2 + 3;
        cardG
          .append('circle')
          .attr('cx', 16)
          .attr('cy', y - 3)
          .attr('r', 3)
          .attr('fill', child.gender === 'MALE' ? '#3b82f688' : '#a855f788');
        cardG
          .append('text')
          .attr('x', 26)
          .attr('y', y)
          .attr('font-size', '10px')
          .attr('fill', '#94a3b8')
          .text(() => {
            const n = child.fullName;
            return n.length > 22 ? n.slice(0, 20) + '…' : n;
          });
        cardG
          .append('text')
          .attr('x', CARD_W - 8)
          .attr('y', y)
          .attr('text-anchor', 'end')
          .attr('font-size', '9px')
          .attr('fill', '#334155')
          .text(`Đ${child.generation}`);
      });
    });
    cards.on('click', (ev, d) => {
      ev.stopPropagation();
      this.memberClicked.emit(d.data.patriarch);
    });
    svg.on('click', () => {});
    const bounds = (g.node() as SVGGElement).getBBox();
    if (bounds.width && bounds.height) {
      const pad = 60;
      const scale = Math.min(
        (W - pad * 2) / bounds.width,
        (H - pad * 2) / bounds.height,
        0.9,
      );
      const tx = W / 2 - (bounds.x + bounds.width / 2) * scale;
      const ty = pad - bounds.y * scale;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
  }

  private renderTree(members: Member[], relations: Relationship[]) {
    const svgEl = this.svgRef.nativeElement;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.selectAll('*').remove();
    const W = svgEl.clientWidth || 900;
    const H = svgEl.clientHeight || 600;
    const NODE_W = 148;
    const NODE_H = 72;
    const g = svg.append('g').attr('class', 'tree-root');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    this.zoomRef = zoom;
    const root = d3.hierarchy(this.buildHierarchy(members, relations));
    const INITIAL_DEPTH = 8;
    root.each((d: any) => {
      if (!d.children) return;
      const autoCollapse = d.depth >= INITIAL_DEPTH;
      const forceExpand = this.userExpandedIds.has(d.data.id);
      const forceCollapse = this.userCollapsedIds.has(d.data.id);
      if ((autoCollapse && !forceExpand) || forceCollapse) {
        d._children = d.children;
        d.children = undefined;
      }
    });
    const treeLayout = d3.tree<TreeNode>().nodeSize([NODE_W + 24, NODE_H + 70]);
    treeLayout(root as any);
    this.rootHierarchy = root as d3.HierarchyPointNode<TreeNode>;
    this.linkSelection = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>('path')
      .data(root.links() as d3.HierarchyPointLink<TreeNode>[])
      .join('path')
      .attr('d', (d: any) => {
        const sx = d.source.x,
          sy = d.source.y + NODE_H,
          tx = d.target.x,
          ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#2a3a4a')
      .attr('stroke-width', 1.5);
    this.nodeSelection = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g')
      .data(root.descendants() as d3.HierarchyPointNode<TreeNode>[])
      .join('g')
      .attr('class', (d) => `node node-${d.data.id}`)
      .attr(
        'transform',
        (d) => `translate(${(d as any).x - NODE_W / 2},${(d as any).y})`,
      )
      .style('cursor', 'pointer')
      .on('click', (ev, d) => {
        ev.stopPropagation();
        this.onNodeClick(d);
      })
      .on('dblclick', (ev, d) => {
        ev.stopPropagation();
        this.toggleExpand(d);
      })
      .on('mouseover', (ev, d) => this.showTooltip(ev, d))
      .on('mouseout', () => this.tooltipVisible.set(false));
    this.nodeSelection
      .append('rect')
      .attr('class', 'node-bg')
      .attr('width', NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 9)
      .attr('fill', (d) =>
        d.data.data.gender === 'MALE' ? '#0e1a2d' : '#1a0e28',
      )
      .attr('stroke', (d) => (d.data.data.deathDate ? '#334155' : '#2a3a50'))
      .attr('stroke-width', 1.5);
    this.nodeSelection
      .append('clipPath')
      .attr('id', (d) => `clip-${d.data.id}`)
      .append('circle')
      .attr('cx', 28)
      .attr('cy', NODE_H / 2)
      .attr('r', 22);
    this.nodeSelection
      .append('image')
      .attr(
        'href',
        (d) =>
          d.data.data.photoUrl ??
          `/assets/avatar-${d.data.data.gender.toLowerCase()}.svg`,
      )
      .attr('x', 6)
      .attr('y', NODE_H / 2 - 22)
      .attr('width', 44)
      .attr('height', 44)
      .attr('clip-path', (d) => `url(#clip-${d.data.id})`);
    this.nodeSelection
      .append('text')
      .attr('x', 58)
      .attr('y', 26)
      .attr('font-size', '11px')
      .attr('fill', '#e2e8f0')
      .attr('font-weight', '600')
      .text((d) => {
        const n = d.data.data.fullName;
        return n.length > 15 ? n.slice(0, 13) + '…' : n;
      });
    this.nodeSelection
      .append('text')
      .attr('x', 58)
      .attr('y', 42)
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .text((d) => {
        const m = d.data.data;
        const b = m.birthDate ? new Date(m.birthDate).getFullYear() : '?';
        const x = m.deathDate ? new Date(m.deathDate).getFullYear() : '';
        return x ? `${b}–${x}` : `${b}`;
      });
    this.nodeSelection
      .append('text')
      .attr('x', 58)
      .attr('y', 57)
      .attr('font-size', '9px')
      .attr('fill', '#4ade8088')
      .text((d) => (d.data.data as any).chi?.name ?? '');
    this.nodeSelection
      .append('text')
      .attr('x', NODE_W - 6)
      .attr('y', 13)
      .attr('font-size', '9px')
      .attr('fill', '#d2992280')
      .attr('text-anchor', 'end')
      .text((d) => `Đời ${d.data.data.generation}`);
    this.nodeSelection
      .append('text')
      .attr('x', NODE_W - 6)
      .attr('y', NODE_H - 6)
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .style('cursor', 'pointer')
      .attr('title', 'Xem cây con')
      .text('📊')
      .on('click', (ev, d) => {
        ev.stopPropagation();
        this.openPreview(d.data.data);
      });
    const expandBtn = this.nodeSelection.filter((d: any) => !!d._children);
    expandBtn
      .append('rect')
      .attr('x', NODE_W / 2 - 30)
      .attr('y', NODE_H + 5)
      .attr('width', 60)
      .attr('height', 18)
      .attr('rx', 9)
      .attr('fill', '#1e3a6e')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (ev, d) => {
        ev.stopPropagation();
        this.toggleExpand(d);
      });
    expandBtn
      .append('text')
      .attr('x', NODE_W / 2)
      .attr('y', NODE_H + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#60a5fa')
      .style('pointer-events', 'none')
      .text((d: any) => `▼ ${d._children?.length ?? ''} con`);
    svg.on('click', () => this.clearHighlight());
    this.fitView(svg, g, W, H, zoom);
  }

  private fitView(
    svg: d3.Selection<SVGSVGElement, unknown, any, any>,
    g: d3.Selection<SVGGElement, unknown, any, any>,
    W: number,
    H: number,
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    animated = false,
  ) {
    const bounds = (g.node() as SVGGElement).getBBox();
    if (!bounds.width || !bounds.height) return;
    const pad = 60;
    const scale = Math.min(
      (W - pad * 2) / bounds.width,
      (H - pad * 2) / bounds.height,
      1.2,
    );
    const tx = W / 2 - (bounds.x + bounds.width / 2) * scale;
    const ty = H / 2 - (bounds.y + bounds.height / 2) * scale;
    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
    if (animated) {
      svg.transition().duration(450).call(zoom.transform, t);
    } else {
      svg.call(zoom.transform, t);
    }
  }

  private onNodeClick(d: d3.HierarchyPointNode<TreeNode>) {
    const ancestorIds = this.getAncestorIds(d);
    this.selectedId.set(d.data.id);
    this.highlightIds.set(ancestorIds);
    this.applyHighlight(d, ancestorIds);
    this.memberClicked.emit(d.data.data);
    this.searchOpen.set(false);
  }

  private toggleExpand(clicked: d3.HierarchyPointNode<TreeNode>) {
    const cAny = clicked as any;
    const isOpening = !!cAny._children;
    if (!cAny._children && !clicked.children?.length) return;
    const peers = (this.rootHierarchy?.descendants() ?? []).filter(
      (n: any) => n.depth === clicked.depth,
    );
    for (const n of peers as any[]) {
      if (isOpening) {
        if (n._children) {
          n.children = n._children;
          n._children = undefined;
          this.userExpandedIds.add(n.data.id);
          this.userCollapsedIds.delete(n.data.id);
        }
      } else {
        if (n.children?.length) {
          n._children = n.children;
          n.children = undefined;
          this.userCollapsedIds.add(n.data.id);
          this.userExpandedIds.delete(n.data.id);
        }
      }
    }
    const prevId = this.selectedId();
    this.renderTree(this.members(), this.relations());
    if (prevId) {
      const node = this.rootHierarchy
        ?.descendants()
        .find((d: any) => d.data.id === prevId) as
        | d3.HierarchyPointNode<TreeNode>
        | undefined;
      if (node) this.applyHighlight(node, this.getAncestorIds(node));
    }
  }

  setMode(mode: 'tree' | 'group') {
    this.treeMode.set(mode);
    this.clearHighlight();
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    if (q.trim().length < 1) {
      this.searchResults.set([]);
      this.searchOpen.set(false);
      return;
    }
    const lower = q.toLowerCase();
    this.searchResults.set(
      this.members()
        .filter(
          (m) =>
            m.fullName.toLowerCase().includes(lower) ||
            ((m as any).alias ?? '').toLowerCase().includes(lower),
        )
        .sort((a, b) => a.generation - b.generation)
        .slice(0, 12),
    );
    this.searchOpen.set(true);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.searchOpen.set(false);
    this.clearHighlight();
  }

  onSearchFocus() {
    if (this.searchResults().length > 0) this.searchOpen.set(true);
  }
  onSearchBlur() {
    setTimeout(() => this.searchOpen.set(false), 250);
  }

  selectResult(member: Member) {
    this.searchQuery.set(member.fullName);
    this.searchOpen.set(false);
    this.expandPathTo(member.id);
    this.selectedId.set(member.id);
    this.renderTree(this.members(), this.relations());
    if (this.svgRef && this.zoomRef) {
      const el = this.svgRef.nativeElement;
      const svg = d3.select<SVGSVGElement, unknown>(el);
      const g = svg.select<SVGGElement>('g.tree-root');
      const W = el.clientWidth || 900;
      const H = el.clientHeight || 600;
      this.fitView(svg, g, W, H, this.zoomRef, true);
    }
    // Sau khi fitView xong → highlight node (không panToNode để tránh mất centering)
    setTimeout(() => {
      const node = this.rootHierarchy
        ?.descendants()
        .find((d: any) => d.data.id === member.id) as
        | d3.HierarchyPointNode<TreeNode>
        | undefined;
      if (!node) return;
      const ancestorIds = this.getAncestorIds(node);
      this.highlightIds.set(ancestorIds);
      this.applyHighlight(node, ancestorIds);
      this.memberClicked.emit(member);
    }, 520);
  }

  private expandPathTo(targetId: string) {
    if (!this.rootHierarchy) return;
    const all: any[] = [];
    const q = [this.rootHierarchy as any];
    while (q.length) {
      const n = q.shift();
      all.push(n);
      [...(n.children ?? []), ...(n._children ?? [])].forEach((c: any) =>
        q.push(c),
      );
    }
    const parentOf = new Map<string, any>();
    all.forEach((n) => {
      [...(n.children ?? []), ...(n._children ?? [])].forEach((c: any) =>
        parentOf.set(c.data.id, n),
      );
    });
    let cur = all.find((n) => n.data.id === targetId);
    while (cur) {
      const p = parentOf.get(cur.data.id);
      if (!p) break;
      this.userExpandedIds.add(p.data.id);
      this.userCollapsedIds.delete(p.data.id);
      if (p._children) {
        p.children = p._children;
        p._children = undefined;
      }
      cur = p;
    }
  }

  // FIX 2: H/2 thay vì H/3 — node center theo chiều dọc thay vì bị đẩy lên trên
  private panToNode(node: d3.HierarchyPointNode<TreeNode>) {
    if (!this.svgRef || !this.zoomRef) return;
    const el = this.svgRef.nativeElement;
    const svg = d3.select<SVGSVGElement, unknown>(el);
    const W = el.clientWidth || 900;
    const H = el.clientHeight || 600;
    const cur = d3.zoomTransform(el);
    const nx = (node as any).x * cur.k + cur.x;
    const ny = (node as any).y * cur.k + cur.y;
    svg
      .transition()
      .duration(500)
      .call(
        this.zoomRef.translateBy,
        (W / 2 - nx) / cur.k,
        (H / 2 - ny) / cur.k, // FIX: H/2 thay H/3
      );
  }

  private applyHighlight(
    selected: d3.HierarchyPointNode<TreeNode>,
    ancestorIds: Set<string>,
  ) {
    if (!this.nodeSelection || !this.linkSelection) return;
    this.nodeSelection.each(function (d) {
      const node = d3.select(this);
      const isSelected = d.data.id === selected.data.id;
      const isAncestor = !isSelected && ancestorIds.has(d.data.id);
      const isDimmed = !ancestorIds.has(d.data.id);
      node
        .select('rect.node-bg')
        .transition()
        .duration(250)
        .attr('fill', () => {
          if (isSelected)
            return d.data.data.gender === 'MALE' ? '#1a3a6a' : '#3a1a5a';
          if (isAncestor)
            return d.data.data.gender === 'MALE' ? '#0f2545' : '#25103a';
          return d.data.data.gender === 'MALE' ? '#0e1a2d' : '#1a0e28';
        })
        .attr('stroke', () => {
          if (isSelected) return '#60a5fa';
          if (isAncestor) return '#3b5bdb';
          return d.data.data.deathDate ? '#334155' : '#2a3a50';
        })
        .attr('stroke-width', isSelected ? 2.5 : isAncestor ? 2 : 1.5);
      node
        .transition()
        .duration(250)
        .attr('opacity', isDimmed ? 0.35 : 1);
    });
    this.linkSelection.each(function (d) {
      const lit =
        ancestorIds.has((d.source as any).data.id) &&
        ancestorIds.has((d.target as any).data.id);
      d3.select(this)
        .transition()
        .duration(250)
        .attr('stroke', lit ? '#3b82f6' : '#2a3a4a')
        .attr('stroke-width', lit ? 2.5 : 1.5)
        .attr('opacity', lit ? 1 : 0.2);
    });
    const svgG = d3
      .select(this.svgRef.nativeElement)
      .select<SVGGElement>('g.tree-root');
    svgG.selectAll('.selected-marker').remove();
    svgG
      .append('circle')
      .attr('class', 'selected-marker')
      .attr('cx', (selected as any).x)
      .attr('cy', (selected as any).y - 12)
      .attr('r', 5)
      .attr('fill', '#60a5fa')
      .attr('opacity', 0)
      .transition()
      .duration(300)
      .attr('opacity', 1);
  }

  private clearHighlight() {
    this.selectedId.set(null);
    this.highlightIds.set(new Set());
    if (!this.nodeSelection || !this.linkSelection) return;
    this.nodeSelection.each(function (d) {
      const node = d3.select(this);
      node.transition().duration(200).attr('opacity', 1);
      node
        .select('rect.node-bg')
        .transition()
        .duration(200)
        .attr('fill', d.data.data.gender === 'MALE' ? '#0e1a2d' : '#1a0e28')
        .attr('stroke', d.data.data.deathDate ? '#334155' : '#2a3a50')
        .attr('stroke-width', 1.5);
    });
    this.linkSelection
      .transition()
      .duration(200)
      .attr('stroke', '#2a3a4a')
      .attr('stroke-width', 1.5)
      .attr('opacity', 1);
    d3.select(this.svgRef.nativeElement).select('.selected-marker').remove();
  }

  openPreview(member: Member) {
    const parentRels = this.relations().filter(
      (r) => (r as any).type === 'PARENT',
    );
    const childrenMap = new Map<string, string[]>();
    parentRels.forEach((r) => {
      if (!childrenMap.has(r.fromMemberId)) childrenMap.set(r.fromMemberId, []);
      childrenMap.get(r.fromMemberId)!.push(r.toMemberId);
    });
    const memberMap = new Map(this.members().map((m) => [m.id, m]));
    let descCount = 0;
    const countDesc = (id: string) => {
      (childrenMap.get(id) ?? []).forEach((cid) => {
        descCount++;
        countDesc(cid);
      });
    };
    countDesc(member.id);

    // FIX 3b: tăng depth lên 6 để preview đủ sâu cho cây phức tạp
    const buildSub = (id: string, depth: number): TreeNode | null => {
      const m = memberMap.get(id);
      if (!m) return null;
      if (depth >= 6) return { id, data: m, children: [] };
      const kids = (childrenMap.get(id) ?? [])
        .map((cid) => buildSub(cid, depth + 1))
        .filter(Boolean) as TreeNode[];
      return { id, data: m, children: kids };
    };
    const subtree = buildSub(member.id, 0);
    if (!subtree) return;
    this.previewMember.set(member);
    this.previewDescCount.set(descCount);
    this.previewVisible.set(true);
    setTimeout(() => {
      const svgEl = document.getElementById(
        'preview-svg',
      ) as SVGSVGElement | null;
      if (svgEl) this.renderPreviewTree(subtree, svgEl);
    }, 60);
  }

  private renderPreviewTree(subtree: TreeNode, svgEl: SVGSVGElement) {
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.selectAll('*').remove();
    const W = svgEl.clientWidth || 780;
    const H = svgEl.clientHeight || 340;

    // FIX 3a: density factor — cây phức tạp nhiều node → thu nhỏ để vừa panel
    const countNodes = (n: TreeNode): number =>
      1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0);
    const total = countNodes(subtree);
    const density = Math.max(
      0.4,
      Math.min(1.0, Math.sqrt(30 / Math.max(total, 1))),
    );
    const NW = Math.round(120 * density);
    const NH = Math.round(54 * density);

    const g = svg.append('g');
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);
    const root = d3.hierarchy(subtree);
    d3
      .tree<TreeNode>()
      .nodeSize([NW + Math.round(16 * density), NH + Math.round(48 * density)])(
      root as any,
    );

    g.append('g')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', (d: any) => {
        const sx = d.source.x,
          sy = d.source.y + NH,
          tx = d.target.x,
          ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#2a3a4a')
      .attr('stroke-width', 1.2);

    const nodes = g
      .append('g')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x - NW / 2},${d.y})`);
    nodes
      .append('rect')
      .attr('width', NW)
      .attr('height', NH)
      .attr('rx', 7)
      .attr('fill', (d: any) => {
        if (d.depth === 0)
          return d.data.data.gender === 'MALE' ? '#1a3a6a' : '#3a1a5a';
        return d.data.data.gender === 'MALE' ? '#0e1a2d' : '#1a0e28';
      })
      .attr('stroke', (d: any) => (d.depth === 0 ? '#60a5fa' : '#2a3a50'))
      .attr('stroke-width', (d: any) => (d.depth === 0 ? 2 : 1.2));
    const fs1 = Math.max(8, Math.round(10 * density));
    const fs2 = Math.max(7, Math.round(9 * density));
    nodes
      .append('text')
      .attr('x', NW / 2)
      .attr('y', NH * 0.42)
      .attr('text-anchor', 'middle')
      .attr('font-size', `${fs1}px`)
      .attr('fill', '#e2e8f0')
      .attr('font-weight', '600')
      .text((d: any) => {
        const n = d.data.data.fullName;
        const max = Math.round(14 * density);
        return n.length > max ? n.slice(0, max - 2) + '…' : n;
      });
    nodes
      .append('text')
      .attr('x', NW / 2)
      .attr('y', NH * 0.67)
      .attr('text-anchor', 'middle')
      .attr('font-size', `${fs2}px`)
      .attr('fill', '#64748b')
      .text((d: any) => `Đời ${d.data.data.generation}`);
    nodes
      .append('text')
      .attr('x', NW / 2)
      .attr('y', NH * 0.9)
      .attr('text-anchor', 'middle')
      .attr('font-size', `${fs2}px`)
      .attr('fill', '#4ade8066')
      .text((d: any) => (d.data.data as any).chi?.name ?? '');

    // Auto-fit: center cả X và Y, KHÔNG cap scale=1 để cây phức tạp co lại vừa panel
    const bounds = (g.node() as SVGGElement).getBBox();
    if (bounds.width && bounds.height) {
      const k = Math.min((W - 40) / bounds.width, (H - 40) / bounds.height); // no cap
      const tx = W / 2 - (bounds.x + bounds.width / 2) * k;
      const ty = H / 2 - (bounds.y + bounds.height / 2) * k;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    }
  }

  private showTooltip(event: MouseEvent, d: d3.HierarchyPointNode<TreeNode>) {
    const m = d.data.data;
    const b = m.birthDate ? new Date(m.birthDate).getFullYear() : '?';
    const x = m.deathDate ? new Date(m.deathDate).getFullYear() : '';
    this.tooltipData.set({
      name: m.fullName + ((m as any).alias ? ` (${(m as any).alias})` : ''),
      meta:
        `Đời ${m.generation} · ${x ? `${b}–${x}` : b}` +
        ((m as any).burialPlace ? ` · ${(m as any).burialPlace}` : ''),
      chi: [(m as any).chi?.name, (m as any).phai?.name]
        .filter(Boolean)
        .join(' / '),
    });
    this.tooltipVisible.set(true);
    if (this.tooltipEl) {
      const el = this.tooltipEl.nativeElement;
      const host = (
        this.svgRef.nativeElement.parentElement as HTMLElement
      ).getBoundingClientRect();
      el.style.left = `${event.clientX - host.left + 14}px`;
      el.style.top = `${event.clientY - host.top - 10}px`;
    }
  }
}
