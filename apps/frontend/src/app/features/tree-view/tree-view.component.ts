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

@Component({
  selector: 'app-tree-view',
  standalone: true,
  template: `
    <svg #svgRef id="family-tree-svg" class="tree-svg"></svg>

    <!-- Tooltip khi hover -->
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
        display: block;
        overflow: hidden;
        position: relative;
        height: 100%;
      }
      .tree-svg {
        width: 100%;
        height: 100%;
        min-height: 600px;
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
  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('tooltip') tooltipEl!: ElementRef<HTMLDivElement>;

  members = input.required<Member[]>();
  relations = input.required<Relationship[]>();
  viewOnly = input<boolean>(false);
  memberClicked = output<Member>();

  // ── Internal state ─────────────────────────────────────────
  private selectedId = signal<string | null>(null);
  private highlightIds = signal<Set<string>>(new Set());

  tooltipVisible = signal(false);
  tooltipData = signal({ name: '', meta: '', chi: '' });

  // D3 selections — reuse khi chỉ update highlight
  private nodeSelection!: d3.Selection<
    SVGGElement,
    d3.HierarchyPointNode<TreeNode>,
    SVGGElement,
    unknown
  >;
  private linkSelection!: d3.Selection<
    SVGPathElement,
    d3.HierarchyLink<TreeNode>,
    SVGGElement,
    unknown
  >;
  private rootHierarchy!: d3.HierarchyPointNode<TreeNode>;

  constructor() {
    effect(() => {
      const m = this.members();
      const r = this.relations();
      if (m.length) {
        setTimeout(() => {
          if (this.svgRef) this.renderTree(m, r);
        }, 0);
      }
    });
  }

  // ── Build cây từ relationships ──────────────────────────────
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

    // Dùng visited set thay depth limit — tránh vòng lặp, không giới hạn số đời
    const visited = new Set<string>();
    const buildNode = (id: string): TreeNode => {
      const member = memberMap.get(id)!;
      visited.add(id);
      const kids = (childrenMap.get(id) ?? []).filter(
        (cid) => !visited.has(cid),
      );
      return {
        id,
        data: member,
        children: kids.map((cid) => buildNode(cid)),
      };
    };
    return buildNode(rootMember.id);
  }

  // ── Tìm đường từ node đến root ──────────────────────────────
  private getAncestorIds(node: d3.HierarchyPointNode<TreeNode>): Set<string> {
    const ids = new Set<string>();
    let cur: d3.HierarchyNode<TreeNode> | null = node;
    while (cur) {
      ids.add(cur.data.id);
      cur = cur.parent;
    }
    return ids;
  }

  // ── Render ──────────────────────────────────────────────────
  private renderTree(members: Member[], relations: Relationship[]) {
    const svgEl = this.svgRef.nativeElement;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const W = svgEl.clientWidth || 900;
    const H = svgEl.clientHeight || 600;
    const NODE_W = 148;
    const NODE_H = 72;

    const g = svg.append('g').attr('class', 'tree-root');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));

    svg.call(zoom);

    // ── Hierarchy ──────────────────────────────────────────────
    const hierarchy = this.buildHierarchy(members, relations);
    const root = d3.hierarchy(hierarchy);

    // Mặc định collapse các node sau đời thứ 8 — tránh render quá nặng
    // Người dùng bấm vào node để expand
    const INITIAL_DEPTH = 8;
    root.each((d: any) => {
      if (d.depth >= INITIAL_DEPTH && d.children) {
        d._children = d.children; // lưu lại
        d.children = undefined; // ẩn đi
      }
    });

    const treeLayout = d3.tree<TreeNode>().nodeSize([NODE_W + 24, NODE_H + 70]);
    treeLayout(root);
    this.rootHierarchy = root as d3.HierarchyPointNode<TreeNode>;

    // ── Links ──────────────────────────────────────────────────
    this.linkSelection = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, d3.HierarchyLink<TreeNode>>('path')
      .data(root.links())
      .join('path')
      .attr(
        'class',
        (d) =>
          `link link-${(d.source as any).data.id}-${(d.target as any).data.id}`,
      )
      .attr('d', (d: any) => {
        const sx = d.source.x,
          sy = d.source.y + NODE_H;
        const tx = d.target.x,
          ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#2a3a4a')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', 'none');

    // ── Nodes ──────────────────────────────────────────────────
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
      .on('click', (event, d) => {
        event.stopPropagation();
        this.onNodeClick(d);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        this.onNodeDblClick(d);
      })
      .on('mouseover', (event, d) => this.showTooltip(event, d))
      .on('mouseout', () => this.tooltipVisible.set(false));

    // Background card
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

    // Avatar clip
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

    // Tên
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

    // Năm sinh-mất
    this.nodeSelection
      .append('text')
      .attr('x', 58)
      .attr('y', 42)
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .text((d) => {
        const m = d.data.data;
        const born = m.birthDate ? new Date(m.birthDate).getFullYear() : '?';
        const died = m.deathDate ? new Date(m.deathDate).getFullYear() : '';
        return died ? `${born}–${died}` : `${born}`;
      });

    // Chi/Phái badge nhỏ
    this.nodeSelection
      .append('text')
      .attr('x', 58)
      .attr('y', 57)
      .attr('font-size', '9px')
      .attr('fill', '#4ade8088')
      .text((d) => (d.data.data as any).chi?.name ?? '');

    // Đời badge
    this.nodeSelection
      .append('text')
      .attr('x', NODE_W - 6)
      .attr('y', 13)
      .attr('font-size', '9px')
      .attr('fill', '#d2992280')
      .attr('text-anchor', 'end')
      .text((d) => `Đời ${d.data.data.generation}`);

    // Nút expand — hiện dưới node khi có con bị ẩn (double-click để mở)
    const expandBtn = this.nodeSelection.filter((d: any) => !!d._children);

    expandBtn
      .append('rect')
      .attr('x', NODE_W / 2 - 28)
      .attr('y', NODE_H + 6)
      .attr('width', 56)
      .attr('height', 18)
      .attr('rx', 9)
      .attr('fill', '#1e3a6e')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    expandBtn
      .append('text')
      .attr('x', NODE_W / 2)
      .attr('y', NODE_H + 19)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#60a5fa')
      .style('cursor', 'pointer')
      .text((d: any) => `▼ ${d._children?.length} con`);

    // ── Dismiss khi click nền ──────────────────────────────────
    svg.on('click', () => this.clearHighlight());

    // ── Center ─────────────────────────────────────────────────
    const bounds = (g.node() as SVGGElement).getBBox();
    const tx = W / 2 - bounds.x - bounds.width / 2;
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, 40));
  }

  // ── Click: LUÔN highlight + emit, dù node có con hay không ──
  private onNodeClick(d: d3.HierarchyPointNode<TreeNode>) {
    const member = d.data.data;
    const ancestorIds = this.getAncestorIds(d);
    this.selectedId.set(member.id);
    this.highlightIds.set(ancestorIds);
    this.applyHighlight(d, ancestorIds);
    this.memberClicked.emit(member);
  }

  // ── Double-click: expand / collapse con ───────────────────
  private onNodeDblClick(d: d3.HierarchyPointNode<TreeNode>) {
    const dAny = d as any;
    if (dAny._children) {
      d.children = dAny._children;
      dAny._children = undefined;
    } else if (d.children?.length) {
      dAny._children = d.children;
      d.children = undefined;
    } else {
      return; // không có con, không làm gì
    }
    this.rerenderKeepSelection();
  }

  private rerenderKeepSelection() {
    const prevId = this.selectedId();
    this.renderTree(this.members(), this.relations());
    // Khôi phục highlight sau khi re-render
    if (prevId) {
      const node = this.rootHierarchy
        ?.descendants()
        .find((d: any) => d.data.id === prevId) as
        | d3.HierarchyPointNode<TreeNode>
        | undefined;
      if (node) this.applyHighlight(node, this.getAncestorIds(node));
    }
  }

  private applyHighlight(
    selected: d3.HierarchyPointNode<TreeNode>,
    ancestorIds: Set<string>,
  ) {
    if (!this.nodeSelection || !this.linkSelection) return;

    // ── Nodes ──────────────────────────────────────────────────
    this.nodeSelection.each(function (d) {
      const id = d.data.id;
      const node = d3.select(this);

      const isSelected = id === selected.data.id;
      const isAncestor = !isSelected && ancestorIds.has(id);
      const isDimmed = !ancestorIds.has(id);

      // Card background
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

      // Opacity
      node
        .transition()
        .duration(250)
        .attr('opacity', isDimmed ? 0.35 : 1);
    });

    // ── Links ──────────────────────────────────────────────────
    this.linkSelection.each(function (d) {
      const srcId = (d.source as any).data.id;
      const tgtId = (d.target as any).data.id;

      // Link "sáng" = cả 2 đầu đều nằm trong ancestor path
      const isHighlighted = ancestorIds.has(srcId) && ancestorIds.has(tgtId);

      d3.select(this)
        .transition()
        .duration(250)
        .attr('stroke', isHighlighted ? '#3b82f6' : '#2a3a4a')
        .attr('stroke-width', isHighlighted ? 2.5 : 1.5)
        .attr('opacity', isHighlighted ? 1 : 0.2);
    });

    // ── Thêm icon "bạn đang ở đây" trên selected node ─────────
    const svgG = d3.select(this.svgRef.nativeElement).select('g.tree-root');
    svgG.selectAll('.selected-marker').remove();

    const NODE_W = 148;
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

  // ── Tooltip ────────────────────────────────────────────────
  private showTooltip(event: MouseEvent, d: d3.HierarchyPointNode<TreeNode>) {
    const m = d.data.data;
    const born = m.birthDate ? new Date(m.birthDate).getFullYear() : '?';
    const died = m.deathDate ? new Date(m.deathDate).getFullYear() : '';
    const lifespan = died ? `${born}–${died}` : `${born}`;

    this.tooltipData.set({
      name: m.fullName + ((m as any).alias ? ` (${(m as any).alias})` : ''),
      meta:
        `Đời ${m.generation} · ${lifespan}` +
        ((m as any).burialPlace ? ` · ${(m as any).burialPlace}` : ''),
      chi: [(m as any).chi?.name, (m as any).phai?.name]
        .filter(Boolean)
        .join(' / '),
    });
    this.tooltipVisible.set(true);

    // Position tooltip gần chuột
    if (this.tooltipEl) {
      const el = this.tooltipEl.nativeElement;
      const host = (
        this.svgRef.nativeElement.parentElement as HTMLElement
      ).getBoundingClientRect();
      el.style.left = `${event.clientX - host.left + 12}px`;
      el.style.top = `${event.clientY - host.top - 10}px`;
    }
  }
}
