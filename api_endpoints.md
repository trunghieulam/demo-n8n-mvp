# N8N MVP - API Endpoints

## API Overview

**Base URL:** `/api/v1`  
**Authentication:** JWT token in `Authorization: Bearer <token>` header  
**Content-Type:** `application/json`

---

## Endpoints by Resource

### 1. Authentication

#### `POST /auth/login`
Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Errors:**
- `401` - Invalid email or password

---

#### `POST /auth/logout`
Invalidate current JWT token (optional; can use token expiry).

**Response (200):**
```json
{ "message": "Logged out successfully" }
```

---

#### `POST /auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Errors:**
- `400` - Email already exists
- `400` - Invalid email format or weak password

---

#### `GET /auth/me`
Get current authenticated user (alternative to `/users/me`).

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 2. Users

#### `GET /users/me`
Get current authenticated user profile.

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

#### `PATCH /users/me`
Update current user profile.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Smith"
}
```

---

#### `PATCH /users/me/password`
Change user password.

**Request:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

**Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

**Errors:**
- `400` - Current password is incorrect
- `400` - New password does not meet requirements

---

#### `DELETE /users/me`
Delete user account and all associated data.

**Response (204):** No content

**Notes:**
- Permanently deletes user account, workflows, executions, credentials, and tags
- Cannot be undone

---

### 3. Workflows

#### `GET /workflows`
List all workflows for the current user.

**Query Parameters:**
- `limit` (number, default: 20) - Max results per page
- `offset` (number, default: 0) - Pagination offset
- `tag` (string, optional) - Filter by tag name

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Send Slack Notification",
      "description": "Send message to Slack when webhook is triggered",
      "isActive": true,
      "tags": ["important", "slack-related"],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T15:45:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

---

#### `POST /workflows`
Create a new workflow.

**Request:**
```json
{
  "name": "Send Slack Notification",
  "description": "Send message to Slack when webhook is triggered",
  "nodes": [
    {
      "id": "node_1",
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook",
      "position": { "x": 0, "y": 0 },
      "parameters": {
        "path": "my-webhook"
      }
    }
  ],
  "connections": {
    "node_1": {
      "main": [
        [
          {
            "node": "node_2",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "timeout": 300
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Send Slack Notification",
  "description": "...",
  "nodes": [...],
  "connections": {...},
  "isActive": false,
  "createdAt": "2024-01-20T15:45:00Z",
  "updatedAt": "2024-01-20T15:45:00Z"
}
```

**Errors:**
- `400` - Invalid workflow structure (missing nodes/connections)
- `400` - Duplicate workflow name

---

#### `GET /workflows/{workflowId}`
Get workflow details including full node and connection definitions.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Send Slack Notification",
  "description": "...",
  "nodes": [...],
  "connections": {...},
  "isActive": true,
  "staticData": { "lastExecuted": "2024-01-20T15:45:00Z" },
  "tags": ["important"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T15:45:00Z"
}
```

**Errors:**
- `404` - Workflow not found
- `403` - Access denied

---

#### `PATCH /workflows/{workflowId}`
Update workflow (name, description, nodes, connections, settings).

**Request:**
```json
{
  "name": "Updated Workflow Name",
  "description": "New description",
  "nodes": [...],
  "connections": {...}
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Workflow Name",
  "description": "New description",
  "nodes": [...],
  "connections": {...},
  "updatedAt": "2024-01-20T16:00:00Z"
}
```

**Notes:**
- Cannot update `isActive` via PATCH (use dedicated endpoints)
- Validates workflow structure before saving

---

#### `DELETE /workflows/{workflowId}`
Delete a workflow and all its executions.

**Response (204):** No content

**Errors:**
- `404` - Workflow not found
- `403` - Access denied

---

#### `POST /workflows/{workflowId}/activate`
Activate a workflow (mark as ready for execution).

**Response (200):**
```json
{
  "id": "uuid",
  "isActive": true,
  "updatedAt": "2024-01-20T16:00:00Z"
}
```

**Notes:**
- Only valid workflows can be activated
- Validates all node configurations and credentials are available

---

#### `POST /workflows/{workflowId}/deactivate`
Deactivate a workflow (stop webhooks and triggers).

**Response (200):**
```json
{
  "id": "uuid",
  "isActive": false,
  "updatedAt": "2024-01-20T16:00:00Z"
}
```

---

#### `POST /workflows/{workflowId}/execute`
Execute workflow immediately (manual/test execution).

**Request:**
```json
{
  "testData": { "key": "value" } // optional input data for workflow
}
```

**Response (202):** Accepted - execution started
```json
{
  "executionId": "uuid",
  "status": "running",
  "mode": "manual",
  "startedAt": "2024-01-20T16:00:00Z"
}
```

**Errors:**
- `404` - Workflow not found
- `400` - Workflow not active or has validation errors
- `409` - Another execution already running (optional constraint)

---

#### `POST /workflows/{workflowId}/duplicate`
Create a copy of the workflow with a new name.

**Request:**
```json
{
  "name": "Copy of Send Slack Notification"
}
```

**Response (201):**
```json
{
  "id": "new-uuid",
  "name": "Copy of Send Slack Notification",
  "nodes": [...],
  "connections": {...}
}
```

---

#### `GET /workflows/templates`
List available workflow templates.

**Response (200):**
```json
{
  "data": [
    {
      "id": "template-1",
      "name": "Weather Alert",
      "description": "Get weather alerts via webhook",
      "nodes": [...],
      "connections": {...}
    }
  ]
}
```

---

#### `POST /workflows/from-template`
Create a new workflow from a template.

**Request:**
```json
{
  "templateId": "template-1",
  "name": "My Weather Alert",
  "description": "Custom description"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "My Weather Alert",
  "description": "Custom description",
  "nodes": [...],
  "connections": {...},
  "isActive": false,
  "createdAt": "2024-01-20T15:45:00Z"
}
```

---

### 4. Executions

#### `GET /executions`
List execution history for all workflows or specific workflow.

**Query Parameters:**
- `workflowId` (string, optional) - Filter by workflow ID
- `status` (enum, optional) - Filter by status: `success`, `error`, `running`
- `limit` (number, default: 20)
- `offset` (number, default: 0)
- `sort` (string, default: "startedAt:desc") - Sort by field

**Response (200):**
```json
{
  "data": [
    {
      "id": "exec-uuid",
      "workflowId": "wf-uuid",
      "workflowName": "Send Slack Notification",
      "status": "success",
      "mode": "manual",
      "startedAt": "2024-01-20T16:00:00Z",
      "finishedAt": "2024-01-20T16:00:05Z",
      "executionTime": 5000, // milliseconds
      "nodeCount": 3
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

#### `GET /executions/{executionId}`
Get full details of a specific execution.

**Response (200):**
```json
{
  "id": "exec-uuid",
  "workflowId": "wf-uuid",
      "workflowName": "Send Slack Notification",
      "userId": "user-uuid",
      "status": "success",
      "mode": "webhook",
      "startedAt": "2024-01-20T16:00:00Z",
  "finishedAt": "2024-01-20T16:00:05Z",
  "executionData": {
    "resultData": {
      "runData": {
        "node_1": [
          {
            "startTime": 1000,
            "executionTime": 50,
            "source": [],
            "executionStatus": "success",
            "data": {
              "main": [
                {
                  "json": { "body": "{...}", "statusCode": 200 },
                  "binary": null
                }
              ]
            }
          }
        ],
        "node_2": [...]
      }
    }
  },
  "workflowData": {
    "nodes": [...],
    "connections": {...}
  }
}
```

**Errors:**
- `404` - Execution not found
- `403` - Access denied

---

#### `POST /executions/{executionId}/retry`
Retry a failed execution with the same workflow and input data.

**Response (202):** Accepted - new execution started
```json
{
  "executionId": "new-exec-uuid",
  "status": "running",
  "retryOf": "original-exec-uuid",
  "mode": "manual",
  "startedAt": "2024-01-20T16:10:00Z"
}
```

**Errors:**
- `404` - Original execution not found
- `400` - Cannot retry a successful or running execution

---

#### `POST /executions/{executionId}/stop`
Stop a running execution.

**Response (200):**
```json
{
  "id": "exec-uuid",
  "status": "error",
  "stoppedAt": "2024-01-20T16:00:30Z"
}
```

**Errors:**
- `404` - Execution not found
- `400` - Execution is not running

---

#### `DELETE /executions/{executionId}`
Delete a single execution.

**Response (204):** No content

---

### 5. Credentials

#### `GET /credentials`
List all credentials for the current user.

**Query Parameters:**
- `type` (string, optional) - Filter by credential type (e.g., "httpBasicAuth", "slackOAuth2Api")
- `limit` (number, default: 20)
- `offset` (number, default: 0)

**Response (200):**
```json
{
  "data": [
    {
      "id": "cred-uuid",
      "name": "Slack API Key",
      "type": "slackOAuth2Api",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 20,
    "offset": 0
  }
}
```

**Notes:**
- Sensitive data (the actual credentials) is never returned in list view

---

#### `POST /credentials`
Create a new credential.

**Request:**
```json
{
  "name": "Slack API Key",
  "type": "slackOAuth2Api",
  "data": {
    "token": "xoxb-1234567890..."
  }
}
```

**Response (201):**
```json
{
  "id": "cred-uuid",
  "name": "Slack API Key",
  "type": "slackOAuth2Api",
  "isActive": true,
  "createdAt": "2024-01-20T15:45:00Z"
}
```

**Notes:**
- Data is encrypted before storage
- Type determines which fields are required

**Errors:**
- `400` - Missing required fields for credential type
- `400` - Invalid data format for credential type

---

#### `GET /credentials/{credentialId}`
Get credential metadata (does NOT return decrypted data for security).

**Response (200):**
```json
{
  "id": "cred-uuid",
  "name": "Slack API Key",
  "type": "slackOAuth2Api",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Notes:**
- Decrypted data only available during workflow execution (internal use)

---

#### `PATCH /credentials/{credentialId}`
Update credential name or data.

**Request:**
```json
{
  "name": "Slack API Key - Production",
  "data": {
    "token": "xoxb-new-token..."
  }
}
```

**Response (200):**
```json
{
  "id": "cred-uuid",
  "name": "Slack API Key - Production",
  "type": "slackOAuth2Api",
  "updatedAt": "2024-01-20T16:00:00Z"
}
```

---

#### `DELETE /credentials/{credentialId}`
Delete a credential.

**Response (204):** No content

**Notes:**
- Workflows using this credential will show as misconfigured
- No automatic cleanup; user must update workflows

---

#### `POST /credentials/{credentialId}/test`
Test if credential is valid (connect to service and verify).

**Response (200):**
```json
{
  "success": true,
  "message": "Credential is valid"
}
```

**Response (200) - Failed:**
```json
{
  "success": false,
  "error": "Authentication failed: Invalid token"
}
```

---

### 6. Webhooks

#### `GET /webhooks`
List all webhooks (mainly for admin/testing purposes).

**Query Parameters:**
- `workflowId` (string, optional) - Filter by workflow

**Response (200):**
```json
{
  "data": [
    {
      "id": "webhook-uuid",
      "workflowId": "wf-uuid",
      "nodeId": "node_1",
      "method": "POST",
      "webhookPath": "/webhook/abc123def",
      "fullUrl": "https://n8n.example.com/webhook/abc123def",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

#### `GET /webhooks/{workflowId}/{nodeId}`
Get webhook details for a specific node.

**Response (200):**
```json
{
  "id": "webhook-uuid",
  "workflowId": "wf-uuid",
  "nodeId": "node_1",
  "method": "POST",
  "webhookPath": "/webhook/abc123def",
  "fullUrl": "https://n8n.example.com/webhook/abc123def",
  "isActive": true
}
```

---

#### `POST /webhooks/{workflowId}/{nodeId}/test`
Send a test webhook request (captures the request without executing workflow).

**Request:**
```json
{
  "method": "POST",
  "body": { "test": "data" },
  "headers": { "Authorization": "Bearer token" }
}
```

**Response (200):**
```json
{
  "success": true,
  "capturedRequest": {
    "method": "POST",
    "body": { "test": "data" },
    "headers": { "Authorization": "Bearer token" },
    "query": {},
    "timestamp": "2024-01-20T16:00:00Z"
  }
}
```

**Notes:**
- Test webhook captures request for inspection
- Does NOT trigger workflow execution

---

### 7. Tags

#### `GET /tags`
List all tags for the current user.

**Response (200):**
```json
{
  "data": [
    {
      "id": "tag-uuid",
      "name": "important",
      "workflowCount": 5,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

#### `POST /tags`
Create a new tag.

**Request:**
```json
{
  "name": "important"
}
```

**Response (201):**
```json
{
  "id": "tag-uuid",
  "name": "important",
  "workflowCount": 0,
  "createdAt": "2024-01-20T15:45:00Z"
}
```

**Errors:**
- `400` - Tag name already exists for user

---

#### `PATCH /tags/workflows/{workflowId}`
Add or remove tags from a workflow.

**Request:**
```json
{
  "add": ["tag-uuid-1", "tag-uuid-2"],
  "remove": ["tag-uuid-3"]
}
```

**Response (200):**
```json
{
  "id": "wf-uuid",
  "tags": ["important", "slack-related"],
  "updatedAt": "2024-01-20T16:00:00Z"
}
```

**Notes:**
- `add` and `remove` accept arrays of tag IDs
- Tags are added/removed by ID, not by name

---

#### `DELETE /tags/{tagId}`
Delete a tag (removes association from all workflows).

**Response (204):** No content

---

### 8. Node Types

#### `GET /node-types`
Get list of available node types for the current user.

**Response (200):**
```json
{
  "data": [
    {
      "name": "n8n-nodes-base.webhook",
      "displayName": "Webhook",
      "description": "Receive HTTP requests",
      "icon": "webhook",
      "inputs": ["main"],
      "outputs": ["main"],
      "properties": [
        {
          "displayName": "Path",
          "name": "path",
          "type": "string",
          "required": true,
          "description": "Webhook path"
        }
      ]
    },
    {
      "name": "n8n-nodes-base.http",
      "displayName": "HTTP Request",
      "description": "Make HTTP requests",
      ...
    }
  ]
}
```

---

#### `POST /node-types/test-connection`
Test connection for a node type (e.g., HTTP node with credentials).

**Request:**
```json
{
  "nodeType": "n8n-nodes-base.http",
  "url": "https://api.example.com/test",
  "method": "GET",
  "credentialId": "cred-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

**Response (200) - Failed:**
```json
{
  "success": false,
  "error": "Connection failed: 401 Unauthorized"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  }
}
```

---

## Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token is obtained from `POST /auth/login` and should be stored in localStorage/sessionStorage on frontend.

---

## Pagination

List endpoints support pagination via query parameters:
- `limit` - Number of results per page (default: 20, max: 100)
- `offset` - Number of results to skip (default: 0)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Rate Limiting (Optional for MVP)

Consider adding rate limiting for production:
- 100 requests per minute per user
- 10 workflow executions per minute per user

---

## MVP Endpoint Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Get JWT token |
| POST | `/auth/register` | Create account |
| GET | `/auth/me` | Get current user |
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |
| PATCH | `/users/me/password` | Change password |
| DELETE | `/users/me` | Delete account |
| GET | `/workflows` | List workflows |
| POST | `/workflows` | Create workflow |
| GET | `/workflows/templates` | List templates |
| POST | `/workflows/from-template` | Create from template |
| GET | `/workflows/{id}` | Get workflow |
| PATCH | `/workflows/{id}` | Update workflow |
| DELETE | `/workflows/{id}` | Delete workflow |
| POST | `/workflows/{id}/duplicate` | Duplicate workflow |
| POST | `/workflows/{id}/activate` | Activate workflow |
| POST | `/workflows/{id}/deactivate` | Deactivate workflow |
| POST | `/workflows/{id}/execute` | Execute workflow |
| GET | `/executions` | List executions |
| GET | `/executions/{id}` | Get execution details |
| POST | `/executions/{id}/retry` | Retry execution |
| POST | `/executions/{id}/stop` | Stop execution |
| DELETE | `/executions/{id}` | Delete execution |
| GET | `/credentials` | List credentials |
| POST | `/credentials` | Create credential |
| GET | `/credentials/{id}` | Get credential |
| PATCH | `/credentials/{id}` | Update credential |
| DELETE | `/credentials/{id}` | Delete credential |
| POST | `/credentials/{id}/test` | Test credential |
| GET | `/node-types` | List available nodes |
| POST | `/node-types/test-connection` | Test node connection |
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| PATCH | `/tags/workflows/{id}` | Add/remove tags |
| DELETE | `/tags/{id}` | Delete tag |
| GET | `/webhooks` | List webhooks |
| GET | `/webhooks/{workflowId}/{nodeId}` | Get webhook |
| POST | `/webhooks/{workflowId}/{nodeId}/test` | Test webhook |

**Total: ~38 core endpoints** (excludes admin, AI, advanced features)
