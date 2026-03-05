-- ============================================================
-- DỮ LIỆU MẪU: HỌ LÊ VĂN — 5 ĐỜI
-- Chạy trong Supabase Dashboard → SQL Editor
-- ============================================================

-- Lưu ý: thay UUID của bạn vào ownerId (lấy từ Authentication → Users)
-- Hoặc chạy query này trước để lấy id:
--   SELECT id, email FROM auth.users LIMIT 5;

DO $$
DECLARE
  v_owner_id    TEXT := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; -- ⚠️ THAY bằng auth.users.id thật
  v_family_id   TEXT := gen_random_uuid()::TEXT;

  -- Đời 1
  m_doi1_1      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Tổ (thủy tổ)

  -- Đời 2
  m_doi2_1      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Đức (con trai trưởng)
  m_doi2_2      TEXT := gen_random_uuid()::TEXT; -- Lê Thị Hoa (vợ Đức)
  m_doi2_3      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Nghĩa (con trai thứ)
  m_doi2_4      TEXT := gen_random_uuid()::TEXT; -- Nguyễn Thị Mai (vợ Nghĩa)

  -- Đời 3
  m_doi3_1      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Minh (con Đức)
  m_doi3_2      TEXT := gen_random_uuid()::TEXT; -- Trần Thị Lan (vợ Minh)
  m_doi3_3      TEXT := gen_random_uuid()::TEXT; -- Lê Thị Thu (con gái Đức)
  m_doi3_4      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Hùng (con Nghĩa)
  m_doi3_5      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Dũng (con Nghĩa)
  m_doi3_6      TEXT := gen_random_uuid()::TEXT; -- Phạm Thị Ngọc (vợ Dũng)

  -- Đời 4
  m_doi4_1      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Tuấn (con Minh)
  m_doi4_2      TEXT := gen_random_uuid()::TEXT; -- Lê Thị Linh (con Minh)
  m_doi4_3      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Phong (con Hùng)
  m_doi4_4      TEXT := gen_random_uuid()::TEXT; -- Hoàng Thị Yến (vợ Phong)
  m_doi4_5      TEXT := gen_random_uuid()::TEXT; -- Lê Văn Khoa (con Dũng)
  m_doi4_6      TEXT := gen_random_uuid()::TEXT; -- Lê Thị Ngân (con Dũng)

  -- Đời 5
  m_doi5_1      TEXT := gen_random_uuid()::TEXT; -- Lê Minh Khôi (con Tuấn)
  m_doi5_2      TEXT := gen_random_uuid()::TEXT; -- Lê Minh Anh (con Tuấn)
  m_doi5_3      TEXT := gen_random_uuid()::TEXT; -- Lê Gia Phong (con Phong)
  m_doi5_4      TEXT := gen_random_uuid()::TEXT; -- Lê Gia Bảo (con Phong)
  m_doi5_5      TEXT := gen_random_uuid()::TEXT; -- Lê Đức Khải (con Khoa)

BEGIN

-- ============================================================
-- 1. TẠO FAMILY
-- ============================================================
INSERT INTO families (id, name, description, "ownerId", "isPublic", "createdAt", "updatedAt")
VALUES (
  v_family_id,
  'Họ Lê Văn',
  'Gia phả họ Lê Văn — 5 đời từ thủy tổ Lê Văn Tổ, khởi nguồn từ tỉnh Thanh Hóa',
  v_owner_id,
  false,
  NOW(),
  NOW()
);

-- ============================================================
-- 2. OWNER vào family_members
-- ============================================================
INSERT INTO family_members (id, "familyId", "userId", role, "joinedAt")
VALUES (gen_random_uuid()::TEXT, v_family_id, v_owner_id, 'OWNER', NOW());

-- ============================================================
-- 3. THÀNH VIÊN — ĐỜI 1
-- ============================================================
INSERT INTO members (id, "familyId", "fullName", gender, "birthDate", "deathDate", generation, biography, "createdAt", "updatedAt") VALUES
(m_doi1_1, v_family_id, 'Lê Văn Tổ',  'MALE',
 '1850-03-15', '1920-11-02', 1,
 'Thủy tổ họ Lê Văn. Quê gốc Thanh Hóa, di cư vào Nghệ An năm 1875. Làm nghề nông, có công khai khẩn đất hoang lập làng.',
 NOW(), NOW());

