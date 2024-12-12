# API Documentation

## Overview

This API provides a comprehensive backend solution for event and instance management with robust authentication and authorization. It follows RESTful principles and uses JSON for request/response payloads.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Most endpoints require a valid access token to be included in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

### Authentication Flow

1. **Login**: Obtain access token using credentials
2. **Use Token**: Include token in Authorization header
3. **Refresh**: Use refresh token to obtain new access token when expired
4. **Logout**: Invalidate tokens when done

## Common Response Format

All API responses follow a standardized format:

```json
{
  "success": true|false,
  "data": <response_data>,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  },
  "metadata": {
    "timestamp": "2024-12-12T12:00:00Z",
    "requestId": "uuid",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "hasMore": true
    }
  }
}
```

## Core Resources

### Events

Events represent scheduled activities or occurrences within the system.

- `GET /events` - List events
- `GET /events/{id}` - Get event details
- `POST /events` - Create new event
- `PUT /events/{id}` - Update event
- `DELETE /events/{id}` - Delete event

### Instances

Instances are organizational units that can contain events and users.

- `GET /instances` - List instances
- `GET /instances/{id}` - Get instance details
- `POST /instances` - Create new instance
- `PUT /instances/{id}` - Update instance
- `DELETE /instances/{id}` - Delete instance
- `POST /instances/{id}/archive` - Archive instance
- `POST /instances/{id}/restore` - Restore archived instance

### Authentication

Authentication endpoints handle user access and token management.

- `POST /auth/login` - Authenticate user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/change-password` - Change user password

## Error Handling

### Common Error Codes

- `AUTH001` - Authentication required
- `AUTH002` - Invalid credentials
- `AUTH003` - Token expired
- `VAL001` - Validation error
- `NOT001` - Resource not found
- `FOR001` - Forbidden action
- `SRV001` - Server error

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse. Current limits:

- 100 requests per 15-minute window per IP
- Applies to all endpoints
- Returns 429 Too Many Requests when exceeded

## Security Considerations

1. **Token Storage**

   - Store tokens securely
   - Never expose in URLs or logs
   - Use HTTPS in production

2. **Password Requirements**

   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers
   - Special characters recommended

3. **API Keys**
   - Keep secure
   - Rotate regularly
   - Use environment variables

## Pagination

List endpoints support pagination using query parameters:

```
GET /api/v1/events?page=1&limit=10
```

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

## Filtering

Many list endpoints support filtering:

### Events

```
GET /api/v1/events?type=one-time&status=scheduled
```

### Instances

```
GET /api/v1/instances?status=active&type=department
```

## Example Requests

### Login

Request:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "roles": ["user"]
    }
  }
}
```

### Create Event

Request:

```http
POST /api/v1/events
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "title": "Team Meeting",
  "startDate": "2024-12-15T10:00:00Z",
  "endDate": "2024-12-15T11:00:00Z",
  "type": "one-time",
  "description": "Weekly team sync"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Team Meeting",
    "startDate": "2024-12-15T10:00:00Z",
    "endDate": "2024-12-15T11:00:00Z",
    "type": "one-time",
    "description": "Weekly team sync",
    "status": "scheduled",
    "createdAt": "2024-12-12T12:00:00Z",
    "updatedAt": "2024-12-12T12:00:00Z"
  }
}
```

## WebSocket Events (Coming Soon)

Real-time updates will be available for:

- Event status changes
- Instance updates
- System notifications

## Additional Resources

- [Setup Guide](./SETUP.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Docker Guide](./DOCKER.md)
