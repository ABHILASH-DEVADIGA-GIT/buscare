# BusCare API Documentation

## Base URL
```
Development: http://localhost:8001/api
Production: https://your-domain.com/api
```

## Authentication
All authenticated endpoints require a Bearer token:
```
Authorization: Bearer <jwt_token>
```

---

## Authentication Endpoints

### Login
```http
POST /api/auth/login
```
**Request:**
```json
{
  "client_id": "demo-client-001",
  "email": "admin@demo.com",
  "password": "admin123"
}
```
**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "uuid",
    "email": "admin@demo.com",
    "name": "Admin User",
    "role": "ADMIN",
    "client_id": "demo-client-001",
    "active": true,
    "preferred_language": "EN"
  },
  "client": {
    "client_id": "demo-client-001",
    "company_name": "Demo Transport Company",
    "logo": "base64_image_string",
    "theme_color": "#1E3A8A"
  }
}
```

### Register User
```http
POST /api/auth/register
Authorization: Bearer <token>
```
**Request:**
```json
{
  "email": "newuser@demo.com",
  "password": "password123",
  "name": "New User",
  "role": "DRIVER",
  "client_id": "demo-client-001",
  "active": true
}
```

### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

### Update Language
```http
PUT /api/users/language?language=KN
Authorization: Bearer <token>
```

---

## Bus Endpoints

### List Buses
```http
GET /api/buses
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bus_id": "uuid",
      "bus_number": "TN-01-AB-1234",
      "registration_number": "TN01AB1234",
      "model": "Ashok Leyland",
      "capacity": 50,
      "client_id": "demo-client-001",
      "active": true,
      "created_date": "2026-03-01T10:00:00"
    }
  ]
}
```

### Create Bus
```http
POST /api/buses
Authorization: Bearer <token>
```
**Request:**
```json
{
  "bus_number": "TN-01-XY-5678",
  "registration_number": "TN01XY5678",
  "model": "Tata Motors",
  "capacity": 45,
  "client_id": "demo-client-001",
  "active": true
}
```

### List All Buses (Platform Admin)
```http
GET /api/buses/all
Authorization: Bearer <token>
```

---

## Inspection Endpoints

### List Inspections
```http
GET /api/inspections?status=FAILED
Authorization: Bearer <token>
```
**Query Parameters:**
- `status`: PASSED, FAILED, ASSIGNED, IN_PROGRESS, RESOLVED, FIXED (optional)

### Get Inspection Details
```http
GET /api/inspections/{inspection_id}
Authorization: Bearer <token>
```

### Create Inspection
```http
POST /api/inspections
Authorization: Bearer <token>
```
**Request:**
```json
{
  "bus_id": "uuid",
  "driver_id": "uuid",
  "client_id": "demo-client-001",
  "details": [
    {
      "question_id": "uuid",
      "question_text": "Check tire pressure",
      "question_type": "PASS_FAIL",
      "answer": "Pass",
      "comment": null,
      "image_url": null,
      "audio_url": null,
      "video_url": null
    }
  ]
}
```

### Assign Mechanic
```http
POST /api/inspections/assign-mechanic
Authorization: Bearer <token>
```
**Request:**
```json
{
  "inspection_id": "uuid",
  "mechanic_id": "uuid",
  "assigned_by": "uuid"
}
```

### Fix Inspection Detail
```http
POST /api/inspections/fix-detail
Authorization: Bearer <token>
```

### Quick Fix All
```http
POST /api/inspections/quick-fix
Authorization: Bearer <token>
```

### Verify Inspection
```http
POST /api/inspections/verify
Authorization: Bearer <token>
```

### Add Problem
```http
POST /api/inspections/add-problem
Authorization: Bearer <token>
```

---

## Feedback Endpoints

### List Feedback
```http
GET /api/feedback
Authorization: Bearer <token>
```

### Submit Feedback (Public - No Auth)
```http
POST /api/feedback
```
**Request:**
```json
{
  "bus_id": "uuid",
  "client_id": "demo-client-001",
  "description": "Great service!",
  "image_url": null,
  "want_update": true,
  "email": "passenger@email.com"
}
```

### Resolve Feedback
```http
POST /api/feedback/resolve
Authorization: Bearer <token>
```

---

## Alert Endpoints

### List Alerts
```http
GET /api/alerts?status_filter=EXPIRED
Authorization: Bearer <token>
```

### Create Alert
```http
POST /api/alerts
Authorization: Bearer <token>
```

### Update Alert
```http
POST /api/alerts/update
Authorization: Bearer <token>
```

---

## Financial Endpoints

### List Collections
```http
GET /api/collections?start_date=2026-03-01&end_date=2026-03-31&bus_id=uuid
Authorization: Bearer <token>
```

### Add Collection
```http
POST /api/collections
Authorization: Bearer <token>
```

### List Expense Categories
```http
GET /api/expense-master
Authorization: Bearer <token>
```

### Add Expense Category
```http
POST /api/expense-master
Authorization: Bearer <token>
```

### List Expenses
```http
GET /api/expenses?start_date=2026-03-01&end_date=2026-03-31
Authorization: Bearer <token>
```

### Add Expense
```http
POST /api/expenses
Authorization: Bearer <token>
```

### Get Profit Report
```http
GET /api/profit/bus-wise?start_date=2026-03-01&end_date=2026-03-31
Authorization: Bearer <token>
```

---

## Dashboard Endpoints

### Get Dashboard Metrics
```http
GET /api/dashboard/metrics?start_date=2026-03-01&end_date=2026-03-07&bus_id=all
Authorization: Bearer <token>
```

---

## Platform Admin Endpoints

### List All Clients
```http
GET /api/clients/all
Authorization: Bearer <token>
```

### Create Client
```http
POST /api/clients
Authorization: Bearer <token>
```

### Update Client
```http
PUT /api/clients
Authorization: Bearer <token>
```

### List All Users
```http
GET /api/users/all
Authorization: Bearer <token>
```

### Update User
```http
PUT /api/users/{user_id}
Authorization: Bearer <token>
```

### Change User Password
```http
PUT /api/users/{user_id}/password?new_password=newpass123
Authorization: Bearer <token>
```

---

## Configuration Endpoints

### Inspection Questions
```http
GET /api/config/inspection-questions?client_id=uuid
POST /api/config/inspection-questions
PUT /api/config/inspection-questions
DELETE /api/config/inspection-questions/{question_id}
```

### Expense Categories
```http
GET /api/config/expense-categories?client_id=uuid
POST /api/config/expense-categories
PUT /api/config/expense-categories
```

### Alert Configurations
```http
GET /api/config/alerts?client_id=uuid
POST /api/config/alerts
DELETE /api/config/alerts/{alert_config_id}
```

---

## Utility Endpoints

### Health Check
```http
GET /api/health
```

### Upload File
```http
POST /api/upload
Content-Type: multipart/form-data
```

### Get Checklist Questions
```http
GET /api/checklist
Authorization: Bearer <token>
```

### Get Mechanics
```http
GET /api/mechanics
Authorization: Bearer <token>
```

### Seed Demo Data
```http
POST /api/seed
```

---

## Error Responses

```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
