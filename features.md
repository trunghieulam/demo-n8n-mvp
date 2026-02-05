# N8N MVP - Features List

## Overview

This document outlines all features required for the n8n MVP (Minimum Viable Product). Features are categorized by priority and implementation phase. The MVP focuses on core workflow automation capabilities without enterprise features.

---

## Phase 1: MVP Core (Must Have)

### 1. User Management
- [x] User registration with email and password
- [x] User login with JWT authentication 
- [x] User profile (view and edit first/last name)
- [x] Session management (token expiry, logout)
- [x] Change password
- [x] Delete account

**Acceptance Criteria:**
- For MVP, create a simple user with account "admin" and password "p@ssw0rd" for testing

---

### 2. Workflow CRUD (Create, Read, Update, Delete)
- [x] Create new workflow with name and description
- [x] View list of all user workflows (with pagination)
- [x] Search workflows by name/description
- [x] Edit workflow details (name, description, nodes, connections)
- [x] Delete workflow with confirmation
- [x] Duplicate/clone workflow with new name
- [x] View workflow details (full node and connection definitions)
- [x] Save workflow in "draft" state (not active)
- [x] Create workflow from template

**Acceptance Criteria:**
- Workflow validation passes before saving (valid nodes, connections)
- Each user only sees their own workflows
- Search is case-insensitive and real-time
- Deleted workflows cannot be recovered
- Cloning preserves all node configuration and connections

---

### 3. Visual Workflow Canvas Editor
- [x] Drag-and-drop interface to add nodes to canvas
- [x] Visual representation of nodes with input/output ports
- [x] Connect nodes by dragging between ports (create connections)
- [x] Pan and zoom canvas (mouse wheel, toolbar buttons)
- [x] Select node to view/edit configuration
- [x] Node property editor (right panel) with parameter inputs
- [x] Delete connections by clicking on them
- [ ] Undo/Redo functionality (up to 20 actions)
- [x] Save button to persist workflow changes
- [ ] Show unsaved changes indicator (dot next to workflow name)
- [ ] Context menu on canvas (right-click for options)

**Acceptance Criteria:**
- Nodes snap to grid for alignment
- Connections visually show data flow direction
- Selected node highlights with border
- Parameter changes save to memory (not to DB until Save is clicked)
- Undo/Redo works across node creation, deletion, connection, and property changes
- Zooming range: 50% to 200%

---

### 4. Built-in Nodes (8-10 Essential Nodes)

#### 4.1 Webhook Trigger Node
- [ ] Receive HTTP POST/GET/PUT/DELETE requests
- [ ] Configure webhook path (e.g., "/my-webhook")
- [ ] Auto-generate unique webhook URL
- [ ] Return static response to webhook request
- [ ] Test webhook (capture request without executing workflow)

**Acceptance Criteria:**
- Webhook URL is unique per node
- Incoming request data is passed to next node
- Test webhook captures last request for inspection
- Path must start with "/" and be URL-safe

#### 4.2 HTTP Request Node
- [ ] Make HTTP requests (GET, POST, PUT, DELETE, PATCH)
- [ ] Configure URL, headers, body (JSON/form data)
- [ ] Support basic auth and bearer token auth
- [ ] Handle response status and body
- [ ] Timeout configuration (default 300s)

**Acceptance Criteria:**
- Response status code and body passed to next node
- Headers support dynamic values (expressions)
- Credentials can be attached for auth

#### 4.3 Function / Script Node
- [ ] Execute JavaScript code in sandboxed environment
- [ ] Access input data from previous nodes
- [ ] Return output data to next node
- [ ] Error handling (catch and pass to error output)

**Acceptance Criteria:**
- Code editor with syntax highlighting
- Input variable available as `data` parameter
- Return statement defines output
- Errors show in execution logs

#### 4.4 Set/Merge Node
- [ ] Set static values
- [ ] Merge data from multiple inputs
- [ ] Transform data (JSON editor)
- [ ] Support expressions for dynamic values

**Acceptance Criteria:**
- Can define multiple output fields
- Expressions evaluated with access to input data
- Supports nested objects and arrays

#### 4.5 Conditional Node
- [ ] Branch execution based on condition
- [ ] Support comparison operators (==, !=, <, >, <=, >=)
- [ ] Logical operators (AND, OR)
- [ ] Route to different nodes based on true/false

**Acceptance Criteria:**
- Condition syntax is user-friendly
- True branch and false branch can connect to different nodes
- Expression syntax consistent with other nodes

