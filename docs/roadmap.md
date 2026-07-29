# FireCare — Phân tích nghiệp vụ & Lộ trình tính năng (mở rộng)

> Tài liệu này mở rộng plan ban đầu (vốn nghiêng về CRM/chăm sóc) thành **nền tảng quản lý
> tài sản & dịch vụ PCCC toàn diện**. Nguồn cảm hứng: thực tế nghiệp vụ PCCC ở VN + tham chiếu
> sản phẩm dạng "fire-safety inspection SaaS" (buildings · thiết bị + QR · kiểm tra định kỳ ·
> compliance · sự cố/sửa chữa · evidence · analytics).

---

## 1. Vì sao plan cũ còn thiếu

Plan ban đầu chỉ phủ **trục dịch vụ/chăm sóc** (khách hàng → phiếu đổi bình/bảo trì → nhắc tái dịch
vụ → chăm sóc → chứng từ). Nhưng doanh nghiệp PCCC thực chất quản lý **vòng đời tài sản an toàn cháy
nổ** cho khách — thiếu hẳn các trục:

- **Địa điểm/Tòa nhà (sites/buildings)** và cấu trúc tầng/khu vực.
- **Thiết bị PCCC (assets/devices)**: bình chữa cháy, tủ báo cháy, đầu báo, họng nước, sprinkler,
  đèn thoát hiểm… — có **QR/serial/hạn kiểm định**, vị trí, trạng thái.
- **Kiểm tra định kỳ (inspections)**: routine/annual/diễn tập/điện + **checklist + evidence (ảnh) +
  pass/fail + ưu tiên + auto-alert + hạn**.
- **Lịch kiểm định định kỳ (test schedules)**, **sự cố & sửa chữa (faults & repairs)**,
  **tuân thủ & chứng chỉ (compliance & certificates)**, **báo cáo/analytics + xuất PDF theo evidence**.

Đây mới là phần "chuẩn chỉnh, chống mất khách + đúng pháp luật" mà PCCC cần: khách gắn bó vì **hồ sơ
an toàn + nhắc kiểm định tự động**, không chỉ vì đổi bình.

## 2. Phân tích nghiệp vụ

### 2.1 Vòng đời tài sản PCCC (xương sống mới)
```
Khách hàng → Địa điểm/Tòa nhà → Thiết bị (QR, serial, hạn) →
  Kiểm tra/kiểm định định kỳ (checklist + evidence) →
    ├─ Đạt  → cập nhật hạn kế tiếp → nhắc tái kiểm/tái dịch vụ (engine)
    └─ Lỗi  → Sự cố → Báo giá → Phiếu dịch vụ (sửa/đổi/nạp) → Nghiệm thu → Chứng chỉ
      → Hồ sơ tuân thủ (compliance) của địa điểm → Báo cáo
```
Chăm sóc khách hàng (Kanban/SLA/hậu mãi) bao quanh toàn bộ vòng đời — mọi mốc (đến hạn kiểm định,
sự cố, chứng chỉ sắp hết hạn) đều sinh việc chăm sóc.

### 2.2 Hai trục nghiệp vụ (bổ sung cho nhau)
| Trục | Nội dung | Khách điển hình |
|---|---|---|
| **Dịch vụ & Chăm sóc** (đã có plan) | đổi bình, nạp sạc, bảo trì, bán hàng; phiếu; nhắc tái dịch vụ; care Kanban; chứng từ | khách lẻ, quán ăn, hộ KD |
| **Tài sản & Kiểm định** (còn thiếu) | tòa nhà, thiết bị + QR, kiểm tra định kỳ, sự cố/sửa chữa, compliance, chứng chỉ | doanh nghiệp, tòa nhà, nhà xưởng, KCN |

### 2.3 Personas / roles (mở rộng)
`admin` · `accountant` (kế toán) · `staff` (CSKH/bán hàng) · **`technician`/inspector** (kỹ thuật đi
kiểm tra — hiện gộp vào staff `isFieldStaff`; nên tách quyền field) · shipper = staff field. Field
roles cần **app/mobile-web + quét QR tại hiện trường**.

## 3. Bản đồ module đầy đủ

