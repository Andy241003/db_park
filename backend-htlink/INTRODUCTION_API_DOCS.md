# VR Hotel Introduction API - Complete Documentation

## ✅ Đã Hoàn Thành

### 1. Database Schema
**Table**: `vr_hotel_introductions`
```sql
CREATE TABLE `vr_hotel_introductions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint NOT NULL,
  `property_id` bigint NOT NULL,
  `is_displaying` tinyint(1) NOT NULL DEFAULT '1',
  `vr360_link` varchar(500) DEFAULT NULL,
  `vr_title` varchar(255) DEFAULT NULL,
  `content_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vr_intro` (`tenant_id`, `property_id`)
);
```

**Migration File**: `backend/migrations/add_vr_hotel_introductions.sql`
**Status**: ✅ Đã chạy thành công

---

### 2. Backend Model
**File**: `backend/app/models/vr_hotel.py`

```python
class VRHotelIntroduction(SQLModel, table=True):
    __tablename__ = "vr_hotel_introductions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    property_id: int = Field(foreign_key="properties.id", index=True)
    is_displaying: bool = Field(default=True)
    vr360_link: Optional[str] = Field(default=None, max_length=500)
    vr_title: Optional[str] = Field(default=None, max_length=255)
    content_json: Dict[str, Any] = Field(sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
```

---

### 3. Backend API Endpoints
**File**: `backend/app/api/v1/endpoints/vr_hotel_introduction.py`

#### GET `/api/v1/vr-hotel/introduction`
**Description**: Load introduction data for a property

**Headers**:
- `Authorization`: Bearer token (required)
- `X-Tenant-Code`: Tenant code (required)
- `X-Property-Id`: Property ID (required)

**Response**:
```json
{
  "isDisplaying": true,
  "content": {
    "vi": {
      "title": "Giới thiệu",
      "shortDescription": "Mô tả ngắn",
      "detailedContent": "<p>Nội dung chi tiết</p>"
    },
    "en": {
      "title": "Introduction",
      "shortDescription": "Short description",
      "detailedContent": "<p>Detailed content</p>"
    }
  },
  "vr360Link": "https://example.com/vr-tour",
  "vrTitle": "Virtual Tour"
}
```

#### PUT `/api/v1/vr-hotel/introduction`
**Description**: Update introduction data for a property

**Headers**: Same as GET

**Request Body**:
```json
{
  "isDisplaying": true,
  "content": {
    "vi": {
      "title": "string",
      "shortDescription": "string",
      "detailedContent": "string"
    }
  },
  "vr360Link": "string",
  "vrTitle": "string"
}
```

**Response**: Same as GET response

---

### 4. Frontend API Service
**File**: `frontend/src/services/vrHotelApi.ts`

```typescript
export interface IntroductionContent {
  title: string;
  shortDescription: string;
  detailedContent: string;
}

export interface IntroductionData {
  isDisplaying: boolean;
  content: Record<string, IntroductionContent>;
  vr360Link?: string;
  vrTitle?: string;
}

export const vrHotelIntroductionApi = {
  getIntroduction: async (): Promise<IntroductionData> => {
    const response = await vrHotelClient.get('/vr-hotel/introduction');
    return response.data;
  },

  updateIntroduction: async (data: Partial<IntroductionData>): Promise<IntroductionData> => {
    const response = await vrHotelClient.put('/vr-hotel/introduction', data);
    return response.data;
  }
};
```

---

### 5. Frontend Component
**File**: `frontend/src/pages/vr-hotel/Introduction.tsx`

**Features**:
- ✅ Multi-language content management
- ✅ Display toggle (show/hide introduction)
- ✅ VR360 tour link with live iframe preview
- ✅ Rich text editor for detailed content
- ✅ Dynamic language tabs from property locales
- ✅ Save/Reset functionality
- ✅ Loading states and error handling
- ✅ Success notifications

**API Integration**:
```typescript
// Load data on component mount
const response = await vrHotelIntroductionApi.getIntroduction();
setFormData(response);

// Save data on submit
await vrHotelIntroductionApi.updateIntroduction(formData);
```

---

## 📋 Cách Sử Dụng

### Qua Web UI (Recommended)

1. **Login vào VR Hotel Admin**
   ```
   URL: http://localhost:5173
   Email: test@park.com
   Password: test123
   ```

2. **Vào trang Introduction**
   ```
   Navigate: VR Hotel > Introduction
   URL: http://localhost:5173/vr-hotel/introduction
   ```

3. **Thêm nội dung cho từng ngôn ngữ**
   - Chọn language tab (vi, en, etc.)
   - Nhập Title, Short Description, Detailed Content
   - Thêm VR360 link (optional)
   - Click Save

4. **Xem trước VR360**
   - Nhập VR360 link
   - Preview sẽ hiện ngay bên dưới (iframe 500px height)

### Qua API (Developers)

1. **Get Access Token**
   ```bash
   POST /api/v1/auth/login
   Body: { "username": "...", "password": "..." }
   ```

2. **Get Introduction Data**
   ```bash
   GET /api/v1/vr-hotel/introduction
   Headers:
     Authorization: Bearer {token}
     X-Tenant-Code: demo
     X-Property-Id: 10
   ```

3. **Update Introduction Data**
   ```bash
   PUT /api/v1/vr-hotel/introduction
   Headers: Same as above
   Body: { "isDisplaying": true, "content": {...}, ... }
   ```

---

## 🔍 API Documentation

**Swagger UI**: http://localhost:8000/api/v1/docs

Tìm section "vr-hotel" và xem các endpoints:
- `GET /api/v1/vr-hotel/introduction`
- `PUT /api/v1/vr-hotel/introduction`

---

## ✅ Verification Checklist

- [x] Database table created
- [x] Migration ran successfully
- [x] Backend model defined
- [x] API endpoints implemented
- [x] Authentication & authorization checks
- [x] Frontend API service created
- [x] Frontend component integrated
- [x] Multi-language support working
- [x] VR360 preview working
- [x] Save/Load from database working
- [x] API documentation available

---

## 🚀 Status

**All systems operational!** ✅

The Introduction page is now fully functional with complete backend API support.