#### 4.6 Loop/Iterate Node
- [ ] Iterate over array items
- [ ] Execute downstream nodes for each item
- [ ] Pass current item to next node
- [ ] Support break/continue logic

**Acceptance Criteria:**
- Clear indication of which nodes are inside loop
- Loop index available to expressions
- Can nest loops (within constraints)

#### 4.7 Schedule/Cron Node
- [ ] Trigger workflow on schedule (cron syntax)
- [ ] Support common intervals (hourly, daily, weekly, etc.)
- [ ] Visual cron editor with presets
- [ ] Configure timezone

**Acceptance Criteria:**
- Cron schedule validated
- Workflow auto-activates when schedule is set
- Next run time displayed
- Last run time tracked

#### 4.8 Slack Integration Node
- [ ] Send messages to Slack channel
- [ ] Configure message text and formatting
- [ ] Support attachments/blocks (basic)
- [ ] Mention users and channels
- [ ] Requires Slack OAuth credential

**Acceptance Criteria:**
- Message posted to correct channel
- User-friendly message builder
- Credential validation before execution

#### 4.9 Error Handling Node
- [ ] Catch errors from upstream nodes
- [ ] Execute error path instead of stopping
- [ ] Access error details and message
- [ ] Send error notifications (e.g., to Slack)

**Acceptance Criteria:**
- Nodes can have both success and error outputs
- Error path only executes if previous node fails
- Error details passed as special variable

#### 4.10 NoOp/Passthrough Node (Optional)
- [ ] Pass data through without modification
- [ ] Use for organizing complex workflows

---

### 5. Workflow Execution
- [x] Execute workflow manually (click Execute button)
- [x] Show execution status (running, success, error)
- [x] Execute asynchronously (non-blocking)
- [x] Store execution results
- [x] Stop running execution
- [ ] Show execution progress in real-time (via WebSocket)
- [x] Node-by-node execution with input/output data
- [x] Error handling and error paths

**Acceptance Criteria:**
- Execution completes within timeout (300s default)
- Results persisted to database
- Failed node identified and error shown
- User can see which nodes executed and their outputs
- Execution can be stopped while running

---

### 6. Execution History & Logs
- [x] View execution history for workflow (list view)
- [x] Filter by status (success, error, running)
- [x] Sort by date (newest first by default)
- [x] View execution details (node-by-node results)
- [x] Show execution data and logs
- [x] Pagination for large execution lists
- [x] Retry failed execution
- [ ] Download execution data as JSON
- [x] Display execution duration and node timings

**Acceptance Criteria:**
- Execution list shows at least: status, timestamp, duration, mode
- Details show input/output data for each node
- Retry creates new execution with same input data
- Date filter supports last 24h, last 7d, custom range
- Oldest executions can be manually deleted

---

### 7. Credential Management
- [x] Create credentials (API keys, tokens, usernames/passwords)
- [x] List all credentials
- [x] Edit credential details
- [x] Delete credential
- [x] Filter credentials by type
- [x] Test credential (verify it works with service)
- [x] Support multiple credential types:
  - HTTP Basic Auth (username + password)
  - HTTP Bearer Token
  - Slack OAuth 2.0
  - Generic API Key
- [x] Encrypt credentials at rest
- [ ] Display credential usage (which workflows use it)

**Acceptance Criteria:**
- Credentials stored encrypted in database
- Decrypted only during workflow execution in memory
- Users cannot view decrypted credentials (for security)
- Credential type determines required fields
- Test endpoint validates credential is valid
- Deleting credential shows warning if in use

---

### 8. Webhook Support
- [ ] Register webhooks for trigger nodes
- [ ] Generate unique webhook URL per node
- [ ] Receive and route incoming webhook requests
- [ ] Test webhook (capture request without execution)
- [ ] Support webhook query parameters and body
- [ ] Support multiple HTTP methods (GET, POST, PUT, DELETE)
- [ ] Activate/deactivate webhooks with workflow

**Acceptance Criteria:**
- Webhook URL format: `{baseUrl}/webhook/{id}`
- Incoming requests routed to correct workflow/node
- Test webhook stores last request for inspection
- Webhooks only active when workflow is active
- Path can be customized per node

---

### 9. Tagging System
- [ ] Create tags for workflow organization
- [ ] Assign multiple tags to workflows
- [ ] Filter workflows by tags
- [ ] View all tags with usage count
- [ ] Delete tags (removes from workflows)
- [ ] Rename tags

