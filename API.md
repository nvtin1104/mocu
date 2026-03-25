# API - REST API Documentation

Complete reference for MOCU REST API endpoints, authentication, and examples.

---

## 📋 Base URL

**Development:**
```
http://localhost:8788
```

**Production:**
```
https://mocu-api.<cloudflare-account>.workers.dev
```

---

## 🔐 Authentication

### JWT Token

All protected endpoints require `Authorization` header with JWT token:

```
Authorization: Bearer <JWT_TOKEN>
```

### Get JWT Token

**Endpoint:** `POST /auth/telegram`

Authenticate with Telegram Chat ID to receive JWT token.

```bash
curl -X POST http://localhost:8788/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "123456789"}'
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "user-uuid-here"
}
```

**Token Validity:** 24 hours

**Error Responses:**
- `400 Bad Request` - Missing or invalid chat_id
- `429 Too Many Requests` - Rate limit exceeded (10 attempts/hour)
- `500 Internal Server Error` - Server error

---

## 📊 Health Check

### GET /health

Server health check endpoint (public, no auth required).

```bash
curl http://localhost:8788/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-03-25T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 📝 Notes API

### GET /api/notes

List all user's notes.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Query Parameters:** None

```bash
curl -X GET http://localhost:8788/api/notes \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**
```json
[
  {
    "id": "note-uuid-1",
    "user_id": "user-uuid",
    "title": "My First Note",
    "content": "This is the content of my note",
    "tags": "personal,important",
    "is_archived": 0,
    "created_at": "2024-03-25T08:30:00.000Z",
    "updated_at": "2024-03-25T09:15:00.000Z"
  },
  {
    "id": "note-uuid-2",
    "user_id": "user-uuid",
    "title": "Another Note",
    "content": "Content here",
    "tags": "work",
    "is_archived": 0,
    "created_at": "2024-03-25T09:00:00.000Z",
    "updated_at": "2024-03-25T09:00:00.000Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing JWT token
- `500 Internal Server Error` - Database error

---

### POST /api/notes

Create a new note.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Meeting Notes",
  "content": "Discussed project timeline and deliverables",
  "tags": "work,meeting"  // Optional
}
```

**Body Validation:**
- `title` (required): string, min 1 char, max 255 chars
- `content` (required): string, min 1 char
- `tags` (optional): string, comma-separated tags

```bash
curl -X POST http://localhost:8788/api/notes \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting Notes",
    "content": "Discussed project timeline",
    "tags": "work,meeting"
  }'
```

**Response (200 OK):**
```json
{
  "id": "note-uuid-new",
  "user_id": "user-uuid",
  "title": "Meeting Notes",
  "content": "Discussed project timeline",
  "tags": "work,meeting",
  "is_archived": 0,
  "created_at": "2024-03-25T10:00:00.000Z",
  "updated_at": "2024-03-25T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid JWT
- `500 Internal Server Error` - Database error

---

### GET /api/notes/:id

Retrieve a specific note.

**URL Parameters:**
- `id` (required): Note UUID

```bash
curl -X GET http://localhost:8788/api/notes/note-uuid-1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**
```json
{
  "id": "note-uuid-1",
  "user_id": "user-uuid",
  "title": "My First Note",
  "content": "This is the content",
  "tags": "personal",
  "is_archived": 0,
  "created_at": "2024-03-25T08:30:00.000Z",
  "updated_at": "2024-03-25T09:15:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid JWT
- `404 Not Found` - Note doesn't exist or user doesn't own it
- `500 Internal Server Error` - Database error

---

### PUT /api/notes/:id

Update an existing note.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**URL Parameters:**
- `id` (required): Note UUID

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content here"
}
```

**Body Validation:**
- `title` (required): string, min 1 char, max 255 chars
- `content` (required): string, min 1 char

```bash
curl -X PUT http://localhost:8788/api/notes/note-uuid-1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content"
  }'
```

