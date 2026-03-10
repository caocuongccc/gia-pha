// apps/frontend/src/app/features/fund/fund.page.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

type Tab = 'scholarship' | 'fund';
type FundType = 'DIEU_DONG' | 'CUNG_TIEN' | 'CHI';

interface MemberRef {
  id: string;
  fullName: string;
  generation?: number;
}
interface ScholarRecord {
  id: string;
  studentName: string;
  year: number;
  school?: string;
  grade?: string;
  achievement: string;
  rewardAmount?: number;
  awardedBy?: string;
  notes?: string;
  member?: MemberRef;
}
interface FundRecord {
  id: string;
  type: FundType;
  year: number;
  eventName?: string;
  contributorName?: string;
  amount: number;
  description?: string;
  recordedBy?: string;
  member?: MemberRef;
}
interface FundSummary {
  totalIn: number;
  totalOut: number;
  balance: number;
}

const ACHIEVEMENT_PRESETS = [
  'Học sinh Giỏi',
  'Học sinh Xuất sắc',
  'Học sinh Tiên tiến',
  'Giải Nhất',
  'Giải Nhì',
  'Giải Ba',
  'Giải Khuyến khích',
  'Đỗ Đại học',
  'Tốt nghiệp Đại học',
  'Thạc sĩ',
  'Tiến sĩ',
  'Học bổng',
];

