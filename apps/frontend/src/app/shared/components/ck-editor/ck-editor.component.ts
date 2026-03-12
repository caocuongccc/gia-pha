// apps/frontend/src/app/shared/components/ck-editor/ck-editor.component.ts
// Dùng đúng theo docs: https://ckeditor.com/docs/ckeditor5/latest/getting-started/installation/cloud/angular.html
// npm install @ckeditor/ckeditor5-angular
// npm install --save-dev ckeditor5

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  forwardRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  CKEditorModule,
  loadCKEditorCloud,
  type CKEditorCloudResult,
} from '@ckeditor/ckeditor5-angular';
import type { ClassicEditor, EditorConfig } from 'ckeditor5';
import { environment } from 'apps/frontend/src/environments/environment.prod';

@Component({
  selector: 'app-ck-editor',
  standalone: true,
  imports: [CommonModule, CKEditorModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CkEditorComponent),
      multi: true,
    },
  ],
  template: `
    @if (Editor && config) {
      <ckeditor
        [editor]="Editor"
        [config]="config"
        [data]="value"
        [disabled]="disabled"
        (change)="onEditorChange($event)"
        (ready)="onReady($event)"
        (blur)="onTouched()"
      />
    } @else {
      <div class="ck-placeholder">
        <span class="ck-spinner"></span>
        Đang tải editor...
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .ck-placeholder {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        background: #060d1a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        color: #475569;
        font-size: 13px;
      }
      .ck-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid #1e293b;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Dark theme overrides — dùng :host để scoped */
      :host ::ng-deep .ck.ck-editor__main > .ck-editor__editable {
        background: #060d1a !important;
        color: #e2e8f0 !important;
        border-color: #1e293b !important;
        min-height: 200px;
        font-size: 14px;
        line-height: 1.78;
      }
      :host ::ng-deep .ck.ck-toolbar {
        background: #0c1120 !important;
        border-color: #1e293b !important;
      }
      :host ::ng-deep .ck.ck-toolbar__separator {
        background: #1e293b !important;
      }
      :host ::ng-deep .ck.ck-button {
        color: #94a3b8 !important;
      }
      :host ::ng-deep .ck.ck-button.ck-on {
        background: #1e3a6e !important;
        color: #60a5fa !important;
      }
      :host ::ng-deep .ck.ck-button:hover:not(.ck-disabled) {
        background: #1e293b !important;
        color: #e2e8f0 !important;
      }
      :host ::ng-deep .ck.ck-editor {
        border-radius: 8px !important;
        overflow: hidden;
      }
      :host ::ng-deep .ck.ck-dropdown__panel {
        background: #0c1120 !important;
        border-color: #1e293b !important;
      }
      :host ::ng-deep .ck.ck-list__item .ck-button:hover {
        background: #1e293b !important;
      }
      :host ::ng-deep .ck-focused {
        border-color: #3b82f6 !important;
        box-shadow: none !important;
      }
      :host ::ng-deep .ck.ck-editor__main > .ck-editor__editable.ck-focused {
        border-color: #3b82f6 !important;
        box-shadow: none !important;
      }
    `,
  ],
})
export class CkEditorComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  private cdr = inject(ChangeDetectorRef);

  @Input() placeholder = 'Nhập nội dung...';
  @Input() licenseKey = environment.ckEditorLicenseKey; // Lấy miễn phí tại https://portal.ckeditor.com/checkout?plan=free
  @Input() disabled = false;

  @Output() editorReady = new EventEmitter<ClassicEditor>();

  Editor: typeof ClassicEditor | null = null;
  config: EditorConfig | null = null;

  // ControlValueAccessor
  value = '';
  onChange = (_: string) => {};
  onTouched = () => {};

  async ngOnInit() {
    const cloud = await loadCKEditorCloud({ version: '47.6.1' });
    this._setup(cloud);
  }

  ngOnDestroy() {}

  private _setup(cloud: CKEditorCloudResult<{ version: '47.6.1' }>) {
    const {
      ClassicEditor,
      Essentials,
      Paragraph,
      Heading,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      //   BulletedList,
      //   NumberedList,
      BlockQuote,
      Link,
      Table,
      TableToolbar,
      Alignment,
      Undo,
      FontSize,
      FontColor,
    } = cloud.CKEditor;

    this.Editor = ClassicEditor;
    this.config = {
      licenseKey: this.licenseKey,
      plugins: [
        Essentials,
        Paragraph,
        Heading,
        Bold,
        Italic,
        Underline,
        Strikethrough,
        //   BulletedList,
        //   NumberedList,
        BlockQuote,
        Link,
        Table,
        TableToolbar,
        Alignment,
        Undo,
        FontSize,
        FontColor,
      ],
      toolbar: {
        items: [
          'heading',
          '|',
          'bold',
          'italic',
          'underline',
          'strikethrough',
          '|',
          'fontSize',
          'fontColor',
          '|',
          //   'bulletedList',
          //   'numberedList',
          'blockQuote',
          '|',
          'alignment',
          '|',
          'link',
          'insertTable',
          '|',
          'undo',
          'redo',
        ],
        shouldNotGroupWhenFull: false,
      },
      placeholder: this.placeholder,
      table: {
        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
      },
    };

    this.cdr.markForCheck();
  }

  onEditorChange({ editor }: { editor: ClassicEditor }) {
    const data = editor.getData();
    this.value = data;
    this.onChange(data);
  }

  onReady(editor: ClassicEditor) {
    this.editorReady.emit(editor);
  }

  // ── ControlValueAccessor ─────────────────────────────────────
  writeValue(val: string) {
    this.value = val ?? '';
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (_: string) => void) {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean) {
    this.disabled = disabled;
    this.cdr.markForCheck();
  }
}
