// apps/frontend/src/app/shared/directives/role.directive.ts

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { FamilyService, FamilyRole } from '../../core/services/family.service';

/**
 * Dùng: *appRole="['OWNER', 'EDITOR']"
 * → Chỉ render nếu user có role trong danh sách
 */
@Directive({
  selector: '[appRole]',
  standalone: true,
})
export class RoleDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private familyService = inject(FamilyService);

  private allowedRoles: FamilyRole[] = [];

  @Input() set appRole(roles: FamilyRole[]) {
    this.allowedRoles = roles;
    this.updateView();
  }

  constructor() {
    // ✅ effect() tự chạy lại khi currentUserRole signal thay đổi
    effect(() => {
      // Đọc signal để track — effect sẽ re-run khi role đổi
      this.familyService.currentUserRole();
      this.updateView();
    });
  }

  private updateView() {
    // ✅ Dùng currentUserRole() — đã có trong FamilyService
    const currentRole = this.familyService.currentUserRole();

    const hasAccess =
      currentRole !== null && this.allowedRoles.includes(currentRole);

    if (hasAccess) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }
}
