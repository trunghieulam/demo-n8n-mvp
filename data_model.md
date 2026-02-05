# N8N MVP - Data Model

## Core Entities

### 1. User
Represents a person who uses n8n to create and manage workflows.

**Properties:**
- `id` (UUID) - Unique identifier
- `email` (string) - Unique email address
- `firstName` (string) - User's first name
- `lastName` (string) - User's last name
- `password` (string, hashed) - Encrypted password
- `isActive` (boolean) - Account status
- `createdAt` (timestamp) - Account creation time
- `updatedAt` (timestamp) - Last update time

**Relationships:**
- Has many `Workflows`
- Has many `Credentials`
- Has many `Executions`

**Notes:**
- MVP: Single user or basic multi-user, no complex RBAC
- Authentication: Email/password only (no OAuth/SSO for MVP)

---

### 2. Workflow
Represents an automation workflow consisting of connected nodes.

**Properties:**
- `id` (UUID) - Unique identifier
- `name` (string) - Workflow name
- `description` (string, optional) - What the workflow does
- `nodes` (JSON) - Array of INode objects defining the workflow
  - Each node has: `id`, `name`, `type`, `position` (x, y), `parameters`, `credentials`
- `connections` (JSON) - How nodes connect to each other
  - Structure: `{ [sourceNodeId]: { [connectionType]: IConnection[] } }`
- `isActive` (boolean) - Whether workflow is deployed
- `staticData` (JSON, optional) - Persistent workflow-level data storage
- `settings` (JSON, optional) - Workflow-specific settings (e.g., timeout, concurrency)
- `tags` (array of strings) - Categorical labels
- `userId` (UUID, FK) - Owner of the workflow
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Relationships:**
- Belongs to `User`
- Has many `Executions`
- Has many `Webhooks`
- Has many `Tags` (through association)

**Notes:**
- MVP: No versioning, no sharing between users
- Nodes and connections stored as JSON for flexibility
- Static data allows workflows to store state between executions

---

### 3. Node
A single unit/step in a workflow (not a separate DB entity; embedded in Workflow.nodes JSON).

**Properties (within Workflow.nodes array):**
- `id` (string) - Unique identifier within workflow (e.g., "node_1")
- `name` (string) - Display name
- `type` (string) - Node type identifier (e.g., "n8n-nodes-base.http", "n8n-nodes-base.slack")
- `position` (object) - Canvas position: `{ x: number, y: number }`
- `parameters` (JSON) - Node-specific configuration
  - Example for HTTP node: `{ url, method, headers, body }`
- `credentials` (object) - Credentials used by this node: `{ [credentialType]: credentialId }`
- `disabled` (boolean, optional) - Whether node is skipped during execution
- `notes` (string, optional) - User documentation for the node

**Connection Types:**
- `main` - Primary data flow
- `error` - Error handling flow

**Notes:**
- Nodes are not stored separately; they live in Workflow.nodes
- Connection logic lives in Workflow.connections

---

### 4. Execution
Represents a single run of a workflow.

**Properties:**
- `id` (UUID) - Unique identifier
- `workflowId` (UUID, FK) - Which workflow was executed
- `userId` (UUID, FK) - Who triggered the execution
- `mode` (enum) - How it was triggered:
  - `manual` - User clicked "Execute"
  - `trigger` - Timer/schedule triggered it
  - `webhook` - Webhook request triggered it
  - `test` - Test webhook
- `status` (enum) - Execution result:
  - `running` - Currently executing
  - `success` - Completed successfully
  - `error` - Failed with error
- `startedAt` (timestamp) - When execution started
- `finishedAt` (timestamp, nullable) - When execution completed
- `executionData` (JSON, large) - Complete execution trace:
  - For each node: input data, output data, timing
  - Errors, node-by-node results
- `workflowData` (JSON, snapshot) - Snapshot of workflow at execution time (for historical accuracy)
- `retryOf` (UUID, optional, FK) - If this is a retry, which execution it's retrying

**Relationships:**
- Belongs to `Workflow`
- Belongs to `User`
- Related to another `Execution` (via retryOf for retry chains)

**Notes:**
- MVP: No annotations, no bulk deletion filters
- executionData can grow large; consider cleanup strategy for old executions
- Storing workflowData snapshot ensures we can replay execution even if workflow changed

---

### 5. Credential
Encrypted credentials needed by nodes (API keys, passwords, OAuth tokens, etc.).

**Properties:**
- `id` (UUID) - Unique identifier
- `name` (string) - Display name (e.g., "Slack API Key #1")
- `type` (string) - Credential type (e.g., "slackOAuth2Api", "httpBasicAuth")
- `data` (string, encrypted JSON) - Encrypted credential details
  - Example: `{ token: "...", secret: "..." }`
- `userId` (UUID, FK) - Owner of this credential
- `isActive` (boolean) - Whether credential is available for use
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Relationships:**
- Belongs to `User`
- Used by many `Nodes` (within Workflow.nodes)

**Notes:**
- MVP: No team sharing, no scoping to projects
- Data is always encrypted at rest
- Decryption happens in memory during workflow execution
- Type determines what fields are expected in data

---

### 6. Webhook
Webhook registration for trigger nodes that need to receive external HTTP callbacks.

**Properties:**
- `id` (UUID) - Unique identifier
- `workflowId` (UUID, FK) - Which workflow triggers on this webhook
- `nodeId` (string) - Which node in the workflow listens to this webhook
- `webhookPath` (string) - The URL path (e.g., "/webhook/abc123def")
- `method` (enum) - HTTP method it listens on: `GET`, `POST`, `PUT`, `DELETE`, etc.
- `isActive` (boolean) - Whether webhook is currently listening
- `createdAt` (timestamp)