-- ============================================================
-- 4. THÀNH VIÊN — ĐỜI 2
-- ============================================================
INSERT INTO members (id, "familyId", "fullName", gender, "birthDate", "deathDate", generation, biography, "createdAt", "updatedAt") VALUES
(m_doi2_1, v_family_id, 'Lê Văn Đức',  'MALE',
 '1878-06-20', '1955-04-10', 2,
 'Con trưởng của Lê Văn Tổ. Tiếp nối nghề nông, mở rộng đất canh tác. Có 2 người con.',
 NOW(), NOW()),

(m_doi2_2, v_family_id, 'Lê Thị Hoa',  'FEMALE',
 '1880-09-05', '1960-07-22', 2,
 'Vợ của Lê Văn Đức. Người làng Yên Bái, nổi tiếng đảm đang, nuôi dạy con cái nên người.',
 NOW(), NOW()),

(m_doi2_3, v_family_id, 'Lê Văn Nghĩa', 'MALE',
 '1882-01-10', '1950-12-30', 2,
 'Con thứ của Lê Văn Tổ. Làm nghề buôn bán, lập nghiệp ở Vinh. Có 2 người con trai.',
 NOW(), NOW()),

(m_doi2_4, v_family_id, 'Nguyễn Thị Mai', 'FEMALE',
 '1885-04-18', '1958-03-14', 2,
 'Vợ của Lê Văn Nghĩa. Con nhà gia giáo, giỏi chữ Nôm.',
 NOW(), NOW());

-- ============================================================
-- 5. THÀNH VIÊN — ĐỜI 3
-- ============================================================
INSERT INTO members (id, "familyId", "fullName", gender, "birthDate", "deathDate", generation, biography, "createdAt", "updatedAt") VALUES
(m_doi3_1, v_family_id, 'Lê Văn Minh',   'MALE',
 '1905-08-12', '1978-05-20', 3,
 'Con trưởng của Lê Văn Đức. Tham gia kháng chiến chống Pháp. Được tặng Huân chương Kháng chiến hạng Ba.',
 NOW(), NOW()),

(m_doi3_2, v_family_id, 'Trần Thị Lan',  'FEMALE',
 '1908-11-25', '1985-09-03', 3,
 'Vợ của Lê Văn Minh. Làm y tá tại bệnh viện huyện trong thời kháng chiến.',
 NOW(), NOW()),

(m_doi3_3, v_family_id, 'Lê Thị Thu',    'FEMALE',
 '1910-02-14', '1990-06-18', 3,
 'Con gái của Lê Văn Đức. Lấy chồng họ Nguyễn, định cư tại Hà Nội.',
 NOW(), NOW()),

(m_doi3_4, v_family_id, 'Lê Văn Hùng',   'MALE',
 '1908-07-30', '1972-10-15', 3,
 'Con trưởng của Lê Văn Nghĩa. Hi sinh trong kháng chiến chống Mỹ năm 1972.',
 NOW(), NOW()),

(m_doi3_5, v_family_id, 'Lê Văn Dũng',   'MALE',
 '1912-05-08', '1988-02-28', 3,
 'Con thứ của Lê Văn Nghĩa. Làm cán bộ xã, có công xây dựng hợp tác xã nông nghiệp.',
 NOW(), NOW()),

(m_doi3_6, v_family_id, 'Phạm Thị Ngọc', 'FEMALE',
 '1915-03-22', '1992-11-10', 3,
 'Vợ của Lê Văn Dũng. Người Hà Tĩnh, làm giáo viên tiểu học.',
 NOW(), NOW());

-- ============================================================
-- 6. THÀNH VIÊN — ĐỜI 4
-- ============================================================
INSERT INTO members (id, "familyId", "fullName", gender, "birthDate", "deathDate", generation, biography, "createdAt", "updatedAt") VALUES
(m_doi4_1, v_family_id, 'Lê Văn Tuấn',   'MALE',
 '1935-04-10', '2010-08-25', 4,
 'Con trưởng của Lê Văn Minh. Kỹ sư xây dựng, tham gia xây dựng nhiều công trình tại miền Bắc.',
 NOW(), NOW()),