**Response (200 OK):**
```json
{
  "id": "note-uuid-1",
  "user_id": "user-uuid",
  "title": "Updated Title",
  "content": "Updated content",
  "tags": "personal",
  "is_archived": 0,
  "created_at": "2024-03-25T08:30:00.000Z",
  "updated_at": "2024-03-25T10:05:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid JWT
- `404 Not Found` - Note doesn't exist
- `500 Internal Server Error` - Database error

---

### DELETE /api/notes/:id

Delete a note.

**URL Parameters:**
- `id` (required): Note UUID

```bash
curl -X DELETE http://localhost:8788/api/notes/note-uuid-1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (204 No Content):**
```
(empty body)
```

**Error Responses:**
- `401 Unauthorized` - Invalid JWT
- `404 Not Found` - Note doesn't exist
- `500 Internal Server Error` - Database error

---

## ✅ Todos API

### GET /api/todos

List all user's todos with optional status filtering.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `status` (optional): "pending" or "completed"

**Examples:**

Get all todos:
```bash
curl -X GET http://localhost:8788/api/todos \
  -H "Authorization: Bearer <TOKEN>"
```

Get only pending todos:
```bash
curl -X GET "http://localhost:8788/api/todos?status=pending" \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**
```json
[
  {
    "id": "todo-uuid-1",
    "user_id": "user-uuid",
    "title": "Complete project report",
    "status": "pending",
    "created_at": "2024-03-25T08:00:00.000Z",
    "updated_at": "2024-03-25T08:00:00.000Z"
  },
  {
    "id": "todo-uuid-2",
    "user_id": "user-uuid",
    "title": "Send email to team",
    "status": "completed",
    "created_at": "2024-03-25T07:00:00.000Z",
    "updated_at": "2024-03-25T07:30:00.000Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Invalid JWT
- `500 Internal Server Error` - Database error

---

### POST /api/todos

Create a new todo.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Complete project report"
}
```

**Body Validation:**
- `title` (required): string, min 1 char, max 255 chars

```bash
curl -X POST http://localhost:8788/api/todos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project report"
  }'
```

**Response (200 OK):**
```json
{
  "id": "todo-uuid-new",
  "user_id": "user-uuid",
  "title": "Complete project report",
  "status": "pending",
  "created_at": "2024-03-25T10:00:00.000Z",
  "updated_at": "2024-03-25T10:00:00.000Z"
}
```

**Default Values:**
- `status`: "pending" (always)
- `created_at`: Current timestamp
- `updated_at`: Current timestamp

**Error Responses:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid JWT
- `500 Internal Server Error` - Database error

---

### PUT /api/todos/:id

Update a todo (change title or status).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**URL Parameters:**
- `id` (required): Todo UUID

**Request Body:**
```json
{
  "title": "Updated todo title",
  "status": "completed"
}
```

**Body Validation:**
- `title` (optional): string, min 1 char, max 255 chars
- `status` (optional): "pending" or "completed"

```bash
# Update title
curl -X PUT http://localhost:8788/api/todos/todo-uuid-1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated title"}'

# Update status
curl -X PUT http://localhost:8788/api/todos/todo-uuid-1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

**Response (200 OK):**
```json
{
  "id": "todo-uuid-1",
  "user_id": "user-uuid",
  "title": "Updated title",
  "status": "completed",
  "created_at": "2024-03-25T08:00:00.000Z",
  "updated_at": "2024-03-25T10:05:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status value
- `401 Unauthorized` - Invalid JWT
- `404 Not Found` - Todo doesn't exist
- `500 Internal Server Error` - Database error

---

### DELETE /api/todos/:id

Delete a todo.

**URL Parameters:**
- `id` (required): Todo UUID

```bash
curl -X DELETE http://localhost:8788/api/todos/todo-uuid-1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (204 No Content):**
```
(empty body)
```

