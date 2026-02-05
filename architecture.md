# N8N MVP - Architecture

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + TypeScript)                 │
│  ┌──────────────┬──────────────┬───────────┬──────────────────┐ │
│  │  Workflows   │   Canvas     │ Execution │   Credentials    │ │
│  │   List       │   Editor     │   Logs    │   Manager        │ │
│  └──────────────┴──────────────┴───────────┴──────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   Zustand Stores: workflow, canvas, credential, nodeTypes │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────┬──────────────────────────────────────────────────────┘
             │ REST API (JSON)
             │ WebSocket (Real-time updates)
┌────────────▼──────────────────────────────────────────────────────┐
│                 API GATEWAY / EXPRESS SERVER                      │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Middleware: Auth, CORS, Error Handling, Validation         │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────── ─┐  │
│ │   Controllers (Request Handlers)                             │  │
│ │   ├─ WorkflowController                                     │  │
│ │   ├─ ExecutionController                                    │  │
│ │   ├─ CredentialController                                   │  │
│ │   ├─ WebhookController                                      │  │
│ │   ├─ UserController                                         │  │
│ │   └─ TagController                                          │  │
│ └─────────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────────┐
│             SERVICES LAYER (Business Logic)                       │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │  @Injectable Services (Dependency Injection)               │  │
│ │  ├─ WorkflowService: CRUD, activation, validation         │  │
│ │  ├─ ExecutionService: Run, track, retry, stop execution   │  │
│ │  ├─ CredentialService: Encrypt/decrypt, resolve           │  │
│ │  ├─ WorkflowExecutor: Graph traversal, node execution    │  │
│ │  ├─ WebhookService: Register, validate, route webhooks   │  │
│ │  ├─ AuthService: Login, JWT generation                    │  │
│ │  ├─ TagService: Create, attach, filter tags               │  │
│ │  └─ EventBus: Emit/listen to internal events              │  │
│ └─────────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────────┐
│          WORKFLOW EXECUTION ENGINE                                │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │  WorkflowRunner: Executes workflow graph                   │  │
│ │  ├─ Parse nodes and connections                           │  │
│ │  ├─ Create execution context                              │  │
│ │  ├─ Traverse graph depth-first/breadth-first             │  │
│ │  ├─ Load credentials for each node                        │  │
│ │  ├─ Execute node (call node's execute function)          │  │
│ │  ├─ Handle errors and error paths                        │  │
│ │  ├─ Store execution results incrementally                │  │
│ │  └─ Return final status and data                          │  │
│ │                                                             │  │
│ │  NodeRegistry: Available node types                       │  │
│ │  ├─ Built-in nodes: HTTP, Webhook, Slack, etc.           │  │
│ │  └─ Custom nodes (future)                                 │  │
│ └─────────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────────┐
│              DATA PERSISTENCE LAYER                               │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  TypeORM Repositories                                      │   │
│ │  ├─ UserRepository                                         │   │
│ │  ├─ WorkflowRepository                                     │   │
│ │  ├─ ExecutionRepository                                    │   │
│ │  ├─ CredentialRepository                                   │   │
│ │  ├─ WebhookRepository                                      │   │
│ │  └─ TagRepository                                          │   │
│ └────────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │  Database (SQLite / PostgreSQL / MySQL)                   │   │
│ │  Tables: users, workflows, executions, credentials,       │   │
│ │          webhooks, tags, workflow_tags                    │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detailed Architecture Layers

### 1. Frontend Layer (React)

**Technology Stack:**
- React framework with hooks
- TypeScript for type safety
- Zustand for state management (global app state)
- Vite for fast development and builds
- Tailwind CSS for UI styling
- React Flow for canvas editor
- Axios for HTTP client

**Key Pages/Views:**
- **Workflows List** - Display all user workflows with CRUD actions
- **Canvas Editor** - Visual workflow builder with node drag-drop
- **Execution Logs** - View execution history and details
- **Credentials Manager** - Store and manage integration credentials
- **Settings** - User profile and preferences

**State Management (Zustand Stores):**
```typescript
// Example stores
workflowStore - Current workflow, list of workflows, search/filter
canvasStore - Node positions, zoom level, pan offset, selected node
credentialStore - List of credentials, type filter
nodeTypesStore - Available node types
authStore - Current user, authentication token
```

**API Client Layer:**
- Centralized API service class for REST calls
- Intercept requests/responses (auth headers, error handling)
- Type-safe requests using shared types from `@n8n/api-types`

---

### 2. API Gateway / Express Server

**Entry Point:** `packages/cli/src/Server.ts`

**Middleware Stack (in order):**
1. CORS - Allow cross-origin requests
2. Body Parser - JSON/form request parsing
3. Authentication - Verify JWT token for protected routes
4. Validation - Input validation using Zod schemas
5. Error Handler - Catch and format errors

**Controllers:**
- Handle HTTP requests
- Validate inputs
- Call services for business logic
- Return formatted responses

**Example Request Flow:**
```
POST /api/workflows
├─ CORS check ✓
├─ Parse JSON body ✓
├─ Verify JWT token in header ✓
├─ Validate schema (name, nodes, connections) ✓
├─ Call WorkflowService.create() → returns Workflow
└─ Return 201 + Workflow JSON
```

---

### 3. Services Layer (Business Logic)

**Dependency Injection Pattern:**
```typescript
@Service()
export class WorkflowService {
  constructor(
    private workflowRepository: Repository<Workflow>,
    private executionService: ExecutionService,
    private eventBus: EventBus
  ) {}

  async create(data: CreateWorkflowDTO): Promise<Workflow> {
    // Validate, transform, save
  }
}
```

**Core Services:**

**WorkflowService**
- CRUD operations (create, read, update, delete)
- Validate workflow structure (nodes, connections valid)
- Activate/deactivate workflows
- Clone/duplicate workflows
- Export/import workflows

**ExecutionService**
- Start new executions
- Track execution status (running → success/error)
- Retrieve execution history with filtering
- Retry failed executions
- Stop running executions
- Store execution data and logs

**WorkflowExecutor** (Execution Engine)
- Core graph execution logic
- Load and parse workflow definition
- Create execution context
- Traverse node graph (topological sort / breadth-first)
- For each node: load credentials, execute, capture output, handle errors
- Support error paths (error outputs)
- Store incremental execution data
- Return final execution result

**CredentialService**
- Encrypt credentials before storing
- Decrypt credentials during execution
- Validate credential type and required fields
- List user's credentials
- Delete credentials (and mark workflows as needing update)

**WebhookService**
- Register webhook paths with unique IDs
- Validate incoming webhook requests
- Route webhook requests to correct workflow + node
- Test webhook (capture request without executing workflow)
- Manage webhook lifecycle

**AuthService**
- Hash passwords
- Verify passwords
- Generate JWT tokens
- Verify JWT tokens

**EventBus**
- Internal pub-sub system
- Events: `workflow.created`, `execution.started`, `execution.completed`, etc.
- Services subscribe to events for decoupled communication

---

### 4. Workflow Execution Engine

**Graph Execution Model:**

```
Workflow Definition:
├─ nodes: [INode] - vertices
└─ connections: {sourceId → {type → [targetId]}} - edges

Execution Steps:
1. Parse workflow graph from database
2. Create ExecutionContext {workflowData, executionData, variables}
3. Topologically sort nodes (respect dependency order)
4. For each node:
   a. Load input data from previous nodes (from execution context)
   b. Load credentials needed by node
   c. Call node's execute function with input data
   d. Capture output data, timing, success/error
   e. Store in execution context for next nodes
   f. If error: try error path (connected to error output)
5. Return final execution result (success/error + all node outputs)
```

**Node Registry:**
```typescript
interface INode {
  id: string;
  type: string; // "n8n-nodes-base.http", "slack", etc.
  name: string;
  position: { x: number; y: number };
  parameters: INodeParameters; // node-specific config
  credentials?: { [type: string]: string }; // credential IDs
  disabled?: boolean;
}

// Each node type has execute function:
async execute(
  executionContext: ExecutionContext,
  nodeData: INode,
  inputData: any
): Promise<INodeExecutionData>
```

**Built-in Nodes (MVP):**
- **HTTP** - Make HTTP requests (GET, POST, etc.)
- **Webhook** - Receive HTTP callbacks
- **Function** - Execute JavaScript code
- **Merge** - Combine data from multiple paths
- **Set** - Set static or dynamic values
- **Conditional** - Branch based on conditions
- **Loop** - Iterate over array items
- **Schedule** - Trigger on timer/cron

---

### 5. Data Persistence Layer

**TypeORM Repositories:**
```typescript
@Entity("workflows")
export class Workflow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column("json")
  nodes: INode[];

  @Column("json")
  connections: IConnections;

  @Column("boolean")
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @OneToMany(() => Execution, (exec) => exec.workflow)
  executions: Execution[];
}
```

**Database Choice:**
- **MVP:** SQLite (simple, file-based, no setup)
- **Production:** PostgreSQL (scalable, transactions, JSON support)
- **Migration:** Use TypeORM migrations to switch databases

**Key Indexes:**
```sql
CREATE INDEX idx_workflows_userId ON workflows(userId);
CREATE INDEX idx_executions_workflowId_status ON executions(workflowId, status);
CREATE INDEX idx_webhooks_workflowId_path ON webhooks(workflowId, webhookPath);
```

---

## Request/Response Cycle Example

### Creating and Executing a Workflow

```
1. USER ACTION: Click "Create Workflow"
   ↓
2. FRONTEND: POST /api/workflows {name, description}
   ├─ Request: CreateWorkflowDTO with user ID from JWT
   ├─ Controller validates input
   └─ Calls WorkflowService.create()
   ↓
3. SERVICE: WorkflowService.create()
   ├─ Validate workflow name (unique per user)
   ├─ Create entity: new Workflow({...})
   ├─ Save to database: repository.save()
   ├─ Emit event: eventBus.emit("workflow.created")
   └─ Return Workflow
   ↓
4. DATABASE: Insert row into workflows table
   ↓
5. RESPONSE: 201 + {id, name, nodes: [], connections: {}, ...}
   ↓
6. FRONTEND: Store in workflowStore (Zustand), navigate to Canvas Editor
   ↓
7. USER ACTION: Add nodes, connect them, click "Execute"
   ↓
8. FRONTEND: POST /api/executions {workflowId, mode: "manual"}
   ├─ Controller extracts workflowId, userId
   └─ Calls ExecutionService.start()
   ↓
9. SERVICE: ExecutionService.start()
   ├─ Load workflow from database
   ├─ Create Execution entity {status: "running"}
   ├─ Save execution (get execution ID)
   ├─ Call WorkflowExecutor.execute(workflow, executionData)
   │  └─ (runs asynchronously, updates execution as it progresses)
   └─ Return Execution {id, status: "running", ...}
   ↓
10. RESPONSE: 201 + {executionId, status: "running"}
    ↓
11. FRONTEND: Execution logs fetched via API polling or WebSocket
    ├─ Listens for execution updates
    ├─ Updates execution list in component state
    └─ Displays logs as execution progresses
    ↓
12. BACKEND (Async): WorkflowExecutor executes workflow
    ├─ Node 1 (HTTP): Make API request
    ├─ Node 2 (Transform): Process response
    ├─ Node 3 (Slack): Send message
    └─ Update execution in DB with final status + data
    ↓
13. FRONTEND: Receives "execution.completed" event
    ├─ Displays final status (success ✓ or error ✗)
    ├─ Shows outputs from all nodes
    └─ User can view logs/retry if failed
```

---

## Component Interaction Diagram

```
┌──────────────────┐
│   Frontend UI    │
│ (React Components) │
└────────┬─────────┘
         │
         │ dispatch
         ▼
┌──────────────────────┐
│   Zustand Stores     │
│ (State Management)   │
└────────┬─────────────┘
         │
         │ call
         ▼
┌──────────────────────┐
│   API Client         │
│ (HTTP Requests)      │
└────────┬─────────────┘
         │
         │ REST/WebSocket
         ▼
┌──────────────────────────────┐
│   Controllers (Express)       │
│ (Request routing & validation)│
└────────┬─────────────────────┘
         │
         │ call
         ▼
┌──────────────────────────────┐
│   Services                    │
│ (Business Logic & DI)         │
└────────┬─────────────────────┘
         │
    ┌────┴─────┬─────────┬──────────┐
    │           │         │          │
    ▼           ▼         ▼          ▼
  Repos      EventBus   Executor   External
                         APIs
    │           │         │          │
    └────┬─────┴─────────┴──────────┘
         │
         ▼
┌──────────────────────┐
│   Database           │
│   (TypeORM)          │
└──────────────────────┘
```

---

## Error Handling

**Error Hierarchy:**
```
ApplicationError
├─ OperationalError - Expected errors (invalid input, not found)
├─ UserError - User-facing errors (workflow validation failed)
└─ UnexpectedError - Unexpected system errors (DB connection failed)
```

**Example:**
```typescript
// In service
if (!workflow) {
  throw new OperationalError("Workflow not found", { workflowId });
}

// In controller - caught by middleware
catch (error) {
  if (error instanceof OperationalError) {
    res.status(404).json({ error: error.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
```

---

## Key Design Patterns

| Pattern | Where | Purpose |
|---------|-------|---------|
| Dependency Injection | Services | Loose coupling, testability |
| Repository | Data access | Abstraction over database |
| Controller-Service-Repo | Architecture | Separation of concerns |
| Event-Driven | Services | Decoupled communication |
| TypeScript Strict | All code | Type safety, error prevention |
| Graph Traversal | Executor | Execute connected nodes |
| Encryption at Rest | Credentials | Secure sensitive data |
| Incremental Storage | Execution | Track progress real-time |

---

## MVP Architectural Decisions

✅ **Synchronous execution** (simple, direct feedback)
- For MVP, workflows execute synchronously and block until complete
- Future: async workers with queue system

✅ **In-memory execution context**
- Execution data held in memory during workflow run
- Saved to database after completion
- Future: streaming for very large datasets

✅ **Single-user MVP**
- No project sharing, RBAC, or multi-tenant features
- Simple user authentication (JWT)
- Future: team projects and role-based access

✅ **Built-in nodes only**
- No custom node upload/management
- Focus on core 8-10 essential nodes
- Future: marketplace for community nodes

✅ **Basic webhook support**
- Simple path-based webhooks
- No request validation or retry logic
- Future: webhook signatures, delivery confirmations

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Zustand + Vite + React Flow |
| API | Express.js + TypeScript |
| Services | Node.js + TypeScript + DI pattern |
| Database | TypeORM + SQLite/PostgreSQL/MySQL |
| Execution | Custom workflow executor (topological sort) |
| Testing | Jest (backend) + React Testing Library (frontend) |
| Code Quality | Biome (formatter) + ESLint + TypeScript |
| Package Manager | pnpm + monorepo workspaces |
