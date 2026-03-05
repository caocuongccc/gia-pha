import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  effect,
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
  // ✅ Thêm id="family-tree-svg" để ExportButtonsComponent tìm được
  template: `<svg #svgRef id="family-tree-svg" class="tree-svg"></svg>`,
  styles: [
    `
      .tree-svg {
        width: 100%;
        height: 100%;
        min-height: 600px;
      }
      :host {
        display: block;
        overflow: hidden;
        position: relative;
      }
    `,
  ],
})
export class TreeViewComponent {
  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;

  members = input.required<Member[]>();
  relations = input.required<Relationship[]>();
  // ✅ Đổi tên 'readonly' → 'viewOnly' tránh conflict HTML reserved attribute
  viewOnly = input<boolean>(false);
  memberClicked = output<Member>();

  constructor() {
    effect(() => {
      const m = this.members();
      const r = this.relations();
      // svgRef chưa có ngay trong constructor — dùng setTimeout để đợi AfterViewInit
      if (m.length) {
        setTimeout(() => {
          if (this.svgRef) this.renderTree(m, r);
        }, 0);
      }
    });
  }

  private buildHierarchy(
    members: Member[],
    relations: Relationship[],
  ): TreeNode {
    const parentRelations = relations.filter(
      (r) => r.type === ('PARENT' as any),
    );
    const childrenMap = new Map<string, string[]>();
    parentRelations.forEach((r) => {
      if (!childrenMap.has(r.fromMemberId)) childrenMap.set(r.fromMemberId, []);
      childrenMap.get(r.fromMemberId)!.push(r.toMemberId);
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const childIds = new Set(parentRelations.map((r) => r.toMemberId));
    const roots = members.filter((m) => !childIds.has(m.id));

    // Fallback: nếu không có root thì dùng member đầu tiên
    const rootMember =
      roots.sort((a, b) => a.generation - b.generation)[0] ?? members[0];

    const buildNode = (id: string, depth = 0): TreeNode => {
      const member = memberMap.get(id)!;
      const childIds2 = childrenMap.get(id) ?? [];
      return {
        id,
        data: member,
        children:
          depth < 10 ? childIds2.map((cid) => buildNode(cid, depth + 1)) : [],
      };
    };

    return buildNode(rootMember.id);
  }

  private renderTree(members: Member[], relations: Relationship[]) {
    const svgEl = this.svgRef.nativeElement;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const W = svgEl.clientWidth || 900;
    const NODE_W = 140;
    const NODE_H = 70;

    // Zoom + pan — chỉ enable nếu không phải readonly
    const g = svg.append('g').attr('class', 'tree-root');

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));

    if (!this.viewOnly()) {
      svg.call(zoomBehavior);
    }

    const hierarchy = this.buildHierarchy(members, relations);
    const root = d3.hierarchy(hierarchy);
    const treeLayout = d3.tree<TreeNode>().nodeSize([NODE_W + 20, NODE_H + 60]);
    treeLayout(root);

    // ── Links (đường nối) ── ✅ Đã uncomment + fix type params
    // ✅ Dùng path thủ công — tránh lỗi HierarchyLink.x = number|undefined
    g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', (d: any) => {
        const sx = d.source.x as number;
        const sy = d.source.y as number;
        const tx = d.target.x as number;
        const ty = d.target.y as number;
        const my = (sy + ty) / 2;
        return `M${sx},${sy}C${sx},${my} ${tx},${my} ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#444')
      .attr('stroke-width', 1.5);

    // ── Nodes ──
    const nodes = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g')
      .data(root.descendants() as d3.HierarchyPointNode<TreeNode>[])
      .join('g')
      .attr('transform', (d) => `translate(${d.x - NODE_W / 2},${d.y})`)
      .style('cursor', this.viewOnly() ? 'default' : 'pointer')
      .on('click', (_, d) => {
        if (!this.viewOnly()) this.memberClicked.emit(d.data.data);
      });

    // Background card
    nodes
      .append('rect')
      .attr('width', NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 8)
      .attr('fill', (d) =>
        d.data.data.gender === 'MALE' ? '#162032' : '#1e1228',
      )
      .attr('stroke', (d) => (d.data.data.deathDate ? '#555' : '#3a4a5c'))
      .attr('stroke-width', 1);

    // Clip circle cho ảnh
    nodes
      .append('clipPath')
      .attr('id', (d) => `clip-${d.data.id}`)
      .append('circle')
      .attr('cx', 26)
      .attr('cy', NODE_H / 2)
      .attr('r', 22);

    nodes
      .append('image')
      .attr(
        'href',
        (d) =>
          d.data.data.photoUrl ??
          `/assets/avatar-${d.data.data.gender.toLowerCase()}.svg`,
      )
      .attr('x', 4)
      .attr('y', NODE_H / 2 - 22)
      .attr('width', 44)
      .attr('height', 44)
      .attr('clip-path', (d) => `url(#clip-${d.data.id})`);

    // Tên
    nodes
      .append('text')
      .attr('x', 56)
      .attr('y', 28)
      .attr('font-size', '11px')
      .attr('fill', '#e6edf3')
      .attr('font-weight', '600')
      .text((d) => {
        const name = d.data.data.fullName;
        return name.length > 16 ? name.slice(0, 14) + '…' : name;
      });

    // Năm sinh – năm mất
    nodes
      .append('text')
      .attr('x', 56)
      .attr('y', 44)
      .attr('font-size', '10px')
      .attr('fill', '#7d8590')
      .text((d) => {
        const m = d.data.data;
        const born = m.birthDate ? new Date(m.birthDate).getFullYear() : '?';
        const died = m.deathDate ? new Date(m.deathDate).getFullYear() : '';
        return died ? `${born} – ${died}` : `${born}`;
      });

    // Đời thứ badge
    nodes
      .append('text')
      .attr('x', NODE_W - 8)
      .attr('y', 14)
      .attr('font-size', '9px')
      .attr('fill', '#d29922')
      .attr('text-anchor', 'end')
      .text((d) => `Đời ${d.data.data.generation}`);

    // ✅ Căn giữa cây — fix cách tính transform
    const bounds = (g.node() as SVGGElement).getBBox();
    const tx = W / 2 - bounds.x - bounds.width / 2;
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, 40));
  }
}