(m_doi4_2, v_family_id, 'Lê Thị Linh',   'FEMALE',
 '1938-12-01', NULL, 4,
 'Con gái của Lê Văn Minh. Hiện sống tại TP.HCM, có 3 người con.',
 NOW(), NOW()),

(m_doi4_3, v_family_id, 'Lê Văn Phong',  'MALE',
 '1940-09-17', '2005-03-12', 4,
 'Con của Lê Văn Hùng (liệt sĩ). Được nuôi dưỡng bởi chú Lê Văn Dũng. Làm bộ đội, phục viên năm 1985.',
 NOW(), NOW()),

(m_doi4_4, v_family_id, 'Hoàng Thị Yến', 'FEMALE',
 '1943-06-05', NULL, 4,
 'Vợ của Lê Văn Phong. Hiện sống tại Nghệ An cùng con cháu.',
 NOW(), NOW()),

(m_doi4_5, v_family_id, 'Lê Văn Khoa',   'MALE',
 '1945-11-20', NULL, 4,
 'Con trưởng của Lê Văn Dũng. Tốt nghiệp Đại học Bách Khoa Hà Nội, làm kỹ sư điện.',
 NOW(), NOW()),

(m_doi4_6, v_family_id, 'Lê Thị Ngân',   'FEMALE',
 '1948-07-15', NULL, 4,
 'Con gái của Lê Văn Dũng. Giáo viên cấp 3 môn Văn, nghỉ hưu năm 2008.',
 NOW(), NOW());

-- ============================================================
-- 7. THÀNH VIÊN — ĐỜI 5 (thế hệ hiện tại)
-- ============================================================
INSERT INTO members (id, "familyId", "fullName", gender, "birthDate", "deathDate", generation, biography, "createdAt", "updatedAt") VALUES
(m_doi5_1, v_family_id, 'Lê Minh Khôi',  'MALE',
 '1965-03-22', NULL, 5,
 'Con trưởng của Lê Văn Tuấn. Kỹ sư CNTT, hiện làm việc tại Hà Nội.',
 NOW(), NOW()),

(m_doi5_2, v_family_id, 'Lê Minh Anh',   'FEMALE',
 '1968-08-10', NULL, 5,
 'Con gái của Lê Văn Tuấn. Bác sĩ, công tác tại Bệnh viện Bạch Mai.',
 NOW(), NOW()),

(m_doi5_3, v_family_id, 'Lê Gia Phong',  'MALE',
 '1968-12-05', NULL, 5,
 'Con trưởng của Lê Văn Phong. Doanh nhân, hiện kinh doanh tại Đà Nẵng.',
 NOW(), NOW()),

(m_doi5_4, v_family_id, 'Lê Gia Bảo',    'MALE',
 '1972-05-18', NULL, 5,
 'Con thứ của Lê Văn Phong. Làm việc tại Nhật Bản từ năm 2000.',
 NOW(), NOW()),

(m_doi5_5, v_family_id, 'Lê Đức Khải',   'MALE',
 '1975-01-30', NULL, 5,
 'Con của Lê Văn Khoa. Tiến sĩ Vật lý, giảng viên Đại học Quốc gia Hà Nội.',
 NOW(), NOW());

-- ============================================================
-- 8. QUAN HỆ (relationships)
-- ============================================================

-- ĐỜI 1 → ĐỜI 2: Con cái của Lê Văn Tổ
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi1_1, m_doi2_1, 'PARENT', NOW()),  -- Tổ → Đức
(gen_random_uuid()::TEXT, m_doi1_1, m_doi2_3, 'PARENT', NOW());  -- Tổ → Nghĩa

-- ĐỜI 2: Vợ chồng
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "marriageDate", "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi2_1, m_doi2_2, 'SPOUSE', '1900-02-15', NOW()),  -- Đức ↔ Hoa
(gen_random_uuid()::TEXT, m_doi2_3, m_doi2_4, 'SPOUSE', '1905-08-20', NOW());  -- Nghĩa ↔ Mai