**Relationships:**
- Belongs to `Workflow`

**Derived Properties:**
- Full webhook URL: `{baseUrl}/webhook/{id}` or `{baseUrl}/{webhookPath}`

**Notes:**
- MVP: No webhook authentication, only path-based uniqueness
- Can have multiple webhooks per workflow (for different nodes)
- Test webhooks capture the last request without executing the workflow

---

### 7. Tag
Simple labels for organizing workflows.

**Properties:**
- `id` (UUID) - Unique identifier
- `name` (string) - Tag text (e.g., "important", "slack-related")
- `userId` (UUID, FK) - Owner of this tag
- `createdAt` (timestamp)

**Relationships:**
- Belongs to `User`
- Associated with many `Workflows` (through WorkflowTag join table)

**Join Table: WorkflowTag**
- `workflowId` (UUID, FK)
- `tagId` (UUID, FK)

**Notes:**
- MVP: Simple tagging system for organization
- Each user has their own tags (no shared tags)

---

### 8. Connection (Graph Structure)
Describes how nodes are connected in a workflow (embedded in Workflow.connections JSON).

**Structure (within Workflow.connections):**
```json
{
  "sourceNodeId": {
    "main": [
      [
        {
          "node": "targetNodeId",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }
}
```

**Properties:**
- `node` (string) - Target node ID
- `type` (string) - Connection type: `main` (data flow) or `error` (error handling)
- `index` (number) - Output slot index (for multi-output nodes)

**Notes:**
- Connections are stored as JSON within Workflow entity
- Not a separate table; part of workflow definition
- Supports multiple output types and multi-path workflows
- Graph traversal uses `n8n-workflow` utilities

---

## Data Model Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        USER                             │
│  (id, email, password, firstName, lastName, isActive)   │
└──────────┬──────────────────────────────────────────────┘
           │
           ├─→ WORKFLOW (many)
           │   ├─ nodes: [INode]
           │   ├─ connections: {sourceId → {type → [target]}}
           │   ├─ staticData: JSON
           │   ├─ isActive: boolean
           │   └─ tags: [Tag]
           │       └─→ TAG (many-to-many)
           │
           ├─→ EXECUTION (many)
           │   ├─ workflowId (FK)
           │   ├─ status: running|success|error
           │   ├─ mode: manual|trigger|webhook|test
           │   ├─ executionData: JSON (trace)
           │   └─ workflowData: JSON (snapshot)
           │
           ├─→ CREDENTIAL (many)
           │   ├─ type: slackOAuth2Api|httpBasicAuth|...
           │   └─ data: encrypted JSON
           │
           └─→ WEBHOOK (many)
               ├─ workflowId (FK)
               ├─ nodeId: string
               └─ webhookPath: string

WORKFLOW.nodes contains INode objects (not separate DB entities):
├─ id, type, position, parameters, credentials, disabled
└─ nodes connect via WORKFLOW.connections graph

EXECUTION.retryOf can reference another EXECUTION (retry chain)
```

---

## Database Schema Notes

### Key Constraints
- User.email: UNIQUE
- Workflow: userId + name could be UNIQUE (user can't have two workflows with same name)
- Credential: userId + name could be UNIQUE
- Tag: userId + name could be UNIQUE
- Webhook: workflowId + webhookPath could be UNIQUE

### Indexes for Performance
- User.email (authentication lookup)
- Workflow.userId (list user's workflows)
- Execution.workflowId, Execution.status (filter executions)
- Credential.userId (list user's credentials)
- Webhook.workflowId, Webhook.webhookPath (webhook routing)

### Data Types
- Timestamps: `DATETIME` or `TIMESTAMP` with timezone
- JSON columns: Native JSON type (PostgreSQL/MySQL) or TEXT (SQLite)
- Encrypted data: TEXT (base64 encoded encrypted string)
- Large data (executionData): Consider separate storage or compression for very large executions

---

## Relationships Summary

| Entity | Relationship | Cardinality | Notes |
|--------|-------------|-------------|-------|
| User ↔ Workflow | owns | 1:N | User creates/owns workflows |
| User ↔ Execution | triggers | 1:N | User executes workflows |
| User ↔ Credential | owns | 1:N | User owns credentials |
| User ↔ Tag | creates | 1:N | User creates tags |
| Workflow ↔ Execution | has | 1:N | Workflow executed many times |
| Workflow ↔ Webhook | has | 1:N | Workflow can have trigger webhooks |
| Workflow ↔ Tag | tagged | N:M | Workflows can have multiple tags |
| Execution ↔ Execution | retries | 1:N | Execution can be retried |
| Node ↔ Credential | uses | N:M | Node can use credential; embedded in workflow |
| Node ↔ Connection | connects | N:M | Nodes connected via connections graph |

---

## MVP Simplifications (vs Full n8n)

✅ **Included in MVP:**
- Basic User management (email, password)
- Workflow CRUD with node/connection editing
- Execution tracking with status and data
- Credential storage with encryption
- Basic tagging
- Webhook trigger support
- Error handling in executions

❌ **Excluded from MVP (can add later):**
- Workflow versioning/history
- Multi-user project sharing and RBAC
- Annotations and execution feedback
- Bulk execution deletion with filters
- Team credentials or shared credentials
- SSO/OAuth user authentication
- Data Tables
- AI Workflow Builder
- Advanced execution recovery