**Acceptance Criteria:**
- Tags are user-specific
- Tag names are case-insensitive
- Filtering by tag updates workflow list in real-time
- Tag deletion doesn't delete workflows

---

### 10. Authentication & Authorization
- [x] JWT token-based authentication
- [x] All protected endpoints require valid token
- [x] Token expiry and refresh handling
- [x] Users can only access their own workflows/executions/credentials
- [x] 401 error for invalid/expired token
- [x] 403 error for unauthorized access

**Acceptance Criteria:**
- Token included in Authorization header
- Token verified on every protected request
- Expired token redirects to login
- User isolation enforced at DB query level

---

## Phase 2: MVP Enhancement (Should Have)

### 10.5. Workflow Templates
- [x] Pre-built workflow templates
- [x] List available templates
- [x] Create workflow from template
- [x] Templates include: Weather Alert, Data Processing Pipeline, API Gateway

**Acceptance Criteria:**
- Templates provide starting point for common workflows
- User can customize template after creation
- Templates include nodes and connections pre-configured

---

### 11. Workflow Validation
- [x] Validate workflow structure (valid JSON)
- [x] Validate nodes have required parameters
- [x] Validate connections are valid (source/target exist)
- [ ] Warn on missing credentials
- [x] Show validation errors before activation

**Acceptance Criteria:**
- Cannot save invalid workflow
- Errors shown in UI with specific messages
- Validation includes node type checks

---

### 12. Expressions & Dynamic Values
- [ ] Support JavaScript expressions in node parameters
- [ ] Access input data in expressions: `data.field`
- [ ] Support arithmetic, string, and logical operations
- [ ] Expression syntax highlighting and validation
- [ ] Error reporting for invalid expressions

**Acceptance Criteria:**
- Expressions evaluated during execution
- Syntax: `={{ expression here }}`
- Access to previous node outputs
- Type validation and coercion

---

### 13. Data Pinning (Optional)
- [ ] Pin execution data on canvas for offline testing
- [ ] Show pinned data in node preview
- [ ] Execute nodes with pinned input data

**Acceptance Criteria:**
- Pinned data persisted with workflow
- Can clear pins when not needed

---

### 14. Static Data Storage
- [ ] Store workflow-level persistent data
- [ ] Accessed via expressions: `$static.field`
- [ ] Update static data during workflow execution
- [ ] View/edit static data in settings

**Acceptance Criteria:**
- Data persisted across executions
- Can initialize with default values
- Cleared when workflow deleted

---

### 15. API Documentation
- [ ] OpenAPI/Swagger documentation for all endpoints
- [ ] Accessible at `/api/docs`
- [ ] Interactive API explorer
- [ ] Example requests and responses

**Acceptance Criteria:**
- All endpoints documented
- Proper status codes and error formats shown
- Easy to test endpoints from docs

---

### 16. Basic Error Recovery
- [x] Retry failed execution with same input
- [x] Capture and display error details
- [x] Error message shown in execution logs
- [x] Failed node clearly marked

**Acceptance Criteria:**
- Error includes node name and error message
- Retry available from execution details
- Error path in workflow can handle errors

---

### 17. Data Export/Import
- [ ] Export workflow as JSON
- [ ] Import workflow from JSON
- [ ] Maintain all node and connection data
- [ ] Handle version compatibility

**Acceptance Criteria:**
- Export includes nodes, connections, settings
- Import validates structure before creating
- Can import workflows from other n8n instances

---

### 18. Workflow Settings
- [ ] Execution timeout (300s default)
- [ ] Max concurrent executions per workflow
- [ ] Save settings with workflow

**Acceptance Criteria:**
- Settings applied during execution
- Timeout prevents infinite loops
- Concurrency limit queues excess executions

---

### 19. Email Notifications (Future)
- [ ] Send email on execution completion
- [ ] Notify on errors
- [ ] Digest of daily executions

---

### 20. Admin Capabilities (If Multi-user)
- [ ] View all user workflows (future)
- [ ] Reset user passwords (future)
- [ ] System statistics (total executions, active workflows)

---

## Phase 3: Polish & Production (Nice to Have)

### 21. UI/UX Polish
- [ ] Keyboard shortcuts (Ctrl+S to save, etc.)
- [ ] Search/find node on canvas (Ctrl+F)
- [ ] Node templates/presets for common workflows
- [ ] Drag multiple nodes (selection box)
- [ ] Copy/paste nodes and connections

---

### 22. Observability & Monitoring
- [ ] Execution metrics (success rate, avg duration)
- [ ] Dashboard with stats and charts
- [ ] Error trend analysis
- [ ] Slow workflow identification