| # | Module | Tính năng chính | Trạng thái |
|---|---|---|---|
| 1 | **Khách hàng** | hồ sơ, phân loại, tag, import CSV, tìm không dấu, Customer 360 | ✅ đã có |
| 2 | **Địa điểm/Tòa nhà** (Sites) | cây khách→tòa nhà→tầng/khu vực; địa chỉ+geo; ảnh; hồ sơ tuân thủ theo site | ❌ thiếu |
| 3 | **Thiết bị PCCC** (Assets) | kiểm kê thiết bị/site: loại, **serial + QR**, ngày SX, **hạn kiểm định/tái nạp**, vị trí (tầng/khu), trạng thái (active/inactive/faulty/pending), ảnh; nhập hàng loạt | ❌ thiếu |
| 4 | **Kiểm tra & Kiểm định** (Inspections) | phiếu kiểm tra theo **checklist mẫu** (routine/annual/diễn tập/điện), gán inspector, **evidence ảnh**, kết quả đạt/lỗi từng hạng mục, ưu tiên, hạn, **auto-alert**, ký xác nhận | ❌ thiếu |
| 5 | **Lịch kiểm định định kỳ** (Test schedules) | chu kỳ theo loại thiết bị/site → tự sinh phiếu kiểm tra đến hạn; dashboard "sắp đến hạn / quá hạn" | ❌ thiếu |
| 6 | **Sự cố & Sửa chữa** (Faults & Repairs) | log lỗi từ kiểm tra → work-order sửa/đổi/nạp; theo dõi trạng thái, chi phí; liên kết phiếu dịch vụ | ❌ thiếu |
| 7 | **Tuân thủ & Chứng chỉ** (Compliance) | hồ sơ tuân thủ/site: chứng chỉ kiểm định (đính kèm scan), hạn hiệu lực, cảnh báo hết hạn; "% site đạt chuẩn" | ❌ thiếu |
| 8 | **Phiếu dịch vụ** (Service orders) | phiếu đa dòng (đổi/nạp/bảo trì/lắp đặt), giá, thanh toán, **nextDueDate** | 🟡 plan, chưa code |
| 9 | **Engine tái dịch vụ/tái kiểm + hậu mãi** | sweep đa mốc (hạn thiết bị + hạn phiếu + hạn chứng chỉ) → tự tạo care task; CSAT sau dịch vụ | 🟡 plan, chưa code |
| 10 | **Chăm sóc KH** (Care Kanban) | pool/claim/SLA, nhật ký tương tác, vòng follow-up, đa loại (đến hạn/khiếu nại/bảo hành/upsell) | 🟡 plan, chưa code |
| 11 | **Calendar & Điều phối** | lịch hẹn kiểm tra/giao bình; gán inspector/shipper; xem theo ngày/tuyến; đồng bộ due-date | 🟡 plan, chưa code |
| 12 | **Chứng từ & In ấn** | 8 loại phiếu + **biên bản kiểm tra/nghiệm thu + chứng chỉ + báo cáo evidence (PDF)**; số tự tăng; snapshot; ký | 🟡 plan (mở rộng thêm inspection docs) |
| 13 | **QR & Field (hiện trường)** | **quét QR trên thiết bị** → xem lịch sử + tạo phiếu kiểm tra tại chỗ; mobile-web cho kỹ thuật/shipper | ❌ thiếu (khác biệt lớn) |
| 14 | **Cảnh báo tự động** (Alerts) | trung tâm cảnh báo: kiểm định đến/quá hạn, chứng chỉ sắp hết hạn, thiết bị lỗi/inactive, QR chưa gán, thiếu vị trí; kênh in-app/Zalo/email | 🟡 một phần (bell) |
| 15 | **Bản đồ** (Maps) | site trên bản đồ; registry Google Maps; GBP sync (phase sau) | 🟡 plan |
| 16 | **Báo cáo & Analytics** | doanh thu; **tỷ lệ hoàn thành kiểm tra theo loại** (routine/annual/…); % tuân thủ; churn; đến hạn; **xuất PDF + lọc theo evidence** | 🟡 plan (mở rộng) |
| 17 | **AI** | bóc tách text→phiếu/thiết bị; soạn tin chăm sóc; tóm tắt hồ sơ; **gợi ý checklist/đánh giá ảnh evidence**; ưu tiên | 🟡 plan (mở rộng) |
| 18 | **Tích hợp** | Zalo/SMS (nhắc), e-invoice (hóa đơn), Google (GBP), e-signature (ký số) | ❌ phase sau |
| 19 | **Cài đặt & Phân quyền đa chi nhánh** | branch scoping; role (thêm technician/inspector); checklist templates; chu kỳ; cảnh báo | 🟡 một phần |

## 4. Mô hình dữ liệu bổ sung (ngoài plan cũ)

> Áp quy ước cũ: uuid pk, `branch_id`, timestamps, `search_text` (unaccent), PostGIS `geog`.

- **sites** (địa điểm/tòa nhà) — `customerId, name, code, address, ward/district/city, lat/lng,
  type(building|factory|restaurant|school|office|other), notes`. **site_areas** (tầng/khu vực) —
  `siteId, name (Tầng 1, Kho A), floorNo`.
- **assets** (thiết bị) — `siteId, areaId?, customerId(denorm), category(extinguisher|alarm_panel|
  detector|hydrant|sprinkler|emergency_light|hose|pump|other), name, serialNo, qrCode(unique),
  manufacturer, capacity, manufactureDate, installedAt, lastInspectedAt, nextDueDate,
  status(active|inactive|faulty|retired|pending), locationNote, photoUrl`. Index qrCode, nextDueDate.
- **checklist_templates** (mẫu kiểm tra) — `name, assetCategory, inspectionType(routine|annual|
  fire_drill|electrical|kiem_dinh), items(jsonb: [{key,label,type:pass_fail|number|text}])`.
