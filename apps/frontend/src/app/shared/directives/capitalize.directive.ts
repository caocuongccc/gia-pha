// apps/frontend/src/app/shared/directives/capitalize.directive.ts
// Dùng: <input appCapitalize />  → tự viết hoa chữ cái đầu mỗi từ
//       <input appCapitalize="first" /> → chỉ viết hoa chữ đầu tiên
import { Directive, HostListener, Input, ElementRef } from '@angular/core';

@Directive({
  selector: '[appCapitalize]',
  standalone: true,
})
export class CapitalizeDirective {
  // 'words' (mặc định): viết hoa đầu mỗi từ — dùng cho tên người, tên chi, phái
  // 'first': chỉ viết hoa chữ cái đầu tiên — dùng cho mô tả, địa danh
  @Input('appCapitalize') mode: 'words' | 'first' | '' = 'words';

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = this.el.nativeElement;
    const pos = input.selectionStart ?? 0;
    const raw = input.value;
    const transformed = this.transform(raw);

    if (transformed !== raw) {
      input.value = transformed;
      // Dispatch input event để Angular form nhận giá trị mới
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Giữ nguyên vị trí cursor
      input.setSelectionRange(pos, pos);
    }
  }

  @HostListener('blur')
  onBlur() {
    // Khi blur: normalize lại lần cuối (xử lý paste)
    const input = this.el.nativeElement;
    const transformed = this.transform(input.value);
    if (transformed !== input.value) {
      input.value = transformed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  private transform(value: string): string {
    if (!value) return value;
    const effectiveMode = this.mode === '' ? 'words' : this.mode;

    if (effectiveMode === 'first') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    // 'words': viết hoa đầu mỗi từ (tôn trọng tiếng Việt — không lowercase toàn bộ)
    return value.replace(
      /(^|\s)(\S)/g,
      (_, space, char) => space + char.toUpperCase(),
    );
  }
}
