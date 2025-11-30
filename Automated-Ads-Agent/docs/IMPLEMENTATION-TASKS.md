# Implementation Tasks

## Phase 1: Security Foundation

### Task 1.1: Rate Limiting
*(Being implemented by Agent 1)*

### Task 1.2: Production-Grade Authentication

#### Overview
Implement a secure, production-ready authentication system with:
- Password hashing with bcrypt (cost factor 12+)
- PostgreSQL-backed sessions
- Account lockout after failed attempts
- Secure cookie configuration

#### Requirements

##### Password Security
- Hash passwords with bcrypt, minimum cost factor 12
- Minimum password length: 8 characters
- Never expose password hashes in API responses

##### Session Management
- Store sessions in PostgreSQL (not memory)
- Session ID in HttpOnly, Secure, SameSite=Strict cookie
- 24-hour session expiration
- Invalidate session on logout

##### Account Security
- Track failed login attempts per user
- Lock account after 5 consecutive failed attempts
- 15-minute lockout duration
- Reset failed attempts on successful login

#### API Endpoints

##### POST /api/auth/register
Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
Response (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

##### POST /api/auth/login
Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
Response (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```
Sets HttpOnly cookie with session ID.

##### POST /api/auth/logout
Response (200):
```json
{
  "message": "Logged out successfully"
}
```
Clears session and cookie.

##### GET /api/auth/me
Response (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### Database Schema

##### users table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique, indexed |
| passwordHash | VARCHAR(255) | bcrypt hash |
| failedLoginAttempts | INTEGER | Default 0 |
| lockedUntil | TIMESTAMP | Null if not locked |
| createdAt | TIMESTAMP | Default now() |
| updatedAt | TIMESTAMP | Default now() |

##### sessions table
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) | Session ID (primary key) |
| userId | UUID | Foreign key to users |
| expiresAt | TIMESTAMP | Session expiration |
| createdAt | TIMESTAMP | Default now() |

#### Protected Routes
These routes require valid session:
- POST /api/transform
- POST /api/generations/:id/edit
- DELETE /api/generations/:id
- POST /api/products
- DELETE /api/products/:id
- DELETE /api/products

#### Security Configuration
- Use helmet() for security headers
- Use cookieParser() for cookie handling
- Set secure cookie options in production