- **inspections** (phiếu kiểm tra) — `code, siteId, assetId?, type, templateId, inspectorId,
  scheduledAt, performedAt?, status(scheduled|in_progress|passed|failed|canceled),
  priority(low|normal|high|urgent), result(jsonb kết quả từng item), notes, nextDueDate,
  signature(jsonb)`. **inspection_evidence** — `inspectionId, url, caption` (ảnh minh chứng).
- **test_schedules** (lịch định kỳ) — `siteId?, assetCategory?, inspectionType, cycleMonths,
  leadDays, isActive` → sweep sinh inspection đến hạn.
- **faults** (sự cố) — `assetId, inspectionId?, severity, description, status(open|in_repair|resolved),
  repairOrderId?(→ service_orders), foundAt, resolvedAt`.
- **certificates** (chứng chỉ/kiểm định) — `siteId?, assetId?, type, number, issuer, issuedAt,
  expiresAt, fileUrl(scan), status(valid|expiring|expired)`.
- **alerts** (cảnh báo) — `type(inspection_due|cert_expiring|asset_faulty|qr_unassigned|missing_location|
  reservice_due), refType+refId, branchId, severity, dueAt, status(open|dismissed|done), assigneeId?`.
- Mở rộng **documents.type**: thêm `inspection_report|certificate|evidence_report`.

## 5. Lộ trình phase (sắp xếp lại)

- **P0–P1** ✅ *(đã xong + verified)*: nền tảng, auth JWT+cookie, RBAC/branch, **khách hàng** (CRUD/
  filter/import), tài khoản, admin shadcn + dark mode + responsive + notification dropdown.
- **P2 — Tài sản & Địa điểm** *(nền của trục kiểm định)*: sites + areas + **assets (QR/serial/hạn)** +
  import hàng loạt + trang thiết bị theo site + trạng thái/thiếu-vị-trí/QR.
- **P3 — Kiểm tra & Lịch định kỳ**: checklist templates + **inspections (evidence, đạt/lỗi, ưu tiên,
  auto-alert)** + test_schedules + sweep sinh phiếu đến hạn + dashboard "Upcoming inspections".
- **P4 — Dịch vụ + Engine tái dịch vụ/tái kiểm + Sự cố/Sửa chữa**: service_orders/lines + faults →
  work-order + **engine sweep đa mốc** (thiết bị/phiếu/chứng chỉ) → care task; CSAT/bảo hành.
- **P5 — Chăm sóc + Calendar + Cảnh báo**: care Kanban (pool/claim/SLA) + care_interactions +
  calendar/điều phối inspector + **trung tâm cảnh báo** (bell mở rộng: đến hạn/hết hạn/lỗi).
- **P6 — Chứng từ & In ấn**: 8 phiếu + **biên bản kiểm tra/nghiệm thu + chứng chỉ + báo cáo evidence
  (PDF)**; số tự tăng; snapshot; ô ký.
- **P7 — QR Field + Compliance + Báo cáo**: mobile-web quét QR kiểm tra tại chỗ; hồ sơ tuân thủ/site;
  báo cáo doanh thu + tỷ lệ hoàn thành kiểm tra + % tuân thủ + xuất PDF.
- **P8 (sau)**: Google Business Profile · e-invoice · e-signature · Zalo/SMS · AI đánh giá ảnh evidence.

## 6. Đã có vs còn thiếu (tóm tắt)

| Nhóm | Đã có (verified) | Còn thiếu |
|---|---|---|
| Nền tảng/Auth/RBAC/UI | ✅ đầy đủ + đẹp + responsive + dark | — |
| Khách hàng | ✅ CRUD/filter/import/360-cơ bản | timeline đầy đủ, tài sản gắn khách |
| **Tài sản/Địa điểm/Kiểm định** | ❌ | **toàn bộ P2–P3 (đây là mảng lớn nhất còn thiếu)** |
| Dịch vụ/phiếu/engine/care/calendar | 🟡 mới ở plan | code P4–P5 |
| Chứng từ/in | 🟡 plan | code P6 |
| QR field/compliance/báo cáo | ❌ | P7 |
| Tích hợp/AI nâng cao | ❌ | P8 |

## 7. Tính năng tạo khác biệt (ưu tiên làm sớm)
1. **Thiết bị + QR + hạn kiểm định** (P2) — nền để "không mất khách": mọi bình/thiết bị đều có hồ sơ
   và mốc đến hạn.
2. **Engine nhắc đa mốc + auto-alert** (P3–P5) — tự lọc & nhắc: kiểm định đến hạn, chứng chỉ hết hạn,
   thiết bị lỗi → sinh việc chăm sóc.
3. **Quét QR kiểm tra tại hiện trường + evidence ảnh** (P7) — kỹ thuật đứng tại thiết bị quét QR, làm
   checklist, chụp ảnh → hồ sơ tức thì; rất "chuẩn chỉnh".
4. **Compliance/chứng chỉ theo site + báo cáo PDF** (P6–P7) — giá trị pháp lý, giữ khách doanh nghiệp.