**Error Responses:**
- `401 Unauthorized` - Invalid JWT
- `404 Not Found` - Todo doesn't exist
- `500 Internal Server Error` - Database error

---

## 🤖 Telegram Webhook

### POST /api/telegram/webhook

**⚠️ Internal endpoint** - Only Telegram servers should send to this URL.

Telegram sends updates to this webhook when users message the bot.

**Signature Verification:**
```
X-Telegram-Bot-Api-Secret-Token: <HMAC-SHA256 signature>
```

Backend verifies signature using `TELEGRAM_SECRET` before processing.

**Expected Input:** Telegram Update object

**Processing:**
1. Verify signature
2. Extract message text
3. Detect intent (CREATE_NOTE, CREATE_TODO, etc.)
4. Execute action (create note/todo in database)
5. Send response to Telegram

See bot implementation in `backend/src/routes/telegram.ts` for details.

---

## ⚙️ Telegram Configuration

### GET /api/telegram/set-webhook

Register webhook URL with Telegram Bot API.

**Usage (after deployment):**
```bash
curl -X POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mocu-api.<account>.workers.dev/api/telegram/webhook",
    "secret_token": "<TELEGRAM_SECRET>"
  }'
```

**Response from Telegram:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

**Verify webhook:**
```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

---

## 📊 Error Handling

### Standard Error Response

All errors return JSON with this format:

```json
{
  "error": "Error message here",
  "timestamp": "2024-03-25T10:00:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|---|---|---|
| `200` | OK | Request successful |
| `204` | No Content | DELETE successful |
| `400` | Bad Request | Invalid input/validation failed |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server/database error |

---

## 🔄 Rate Limiting

**Telegram Messages:**
- Limit: 20 messages per hour per user
- Tracked by: user_id from Telegram
- Key format: `ratelimit:tg:{user_id}`

**Login Attempts:**
- Limit: 10 attempts per hour per chat_id
- Tracked by: chat_id
- Key format: `ratelimit:auth:{chat_id}`

**Gemini API:**
- Limit: 1000 calls per month (Google's free tier)
- Tracked by: Google Cloud project

---

## 📝 Request/Response Examples

### Example 1: Complete Login & Create Note Flow

```bash
# 1. Get your Telegram Chat ID
# Message @userinfobot on Telegram to get your numeric ID
# Example ID: 123456789

# 2. Login to get JWT token
TOKEN=$(curl -X POST http://localhost:8788/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "123456789"}' | jq -r '.token')

echo "Token: $TOKEN"

# 3. Create a note
curl -X POST http://localhost:8788/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is test content",
    "tags": "test"
  }' | jq

# 4. List all notes
curl -X GET http://localhost:8788/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. Create a todo
curl -X POST http://localhost:8788/api/todos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Complete API testing"}' | jq

# 6. Mark todo as completed
TODO_ID="<returned-id-from-step-5>"
curl -X PUT http://localhost:8788/api/todos/$TODO_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' | jq
```

---

### Example 2: Using with Postman

1. **Create environment variables:**
   - `base_url` = `http://localhost:8788`
   - `token` = (leave empty, we'll set it dynamically)

2. **Login request:**
   - Method: `POST`
   - URL: `{{base_url}}/auth/telegram`
   - Body (JSON):
     ```json
     {"chat_id": "123456789"}
     ```
   - Tests tab (save token):
     ```javascript
     var jsonData = pm.response.json();
     pm.environment.set("token", jsonData.token);
     ```

3. **Create note request:**
   - Method: `POST`
   - URL: `{{base_url}}/api/notes`
   - Headers:
     - `Authorization: Bearer {{token}}`
     - `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "title": "Test Note",
       "content": "Test content"
     }
     ```

---

## 🔗 Related Documentation

- **[SETUP.md](./SETUP.md)** - Development setup & testing locally
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to production
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design

---

**API Version:** 1.0.0
**Last Updated:** March 2026
**Status:** Stable