-- ĐỜI 2 → ĐỜI 3: Con cái
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi2_1, m_doi3_1, 'PARENT', NOW()),  -- Đức → Minh
(gen_random_uuid()::TEXT, m_doi2_1, m_doi3_3, 'PARENT', NOW()),  -- Đức → Thu
(gen_random_uuid()::TEXT, m_doi2_3, m_doi3_4, 'PARENT', NOW()),  -- Nghĩa → Hùng
(gen_random_uuid()::TEXT, m_doi2_3, m_doi3_5, 'PARENT', NOW());  -- Nghĩa → Dũng

-- ĐỜI 3: Vợ chồng
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "marriageDate", "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi3_1, m_doi3_2, 'SPOUSE', '1930-04-10', NOW()),  -- Minh ↔ Lan
(gen_random_uuid()::TEXT, m_doi3_5, m_doi3_6, 'SPOUSE', '1938-09-05', NOW());  -- Dũng ↔ Ngọc

-- ĐỜI 3 → ĐỜI 4: Con cái
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi3_1, m_doi4_1, 'PARENT', NOW()),  -- Minh → Tuấn
(gen_random_uuid()::TEXT, m_doi3_1, m_doi4_2, 'PARENT', NOW()),  -- Minh → Linh
(gen_random_uuid()::TEXT, m_doi3_4, m_doi4_3, 'PARENT', NOW()),  -- Hùng → Phong
(gen_random_uuid()::TEXT, m_doi3_5, m_doi4_5, 'PARENT', NOW()),  -- Dũng → Khoa
(gen_random_uuid()::TEXT, m_doi3_5, m_doi4_6, 'PARENT', NOW());  -- Dũng → Ngân

-- ĐỜI 4: Vợ chồng
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "marriageDate", "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi4_3, m_doi4_4, 'SPOUSE', '1965-11-20', NOW());  -- Phong ↔ Yến

-- ĐỜI 4 → ĐỜI 5: Con cái
INSERT INTO relationships (id, "fromMemberId", "toMemberId", type, "createdAt") VALUES
(gen_random_uuid()::TEXT, m_doi4_1, m_doi5_1, 'PARENT', NOW()),  -- Tuấn → Khôi
(gen_random_uuid()::TEXT, m_doi4_1, m_doi5_2, 'PARENT', NOW()),  -- Tuấn → Anh
(gen_random_uuid()::TEXT, m_doi4_3, m_doi5_3, 'PARENT', NOW()),  -- Phong → Gia Phong
(gen_random_uuid()::TEXT, m_doi4_3, m_doi5_4, 'PARENT', NOW()),  -- Phong → Gia Bảo
(gen_random_uuid()::TEXT, m_doi4_5, m_doi5_5, 'PARENT', NOW());  -- Khoa → Đức Khải

-- ============================================================
-- 9. KIỂM TRA KẾT QUẢ
-- ============================================================
RAISE NOTICE '✅ Đã tạo family_id: %', v_family_id;
RAISE NOTICE '📊 Số thành viên: %', (SELECT COUNT(*) FROM members WHERE "familyId" = v_family_id);
RAISE NOTICE '🔗 Số quan hệ: %',    (SELECT COUNT(*) FROM relationships r JOIN members m ON m.id = r."fromMemberId" WHERE m."familyId" = v_family_id);

END $$;

-- ============================================================
-- KIỂM TRA sau khi chạy
-- ============================================================
-- Xem cây theo đời:
SELECT generation, COUNT(*) as so_nguoi, STRING_AGG("fullName", ', ') as ten
FROM members
GROUP BY generation
ORDER BY generation;

-- Xem quan hệ cha-con:
SELECT
  p."fullName" as cha_me,
  c."fullName" as con,
  r.type
FROM relationships r
JOIN members p ON p.id = r."fromMemberId"
JOIN members c ON c.id = r."toMemberId"
WHERE r.type = 'PARENT'
ORDER BY p.generation, p."fullName";