---

### 23. Webhook Management UI
- [ ] View all webhooks
- [ ] Edit webhook paths
- [ ] Webhook delivery logs and retries
- [ ] Webhook signature validation (future)

---

### 24. Rate Limiting
- [ ] Limit API requests per user per minute
- [ ] Limit workflow executions per minute
- [ ] Return 429 on limit exceeded
- [ ] Show remaining quota in headers

---

### 25. Localization
- [ ] Support for multiple languages
- [ ] Language selector in settings
- [ ] Translations for UI text and error messages
- [ ] Date/time formatting per locale

---

## Excluded from MVP (Future Enhancements)

❌ **Multi-tenant / Team Features**
- Project sharing, team permissions, RBAC
- Shared credentials
- Team collaboration and real-time co-editing

❌ **Advanced Integrations**
- 400+ built-in nodes (MVP has ~8-10)
- Node marketplace
- Custom node creation and upload
- AI nodes and LangChain integration

❌ **Enterprise Features**
- SSO/SAML/OIDC authentication
- LDAP directory integration
- Advanced audit logs
- Data encryption at rest
- Custom branding

❌ **Advanced Execution Features**
- Distributed execution workers
- Queue-based execution system
- Delayed execution scheduling
- Execution recovery service
- Streaming large datasets

❌ **Advanced UI Features**
- Workflow versioning and history
- Workflow collaboration/comments
- Advanced node search and filtering
- Workflow templates marketplace (basic templates implemented)
- Node annotations and documentation

❌ **Other**
- Mobile app
- Browser notifications
- Slack notifications
- SMS notifications
- Data tables
- Source control integration

---

## Feature Priority Matrix

| Feature | Phase | Effort | Impact | Dependencies |
|---------|-------|--------|--------|--------------|
| User Auth | 1 | Small | Critical | None |
| Workflow CRUD | 1 | Medium | Critical | User Auth |
| Canvas Editor | 1 | Large | Critical | Workflow CRUD |
| Built-in Nodes | 1 | Large | Critical | Canvas Editor |
| Execution | 1 | Medium | Critical | Built-in Nodes |
| Execution Logs | 1 | Small | High | Execution |
| Credentials | 1 | Medium | High | Execution |
| Webhooks | 1 | Medium | High | Execution |
| Tagging | 1 | Small | Medium | Workflow CRUD |
| Auth/Authz | 1 | Small | Critical | User Auth |
| Validation | 2 | Small | High | Canvas Editor |
| Expressions | 2 | Medium | High | Execution |
| Error Recovery | 2 | Small | High | Execution |
| API Docs | 2 | Small | Medium | API endpoints |
| Workflow Settings | 2 | Small | Medium | Execution |
| UI Polish | 3 | Medium | Low | UI complete |
| Monitoring | 3 | Small | Low | Execution |
| Rate Limiting | 3 | Small | Medium | API |
| Localization | 3 | Medium | Low | All UI |

---

## Definition of Done (MVP Complete)

The MVP is complete when:

✅ **Core Features**
- [ ] All Phase 1 features implemented and tested
- [ ] All critical features working end-to-end
- [ ] No known blocking bugs

✅ **Quality**
- [ ] 80%+ code coverage for critical paths
- [ ] All tests passing (unit + integration)
- [ ] TypeScript strict mode enabled
- [ ] No ESLint errors or warnings
- [ ] Performance: Workflow execution < 5s for simple flows

✅ **Documentation**
- [ ] README with setup and usage instructions
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide for basic workflows
- [ ] Developer guide for extending

✅ **Deployment**
- [ ] Runs in Docker container
- [ ] Database migrations working
- [ ] Scalable to at least 10 concurrent users
- [ ] Data persisted across restarts

✅ **Security**
- [ ] Passwords hashed with bcrypt or similar
- [ ] Credentials encrypted at rest
- [ ] HTTPS enabled
- [ ] No SQL injection vulnerabilities
- [ ] JWT tokens secure and validated

---

## Success Metrics

| Metric | Target | Owner |
|--------|--------|-------|
| MVP Launch | 1 Q | Product |
| User Registration | 10+ users | Marketing |
| Workflow Creation | 5+ workflows per user avg | Product |
| Execution Success Rate | 95%+ | Engineering |
| Average Workflow Execution | < 2s | Engineering |
| API Response Time | < 100ms (p95) | Engineering |
| System Uptime | 99%+ | DevOps |
| User Satisfaction | 4+ / 5 | Product |