@Component({
  selector: 'app-fund',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fl">
      <header class="fh">
        <button class="btn-back" (click)="goBack()">← Gia phả</button>
        <div class="fh-center">
          <h1>📚 Khuyến học & Quỹ họ</h1>
          <span class="fh-sub">{{ familyName() }}</span>
        </div>
        @if (isOwner()) {
          <span class="owner-badge">⚙ OWNER</span>
        }
        @if (viewOnly()) {
          <span class="viewer-badge">👁 Chỉ xem</span>
        }
      </header>

      <nav class="ftabs">
        <button
          [class.active]="tab() === 'scholarship'"
          (click)="tab.set('scholarship')"
        >
          🎓 Khuyến học
          @if (scholarRecords().length > 0) {
            <span class="tab-cnt">{{ scholarRecords().length }}</span>
          }
        </button>
        <button [class.active]="tab() === 'fund'" (click)="tab.set('fund')">
          💰 Quỹ họ
          @if (summary()) {
            <span
              class="tab-balance"
              [class.pos]="summary()!.balance >= 0"
              [class.neg]="summary()!.balance < 0"
            >
              {{ fmtMoney(summary()!.balance) }}
            </span>
          }
        </button>
      </nav>

      <div class="fb">
        <!-- ═══ KHUYẾN HỌC ═══ -->
        @if (tab() === 'scholarship') {
          <div class="f-section">
            <div class="f-toolbar">
              <div class="f-filters">
                <select
                  class="f-select"
                  [(ngModel)]="filterYear"
                  (ngModelChange)="loadScholarship()"
                >
                  <option value="">Tất cả năm</option>
                  @for (y of years(); track y) {
                    <option [value]="y">{{ y }}</option>
                  }
                </select>
              </div>
              @if (isOwner()) {
                <button class="btn-add" (click)="openScholarForm()">
                  + Thêm thành tích
                </button>
              }
            </div>

            @if (scholarStats()) {
              <div class="stat-row">
                <div class="stat-card">
                  <div class="stat-n">{{ scholarStats()!.total }}</div>
                  <div class="stat-l">Tổng học sinh</div>
                </div>
                <div class="stat-card gold">
                  <div class="stat-n">{{ scholarStats()!.excellent }}</div>
                  <div class="stat-l">Xuất sắc / Giỏi</div>
                </div>
                <div class="stat-card green">
                  <div class="stat-n">
                    {{ fmtMoney(scholarStats()!.totalReward) }}
                  </div>
                  <div class="stat-l">Tổng thưởng</div>
                </div>
              </div>
            }

            @if (showScholarForm() && isOwner()) {
              <div class="f-form-card">
                <h3>
                  {{
                    editScholarId() ? 'Sửa thành tích' : 'Thêm thành tích mới'
                  }}
                </h3>
                <div class="f-form-grid">
                  <!-- Tên + @ mention -->
                  <div class="f-field">
                    <label>Tên học sinh *</label>
                    <div class="mention-wrap">
                      <input
                        [(ngModel)]="sForm.studentName"
                        (input)="onMentionInput($event, 'scholar')"
                        (keydown)="onMentionKey($event)"
                        placeholder="Tên hoặc @ để tag thành viên..."
                      />
                      @if (
                        mentionDropdown().length > 0 &&
                        activeMentionField === 'scholar'
                      ) {
                        <div class="mention-dropdown">
                          @for (
                            m of mentionDropdown();
                            track m.id;
                            let i = $index
                          ) {
                            <div
                              class="mention-item"
                              [class.active]="i === mentionIdx"
                              (mousedown)="selectMention(m, 'scholar')"
                            >
                              <span class="m-name">{{ m.fullName }}</span
                              ><span class="m-gen">Đời {{ m.generation }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                    @if (sForm.memberId) {
                      <div class="tag-linked">
                        🔗 {{ linkedMemberName('scholar') }}
                        <button (click)="clearLink('scholar')">✕</button>
                      </div>
                    }
                  </div>

                  <div class="f-field">
                    <label>Năm học *</label>
                    <input type="number" [(ngModel)]="sForm.year" />
                  </div>

                  <!-- Multi achievement -->
                  <div class="f-field f-field-full">
                    <label>Thành tích * (có thể chọn nhiều)</label>
                    <div class="achievement-wrap">
                      <div class="preset-list">
                        @for (p of ACHIEVEMENTS; track p) {
                          <button
                            class="preset-btn"
                            [class.selected]="isAchSelected(p)"
                            (click)="toggleAch(p)"
                          >
                            @if (isAchSelected(p)) {
                              ✓
                            }
                            {{ p }}
                          </button>
                        }
                      </div>
                      <div class="custom-ach-row">
                        <input
                          [(ngModel)]="customAchievement"
                          placeholder="Nhập thành tích khác..."
                          (keydown.enter)="addCustomAch()"
                        />
                        <button class="btn-add-ach" (click)="addCustomAch()">
                          + Thêm
                        </button>
                      </div>
                      @if (selectedAchievements().length > 0) {
                        <div class="selected-achievements">
                          @for (a of selectedAchievements(); track a) {
                            <span class="ach-tag"
                              >{{ a }}
                              <button (click)="removeAch(a)">✕</button></span
                            >
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <div class="f-field">
                    <label>Trường</label
                    ><input
                      [(ngModel)]="sForm.school"
                      placeholder="THPT Lê Lợi..."
                    />
                  </div>
                  <div class="f-field">
                    <label>Lớp / Cấp</label
                    ><input [(ngModel)]="sForm.grade" placeholder="12A1..." />
                  </div>
                  <div class="f-field">
                    <label>Tiền thưởng (VNĐ)</label
                    ><input
                      type="number"
                      [(ngModel)]="sForm.rewardAmount"
                      placeholder="500000"
                    />
                  </div>
                  <div class="f-field">
                    <label>Người trao thưởng</label
                    ><input [(ngModel)]="sForm.awardedBy" />
                  </div>
                  <div class="f-field f-field-full">
                    <label>Ghi chú</label
                    ><textarea [(ngModel)]="sForm.notes" rows="2"></textarea>
                  </div>
                </div>
                <div class="f-form-actions">
                  <button class="btn-cancel" (click)="cancelScholarForm()">
                    Huỷ
                  </button>
                  <button class="btn-save" (click)="saveScholar()">
                    {{ editScholarId() ? 'Lưu' : 'Thêm' }}
                  </button>
                </div>
              </div>
            }

            @if (loading()) {
              <div class="f-empty">Đang tải...</div>
            } @else if (scholarRecords().length === 0) {
              <div class="f-empty">
                <span>🎓</span>
                <p>Chưa có thành tích nào.</p>
                @if (isOwner()) {
                  <button class="btn-add" (click)="openScholarForm()">
                    + Thêm đầu tiên
                  </button>
                }
              </div>
            } @else {
              @for (yg of scholarByYear(); track yg.year) {
                <div class="year-group">
                  <div class="year-header">
                    <span class="year-tag">{{ yg.year }}</span>
                    <span class="year-cnt"
                      >{{ yg.records.length }} học sinh</span
                    >
                    @if (yg.totalReward > 0) {
                      <span class="year-reward"
                        >Thưởng: {{ fmtMoney(yg.totalReward) }}</span
                      >
                    }
                  </div>
                  <div class="scholar-grid">
                    @for (r of yg.records; track r.id) {
                      <div
                        class="scholar-card"
                        [class.has-reward]="r.rewardAmount"
                      >
                        <div class="sc-achievements">
                          @for (a of splitAch(r.achievement); track a) {
                            <span class="sc-ach-tag">{{ a }}</span>
                          }
                        </div>
                        <div class="sc-name">{{ r.studentName }}</div>
                        @if (r.member) {
                          <div class="sc-link">
                            🔗 {{ r.member.fullName }} · Đời
                            {{ r.member.generation }}
                          </div>
                        }
                        @if (r.school || r.grade) {
                          <div class="sc-school">
                            @if (r.grade) {
                              <span>{{ r.grade }}</span>
                            }
                            @if (r.school) {
                              <span>{{ r.school }}</span>
                            }
                          </div>
                        }
                        @if (r.rewardAmount) {
                          <div class="sc-reward">
                            🏆 {{ fmtMoney(r.rewardAmount) }}
                          </div>
                        }
                        @if (r.awardedBy) {
                          <div class="sc-awarded">Trao: {{ r.awardedBy }}</div>
                        }
                        @if (r.notes) {
                          <div class="sc-notes">{{ r.notes }}</div>
                        }
                        @if (isOwner()) {
                          <div class="sc-actions">
                            <button (click)="editScholar(r)">✏️</button>
                            <button (click)="deleteScholar(r.id)">🗑</button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }

        <!-- ═══ QUỸ HỌ ═══ -->
        @if (tab() === 'fund') {
          <div class="f-section">
            @if (summary()) {
              <div class="stat-row">
                <div class="stat-card green">
                  <div class="stat-n">{{ fmtMoney(summary()!.totalIn) }}</div>
                  <div class="stat-l">Tổng thu</div>
                </div>
                <div class="stat-card red">
                  <div class="stat-n">{{ fmtMoney(summary()!.totalOut) }}</div>
                  <div class="stat-l">Tổng chi</div>
                </div>
                <div
                  class="stat-card"
                  [class.gold]="summary()!.balance > 0"
                  [class.red]="summary()!.balance < 0"
                >
                  <div class="stat-n">{{ fmtMoney(summary()!.balance) }}</div>
                  <div class="stat-l">Số dư quỹ</div>
                </div>
              </div>
            }

            <div class="f-toolbar">
              <div class="f-filters">
                <select
                  class="f-select"
                  [(ngModel)]="filterYear"
                  (ngModelChange)="loadFund()"
                >
                  <option value="">Tất cả năm</option>
                  @for (y of years(); track y) {
                    <option [value]="y">{{ y }}</option>
                  }
                </select>
                <select
                  class="f-select"
                  [(ngModel)]="filterFundType"
                  (ngModelChange)="loadFund()"
                >
                  <option value="">Tất cả loại</option>
                  <option value="DIEU_DONG">Điếu đóng</option>
                  <option value="CUNG_TIEN">Cúng tiến</option>
                  <option value="CHI">Chi ra</option>
                </select>
              </div>
              @if (isOwner()) {
                <button class="btn-add" (click)="openFundForm()">
                  + Ghi thu/chi
                </button>
              }
            </div>

            @if (showFundForm() && isOwner()) {
              <div class="f-form-card">
                <h3>
                  {{ editFundId() ? 'Sửa bản ghi' : 'Ghi thu / chi mới' }}
                </h3>
                <div class="f-form-grid">
                  <div class="f-field">
                    <label>Loại *</label>
                    <select [(ngModel)]="fForm.type">
                      <option value="DIEU_DONG">💼 Điếu đóng theo đinh</option>
                      <option value="CUNG_TIEN">🙏 Cúng tiến tự nguyện</option>
                      <option value="CHI">💸 Chi ra</option>
                    </select>
                  </div>
                  <div class="f-field">
                    <label>Năm *</label
                    ><input type="number" [(ngModel)]="fForm.year" />
                  </div>
                  <div class="f-field">
                    <label>Số tiền (VNĐ) *</label
                    ><input
                      type="number"
                      [(ngModel)]="fForm.amount"
                      placeholder="1000000"
                    />
                  </div>

                  <!-- Tên người đóng + @ mention -->
                  <div class="f-field">
                    <label>Tên người đóng / mục đích</label>
                    <div class="mention-wrap">
                      <input
                        [(ngModel)]="fForm.contributorName"
                        (input)="onMentionInput($event, 'fund')"
                        (keydown)="onMentionKey($event)"
                        placeholder="Tên hoặc @ để tag thành viên..."
                      />
                      @if (
                        mentionDropdown().length > 0 &&
                        activeMentionField === 'fund'
                      ) {
                        <div class="mention-dropdown">
                          @for (
                            m of mentionDropdown();
                            track m.id;
                            let i = $index
                          ) {
                            <div
                              class="mention-item"
                              [class.active]="i === mentionIdx"
                              (mousedown)="selectMention(m, 'fund')"
                            >
                              <span class="m-name">{{ m.fullName }}</span
                              ><span class="m-gen">Đời {{ m.generation }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                    @if (fForm.memberId) {
                      <div class="tag-linked">
                        🔗 {{ linkedMemberName('fund') }}
                        <button (click)="clearLink('fund')">✕</button>
                      </div>
                    }
                  </div>

                  <div class="f-field">
                    <label>Tên sự kiện / kỳ cúng</label
                    ><input
                      [(ngModel)]="fForm.eventName"
                      placeholder="Giỗ tổ năm Giáp Thìn..."
                    />
                  </div>
                  <div class="f-field">
                    <label>Người ghi nhận</label
                    ><input [(ngModel)]="fForm.recordedBy" />
                  </div>
                  <div class="f-field f-field-full">
                    <label>Ghi chú</label
                    ><textarea
                      [(ngModel)]="fForm.description"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
                <div class="f-form-actions">
                  <button class="btn-cancel" (click)="cancelFundForm()">
                    Huỷ
                  </button>
                  <button class="btn-save" (click)="saveFund()">
                    {{ editFundId() ? 'Lưu' : 'Ghi lại' }}
                  </button>
                </div>
              </div>
            }

            @if (loading()) {
              <div class="f-empty">Đang tải...</div>
            } @else if (fundRecords().length === 0) {
              <div class="f-empty">
                <span>💰</span>
                <p>Chưa có bản ghi nào.</p>
                @if (isOwner()) {
                  <button class="btn-add" (click)="openFundForm()">
                    + Ghi đầu tiên
                  </button>
                }
              </div>
            } @else {
              @for (yg of fundByYear(); track yg.year) {
                <div class="year-group">
                  <div class="year-header">
                    <span class="year-tag">{{ yg.year }}</span>
                    <span class="year-cnt green-txt"
                      >Thu: {{ fmtMoney(yg.totalIn) }}</span
                    >
                    <span class="year-cnt red-txt"
                      >Chi: {{ fmtMoney(yg.totalOut) }}</span
                    >
                    <span
                      class="year-cnt"
                      [class.gold-txt]="yg.balance >= 0"
                      [class.red-txt]="yg.balance < 0"
                      >Dư: {{ fmtMoney(yg.balance) }}</span
                    >
                  </div>
                  <table class="fund-table">
                    <thead>
                      <tr>
                        <th>Loại</th>
                        <th>Tên / Mô tả</th>
                        <th>Sự kiện</th>
                        <th class="ta-r">Số tiền</th>
                        @if (isOwner()) {
                          <th></th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of yg.records; track r.id) {
                        <tr>
                          <td>
                            <span class="type-badge type-{{ r.type }}">{{
                              typeLabel(r.type)
                            }}</span>
                          </td>
                          <td>
                            <span class="fund-name">{{
                              r.contributorName || r.description || '—'
                            }}</span>
                            @if (r.member) {
                              <span class="fund-linked"
                                >🔗 {{ r.member.fullName }}</span
                              >
                            }
                            @if (r.recordedBy) {
                              <span class="fund-sub"
                                >Ghi: {{ r.recordedBy }}</span
                              >
                            }
                          </td>
                          <td class="fund-event">{{ r.eventName || '—' }}</td>
                          <td
                            class="ta-r"
                            [class.amt-in]="r.type !== 'CHI'"
                            [class.amt-out]="r.type === 'CHI'"
                          >
                            {{ r.type === 'CHI' ? '-' : '+'
                            }}{{ fmtMoney(r.amount) }}
                          </td>
                          @if (isOwner()) {
                            <td class="td-actions">
                              <button (click)="editFund(r)">✏️</button>
                              <button (click)="deleteFund(r.id)">🗑</button>
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .fl {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #09090f;
        color: #e2e8f0;
        font-family: 'Segoe UI', sans-serif;
      }
      .fh {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        background: #0c1120;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .fh-center {
        flex: 1;
      }
      .fh-center h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .fh-sub {
        font-size: 11px;
        color: #475569;
      }
      .btn-back {
        padding: 5px 12px;
        font-size: 12px;
        background: #141828;
        border: 1px solid #1e293b;
        color: #94a3b8;
        border-radius: 5px;
        cursor: pointer;
      }
      .owner-badge {
        font-size: 10px;
        color: #f59e0b;
        background: #1a1200;
        border: 1px solid #78350f;
        padding: 3px 10px;
        border-radius: 10px;
      }
      .viewer-badge {
        font-size: 10px;
        color: #60a5fa;
        background: #0f1e38;
        border: 1px solid #1e3a6e;
        padding: 3px 10px;
        border-radius: 10px;
      }
      .ftabs {
        display: flex;
        gap: 4px;
        padding: 10px 20px 0;
        background: #0c1120;
        border-bottom: 1px solid #1e293b;
        flex-shrink: 0;
      }
      .ftabs button {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: #64748b;
        padding: 8px 20px;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ftabs button.active {
        color: #60a5fa;
        border-bottom-color: #3b82f6;
      }
      .tab-cnt {
        background: #1e3a6e;
        color: #60a5fa;
        border-radius: 10px;
        padding: 1px 7px;
        font-size: 10px;
      }
      .tab-balance {
        border-radius: 10px;
        padding: 1px 8px;
        font-size: 10px;
        font-weight: 600;
      }
      .tab-balance.pos {
        background: #0a1a0e;
        color: #22c55e;
      }
      .tab-balance.neg {
        background: #1a0a0a;
        color: #ef4444;
      }
      .fb {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      .f-section {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .stat-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .stat-card {
        flex: 1;
        min-width: 150px;
        background: #0c1828;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 14px 18px;
      }
      .stat-card.gold {
        border-color: #78350f33;
        background: #1a120066;
      }
      .stat-card.green {
        border-color: #16653433;
        background: #0a1a0e66;
      }
      .stat-card.red {
        border-color: #7f1d1d33;
        background: #1a0a0a66;
      }
      .stat-n {
        font-size: 22px;
        font-weight: 700;
      }
      .stat-card.gold .stat-n {
        color: #f59e0b;
      }
      .stat-card.green .stat-n {
        color: #22c55e;
      }
      .stat-card.red .stat-n {
        color: #ef4444;
      }
      .stat-l {
        font-size: 11px;
        color: #475569;
        margin-top: 4px;
      }
      .f-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .f-filters {
        display: flex;
        gap: 8px;
      }
      .f-select {
        background: #0c1828;
        border: 1px solid #1e293b;
        color: #94a3b8;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .btn-add {
        padding: 7px 16px;
        font-size: 12px;
        background: #1e3a6e;
        border: 1px solid #3b82f6;
        color: #60a5fa;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      }
      .f-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 12px;
        color: #475569;
      }
      .f-empty span {
        font-size: 40px;
      }
      .f-empty p {
        font-size: 14px;
        margin: 0;
      }
      .f-form-card {
        background: #0c1828;
        border: 1px solid #1e3a6e;
        border-radius: 12px;
        padding: 20px;
      }
      .f-form-card h3 {
        margin: 0 0 16px;
        font-size: 14px;
        color: #60a5fa;
      }
      .f-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
      }
      .f-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .f-field-full {
        grid-column: 1/-1;
      }
      .f-field label {
        font-size: 10px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .f-field input,
      .f-field select,
      .f-field textarea {
        background: #060d1a;
        border: 1px solid #1e293b;
        color: #e2e8f0;
        border-radius: 6px;
        padding: 7px 10px;
        font-size: 12px;
      }
      .f-field input:focus,
      .f-field select:focus,
      .f-field textarea:focus {
        outline: none;
        border-color: #3b82f6;
      }
      .f-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .btn-cancel {
        padding: 7px 16px;
        font-size: 12px;
        background: none;
        border: 1px solid #334155;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
      }
      .btn-save {
        padding: 7px 16px;
        font-size: 12px;
        background: #3b82f6;
        border: none;
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
      }
      /* mention */
      .mention-wrap {
        position: relative;
      }
      .mention-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #0f1e38;
        border: 1px solid #1e3a6e;
        border-radius: 8px;
        z-index: 100;
        max-height: 180px;
        overflow-y: auto;
        box-shadow: 0 8px 24px #000a;
      }
      .mention-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
      }
      .mention-item:hover,
      .mention-item.active {
        background: #1e3a6e;
      }
      .m-name {
        color: #e2e8f0;
      }
      .m-gen {
        color: #475569;
        font-size: 10px;
      }
      .tag-linked {
        font-size: 10px;
        color: #60a5fa;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tag-linked button {
        background: none;
        border: none;
        color: #475569;
        cursor: pointer;
      }
      /* achievements */
      .achievement-wrap {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .preset-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .preset-btn {
        background: #0f1e38;
        border: 1px solid #1e3a6e;
        color: #64748b;
        border-radius: 12px;
        padding: 3px 12px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.12s;
      }
      .preset-btn.selected {
        background: #1e3a6e;
        color: #60a5fa;
        border-color: #3b82f6;
      }
      .custom-ach-row {
        display: flex;
        gap: 6px;
      }
      .custom-ach-row input {
        flex: 1;
      }
      .btn-add-ach {
        padding: 4px 12px;
        font-size: 11px;
        background: #0f1e38;
        border: 1px solid #1e3a6e;
        color: #60a5fa;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      }
      .selected-achievements {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .ach-tag {
        background: #0f1e38;
        border: 1px solid #3b82f6;
        color: #60a5fa;
        border-radius: 12px;
        padding: 2px 10px;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .ach-tag button {
        background: none;
        border: none;
        color: #475569;
        cursor: pointer;
        font-size: 10px;
        padding: 0;
      }
      /* scholar */
      .year-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .year-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px solid #0f1828;
      }
      .year-tag {
        background: #0f1e38;
        color: #60a5fa;
        border: 1px solid #1e3a6e;
        border-radius: 6px;
        padding: 3px 12px;
        font-size: 12px;
        font-weight: 700;
      }
      .year-cnt {
        font-size: 11px;
        color: #475569;
      }
      .year-reward {
        font-size: 11px;
        color: #f59e0b;
        margin-left: auto;
      }
      .green-txt {
        color: #22c55e !important;
      }
      .red-txt {
        color: #ef4444 !important;
      }
      .gold-txt {
        color: #f59e0b !important;
      }
      .scholar-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .scholar-card {
        background: #0c1828;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 12px 14px;
        min-width: 180px;
        max-width: 250px;
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .scholar-card:hover {
        border-color: #334155;
      }
      .scholar-card.has-reward {
        border-color: #78350f44;
      }
      .sc-achievements {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-bottom: 2px;
      }
      .sc-ach-tag {
        font-size: 9px;
        font-weight: 700;
        color: #f59e0b;
        background: #1a120066;
        border: 1px solid #78350f44;
        border-radius: 8px;
        padding: 1px 7px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .sc-name {
        font-size: 14px;
        font-weight: 700;
        color: #e2e8f0;
      }
      .sc-link {
        font-size: 10px;
        color: #60a5fa;
      }
      .sc-school {
        display: flex;
        gap: 6px;
        font-size: 10px;
        color: #64748b;
      }
      .sc-reward {
        font-size: 12px;
        color: #f59e0b;
        font-weight: 600;
        margin-top: 4px;
      }
      .sc-awarded {
        font-size: 10px;
        color: #475569;
      }
      .sc-notes {
        font-size: 10px;
        color: #334155;
        font-style: italic;
      }
      .sc-actions {
        display: none;
        position: absolute;
        top: 8px;
        right: 8px;
        gap: 3px;
      }
      .scholar-card:hover .sc-actions {
        display: flex;
      }
      .sc-actions button {
        background: #1e293b;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 2px 5px;
        font-size: 11px;
      }
      /* fund table */
      .fund-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .fund-table th {
        text-align: left;
        padding: 8px 10px;
        font-size: 10px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #0f1828;
      }
      .fund-table td {
        padding: 9px 10px;
        border-bottom: 1px solid #0a0f1a;
        color: #94a3b8;
      }
      .fund-table tr:last-child td {
        border-bottom: none;
      }
      .ta-r {
        text-align: right;
      }
      .type-badge {
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
      }
      .type-DIEU_DONG {
        background: #0f1e38;
        color: #60a5fa;
      }
      .type-CUNG_TIEN {
        background: #1a0f2e;
        color: #c084fc;
      }
      .type-CHI {
        background: #1a0a0a;
        color: #f87171;
      }
      .fund-name {
        display: block;
        color: #e2e8f0;
      }
      .fund-linked {
        display: block;
        font-size: 10px;
        color: #60a5fa;
      }
      .fund-sub {
        display: block;
        font-size: 10px;
        color: #334155;
      }
      .fund-event {
        color: #64748b;
        font-size: 11px;
      }
      .amt-in {
        color: #22c55e;
        font-weight: 600;
      }
      .amt-out {
        color: #ef4444;
        font-weight: 600;
      }
      .td-actions {
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .fund-table tr:hover .td-actions {
        opacity: 1;
      }
      .td-actions button {
        background: #1e293b;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 2px 5px;
        font-size: 11px;
        margin-left: 3px;
      }
    `,
  ],
})
export class FundPage implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  protected router = inject(Router);

  familyId = '';
  familyName = signal('');
  isOwner = signal(false);
  viewOnly = signal(false);
  tab = signal<Tab>('scholarship');
  loading = signal(false);
  scholarRecords = signal<ScholarRecord[]>([]);
  fundRecords = signal<FundRecord[]>([]);
  summary = signal<FundSummary | null>(null);
  allMembers = signal<MemberRef[]>([]);

  filterYear = '';
  filterFundType = '';
  currentYear = new Date().getFullYear();
  ACHIEVEMENTS = ACHIEVEMENT_PRESETS;

  mentionDropdown = signal<MemberRef[]>([]);
  mentionIdx = 0;
  activeMentionField: 'scholar' | 'fund' | null = null;

  showScholarForm = signal(false);
  editScholarId = signal<string | null>(null);
  sForm = this.blankScholar();
  selectedAchievements = signal<string[]>([]);
  customAchievement = '';

  showFundForm = signal(false);
  editFundId = signal<string | null>(null);
  fForm = this.blankFund();

  years = computed(() => {
    const all = [
      ...this.scholarRecords().map((r) => r.year),
      ...this.fundRecords().map((r) => r.year),
    ];
    return [...new Set(all)].sort((a, b) => b - a);
  });

  scholarStats = computed(() => {
    const rs = this.scholarRecords();
    if (!rs.length) return null;
    return {
      total: rs.length,
      excellent: rs.filter(
        (r) =>
          r.achievement.includes('Giỏi') ||
          r.achievement.includes('Xuất sắc') ||
          r.achievement.includes('Giải'),
      ).length,
      totalReward: rs.reduce((s, r) => s + (r.rewardAmount ?? 0), 0),
    };
  });

  scholarByYear = computed(() => {
    const map = new Map<number, ScholarRecord[]>();
    for (const r of this.scholarRecords()) {
      if (!map.has(r.year)) map.set(r.year, []);
      map.get(r.year)!.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, records]) => ({
        year,
        records,
        totalReward: records.reduce((s, r) => s + (r.rewardAmount ?? 0), 0),
      }));
  });

  fundByYear = computed(() => {
    const map = new Map<number, FundRecord[]>();
    for (const r of this.fundRecords()) {
      if (!map.has(r.year)) map.set(r.year, []);
      map.get(r.year)!.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, records]) => {
        const totalIn = records
          .filter((r) => r.type !== 'CHI')
          .reduce((s, r) => s + r.amount, 0);
        const totalOut = records
          .filter((r) => r.type === 'CHI')
          .reduce((s, r) => s + r.amount, 0);
        return {
          year,
          records,
          totalIn,
          totalOut,
          balance: totalIn - totalOut,
        };
      });
  });

  async ngOnInit() {
    this.familyId = this.route.snapshot.params['id'];
    const isPublicRoute = this.route.snapshot.data['public'] === true;
    if (isPublicRoute) {
      this.viewOnly.set(true);
    } else {
      await this.loadFamilyInfo();
    }
    await Promise.all([
      this.loadScholarship(),
      this.loadFund(),
      this.loadMembers(),
    ]);
  }

  private async loadFamilyInfo() {
    try {
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}`)
        .toPromise();
      this.familyName.set(r?.data?.name ?? '');
      const role: any = await this.http
        .get(`${environment.apiUrl}/api/families/${this.familyId}/my-role`)
        .toPromise();
      this.isOwner.set(role?.data?.role === 'OWNER');
    } catch {}
  }

  private async loadMembers() {
    try {
      const url = this.viewOnly()
        ? `${environment.apiUrl}/api/public/families/${this.familyId}/members`
        : `${environment.apiUrl}/api/members?familyId=${this.familyId}`;
      const r: any = await this.http.get(url).toPromise();
      this.allMembers.set(
        (r?.data ?? []).map((m: any) => ({
          id: m.id,
          fullName: m.fullName,
          generation: m.generation,
        })),
      );
    } catch {}
  }

  async loadScholarship() {
    this.loading.set(true);
    try {
      const p = new URLSearchParams({ familyId: this.familyId });
      if (this.filterYear) p.set('year', this.filterYear);
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/scholarship?${p}`)
        .toPromise();
      this.scholarRecords.set(r?.data ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  async loadFund() {
    this.loading.set(true);
    try {
      const p = new URLSearchParams({ familyId: this.familyId });
      if (this.filterYear) p.set('year', this.filterYear);
      if (this.filterFundType) p.set('type', this.filterFundType);
      const r: any = await this.http
        .get(`${environment.apiUrl}/api/fund?${p}`)
        .toPromise();
      this.fundRecords.set(r?.data ?? []);
      this.summary.set(r?.summary ?? null);
    } finally {
      this.loading.set(false);
    }
  }

  // @ mention
  onMentionInput(event: Event, field: 'scholar' | 'fund') {
    const val = (event.target as HTMLInputElement).value;
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0) {
      const query = val.slice(atIdx + 1).toLowerCase();
      const results = this.allMembers()
        .filter((m) => m.fullName.toLowerCase().includes(query))
        .slice(0, 8);
      this.mentionDropdown.set(results);
      this.mentionIdx = 0;
      this.activeMentionField = results.length ? field : null;
    } else {
      this.mentionDropdown.set([]);
      this.activeMentionField = null;
    }
  }

  onMentionKey(event: KeyboardEvent) {
    const dd = this.mentionDropdown();
    if (!dd.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.mentionIdx = Math.min(this.mentionIdx + 1, dd.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.mentionIdx = Math.max(this.mentionIdx - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectMention(dd[this.mentionIdx], this.activeMentionField!);
    } else if (event.key === 'Escape') {
      this.mentionDropdown.set([]);
      this.activeMentionField = null;
    }
  }

  selectMention(m: MemberRef, field: 'scholar' | 'fund') {
    if (field === 'scholar') {
      const atIdx = this.sForm.studentName.lastIndexOf('@');
      this.sForm.studentName =
        (atIdx >= 0
          ? this.sForm.studentName.slice(0, atIdx)
          : this.sForm.studentName) + m.fullName;
      this.sForm.memberId = m.id;
    } else {
      const atIdx = this.fForm.contributorName.lastIndexOf('@');
      this.fForm.contributorName =
        (atIdx >= 0
          ? this.fForm.contributorName.slice(0, atIdx)
          : this.fForm.contributorName) + m.fullName;
      this.fForm.memberId = m.id;
    }
    this.mentionDropdown.set([]);
    this.activeMentionField = null;
  }

  clearLink(f: 'scholar' | 'fund') {
    if (f === 'scholar') this.sForm.memberId = '';
    else this.fForm.memberId = '';
  }
  linkedMemberName(f: 'scholar' | 'fund') {
    const id = f === 'scholar' ? this.sForm.memberId : this.fForm.memberId;
    return this.allMembers().find((m) => m.id === id)?.fullName ?? id;
  }

  // Achievement multi-select
  isAchSelected(p: string) {
    return this.selectedAchievements().includes(p);
  }
  toggleAch(p: string) {
    const cur = this.selectedAchievements();
    this.selectedAchievements.set(
      cur.includes(p) ? cur.filter((a) => a !== p) : [...cur, p],
    );
  }
  addCustomAch() {
    if (!this.customAchievement.trim()) return;
    this.selectedAchievements.update((a) => [
      ...a,
      this.customAchievement.trim(),
    ]);
    this.customAchievement = '';
  }
  removeAch(a: string) {
    this.selectedAchievements.update((cur) => cur.filter((x) => x !== a));
  }
  splitAch(s: string) {
    return s
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  // Scholar CRUD
  openScholarForm() {
    this.selectedAchievements.set([]);
    this.sForm = this.blankScholar();
    this.editScholarId.set(null);
    this.showScholarForm.set(true);
  }

  async saveScholar() {
    const achievement = this.selectedAchievements().join(' | ');
    if (!this.sForm.studentName || !this.sForm.year || !achievement) return;
    const url = this.editScholarId()
      ? `${environment.apiUrl}/api/scholarship/${this.editScholarId()}`
      : `${environment.apiUrl}/api/scholarship`;
    await (this.http as any)
      [
        this.editScholarId() ? 'patch' : 'post'
      ](url, { ...this.sForm, achievement, familyId: this.familyId })
      .toPromise();
    this.cancelScholarForm();
    await this.loadScholarship();
  }

  editScholar(r: ScholarRecord) {
    this.editScholarId.set(r.id);
    this.selectedAchievements.set(this.splitAch(r.achievement));
    this.sForm = {
      studentName: r.studentName,
      year: r.year,
      school: r.school ?? '',
      grade: r.grade ?? '',
      rewardAmount: r.rewardAmount ?? null,
      awardedBy: r.awardedBy ?? '',
      notes: r.notes ?? '',
      memberId: r.member?.id ?? '',
    };
    this.showScholarForm.set(true);
  }

  async deleteScholar(id: string) {
    if (!confirm('Xoá thành tích này?')) return;
    await this.http
      .delete(`${environment.apiUrl}/api/scholarship/${id}`)
      .toPromise();
    await this.loadScholarship();
  }

  cancelScholarForm() {
    this.showScholarForm.set(false);
    this.editScholarId.set(null);
    this.sForm = this.blankScholar();
    this.selectedAchievements.set([]);
  }

  // Fund CRUD
  openFundForm() {
    this.fForm = this.blankFund();
    this.editFundId.set(null);
    this.showFundForm.set(true);
  }

  async saveFund() {
    if (!this.fForm.type || !this.fForm.year || this.fForm.amount === null)
      return;
    const url = this.editFundId()
      ? `${environment.apiUrl}/api/fund/${this.editFundId()}`
      : `${environment.apiUrl}/api/fund`;
    await (this.http as any)
      [
        this.editFundId() ? 'patch' : 'post'
      ](url, { ...this.fForm, familyId: this.familyId })
      .toPromise();
    this.cancelFundForm();
    await this.loadFund();
  }

  editFund(r: FundRecord) {
    this.editFundId.set(r.id);
    this.fForm = {
      type: r.type,
      year: r.year,
      eventName: r.eventName ?? '',
      contributorName: r.contributorName ?? '',
      amount: r.amount,
      description: r.description ?? '',
      recordedBy: r.recordedBy ?? '',
      memberId: r.member?.id ?? '',
    };
    this.showFundForm.set(true);
  }

  async deleteFund(id: string) {
    if (!confirm('Xoá bản ghi này?')) return;
    await this.http.delete(`${environment.apiUrl}/api/fund/${id}`).toPromise();
    await this.loadFund();
  }

  cancelFundForm() {
    this.showFundForm.set(false);
    this.editFundId.set(null);
    this.fForm = this.blankFund();
  }

  goBack() {
    this.router.navigate(['/families', this.familyId]);
  }

  fmtMoney(n: number): string {
    if (n >= 1_000_000)
      return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + ' tr';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return n.toLocaleString('vi');
  }

  typeLabel(t: FundType) {
    return t === 'DIEU_DONG'
      ? '💼 Điếu đóng'
      : t === 'CUNG_TIEN'
        ? '🙏 Cúng tiến'
        : '💸 Chi ra';
  }

  private blankScholar() {
    return {
      studentName: '',
      year: this.currentYear,
      school: '',
      grade: '',
      rewardAmount: null as any,
      awardedBy: '',
      notes: '',
      memberId: '',
    };
  }
  private blankFund() {
    return {
      type: 'DIEU_DONG' as FundType,
      year: this.currentYear,
      eventName: '',
      contributorName: '',
      amount: null as any,
      description: '',
      recordedBy: '',
      memberId: '',
    };
  }
}
