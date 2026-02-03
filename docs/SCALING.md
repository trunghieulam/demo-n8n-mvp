# Scaling Strategy for N8N MVP

This document outlines the scaling strategies and architectural changes needed as the application grows beyond the MVP stage.

## Current Architecture (MVP)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
│  (Nginx)    │     │  (Express)  │     │   (Single)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           │ (isolated-vm)
                           ▼
                    ┌─────────────┐
                    │   Sandbox   │
                    │  (In-Process)│
                    └─────────────┘
```

## Scaling Phases

### Phase 1: Horizontal Scaling (Backend Replicas)

**When**: Need to handle more concurrent users/workflows

**Changes Required**:

1. **Load Balancer**
   - Add Nginx or HAProxy in front of backend services
   - Configure sticky sessions for WebSocket connections
   - Health check endpoints for backend instances

2. **Backend Replication**
   - Run multiple backend containers behind load balancer
   - Update `docker-compose.yml`:
     ```yaml
     backend:
       deploy:
         replicas: 3
     ```

3. **Session Management**
   - Move from in-memory to Redis for session storage
   - Configure Socket.IO with Redis adapter for multi-instance support

4. **Database Connection Pooling**
   - Already configured in `database.ts` (max: 20, min: 5)
   - Monitor connection pool usage
   - Adjust pool size based on replica count

**Configuration Example**:
```yaml
# docker-compose.yml additions
services:
  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend

  backend:
    deploy:
      replicas: 3
    # ... existing config

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
```

---

### Phase 2: Sandbox Microservice Architecture

**When**: Need better isolation, security, or resource management for code execution

**Current**: In-process `isolated-vm` execution  
**Target**: Dedicated sandbox service with container-level isolation

**Architecture**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           │ HTTP/gRPC
                           ▼
                    ┌─────────────┐
                    │   Sandbox   │
                    │  Service    │
                    │ (Containers)│
                    └─────────────┘
```

**Implementation Steps**:

1. **Create Sandbox Service**
   - New package: `packages/sandbox`
   - Express/gRPC server for code execution
   - Each execution runs in isolated container or Firecracker microVM
   - Resource limits: CPU, memory, network

2. **Update Backend**
   - Replace direct `isolated-vm` calls with HTTP/gRPC calls to sandbox service
   - Add retry logic and timeout handling
   - Queue system for managing execution requests

3. **Container Isolation Options**:
   - **Option A**: Docker-in-Docker (DinD) - simpler but less secure
   - **Option B**: Firecracker microVMs - better isolation, AWS Lambda-like
   - **Option C**: gVisor - Google's container sandbox

**Example Sandbox Service**:
```typescript
// packages/sandbox/src/index.ts
import express from 'express';
import { Isolate } from 'isolated-vm';

const app = express();
app.use(express.json());

app.post('/execute', async (req, res) => {
  const { code, inputData, timeout = 5000, memoryLimit = 128 } = req.body;
  
  try {
    const isolate = new Isolate({ memoryLimit });
    const context = await isolate.createContext();
    // ... execution logic
    res.json({ result, executionTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Docker Compose Addition**:
```yaml
sandbox:
  build: ./packages/sandbox
  environment:
    - MAX_CONCURRENT_EXECUTIONS=10
    - DEFAULT_MEMORY_LIMIT=128
  deploy:
    replicas: 2
  networks:
    - n8n-network
```

---

### Phase 3: Queue-Based Execution

**When**: Need async execution, better resource management, or execution prioritization

**Architecture**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           │ Enqueue
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │   (Queue)   │
                    └─────────────┘
                           │
                           │ Dequeue
                           ▼
                    ┌─────────────┐
                    │  Workers    │
                    │ (Executors) │
                    └─────────────┘
```

**Implementation**:

1. **Message Queue**
   - Use Redis with BullMQ or RabbitMQ
   - Separate queues by priority (high, normal, low)
   - Dead letter queue for failed executions

2. **Worker Services**
   - Separate worker containers that consume from queue
   - Auto-scaling based on queue depth
   - Graceful shutdown handling

3. **Backend Changes**
   - `WorkflowExecutor` enqueues instead of executing directly
   - WebSocket updates pushed as workers complete
   - Execution status polling endpoint

**Example with BullMQ**:
```typescript
// packages/backend/src/services/ExecutionQueue.ts
import { Queue } from 'bullmq';

const executionQueue = new Queue('workflow-execution', {
  connection: { host: 'redis', port: 6379 }
});

export async function enqueueExecution(workflowId: string, userId: string) {
  await executionQueue.add('execute', {
    workflowId,
    userId,
    mode: 'manual'
  }, {
    priority: 1,
    attempts: 3
  });
}
```

---

### Phase 4: Database Scaling

**When**: Database becomes bottleneck

**Strategies**:

1. **Read Replicas**
   - Primary for writes, replicas for reads
   - TypeORM supports read/write splitting
   - Use for execution history queries

2. **Connection Pooling**
   - PgBouncer for connection pooling
   - Reduce connection overhead

3. **Caching Layer**
   - Redis cache for frequently accessed data
   - Cache workflow definitions, credentials (encrypted)

4. **Partitioning**
   - Partition execution table by date
   - Archive old executions

**Configuration**:
```typescript
// database.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  replication: {
    master: {
      host: 'db-primary',
      // ...
    },
    slaves: [
      {
        host: 'db-replica-1',
        // ...
      }
    ]
  }
});
```

---

### Phase 5: Kubernetes Deployment

**When**: Need orchestration, auto-scaling, service mesh

**Components**:

1. **Deployments**
   - Frontend: Nginx deployment
   - Backend: Node.js deployment with HPA
   - Sandbox: Separate deployment with resource limits

2. **Services**
   - ClusterIP for internal communication
   - LoadBalancer/Ingress for external access

3. **Auto-scaling**
   - Horizontal Pod Autoscaler (HPA) based on CPU/memory
   - Vertical Pod Autoscaler (VPA) for resource optimization

4. **Service Mesh** (Optional)
   - Istio or Linkerd for advanced traffic management
   - Circuit breakers, retries, timeouts

**Example HPA**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Monitoring & Observability

### Metrics to Track

- **Backend**: Request rate, latency (p50, p95, p99), error rate
- **Sandbox**: Execution time, memory usage, failure rate
- **Database**: Connection pool usage, query time, replication lag
- **Queue**: Queue depth, processing time, failed jobs

### Tools

- **Prometheus + Grafana**: Metrics and dashboards
- **ELK Stack**: Log aggregation and analysis
- **Jaeger/Zipkin**: Distributed tracing
- **Sentry**: Error tracking

---

## Migration Checklist

### Phase 1: Horizontal Scaling
- [ ] Add load balancer configuration
- [ ] Update docker-compose for multiple backend replicas
- [ ] Configure Redis for Socket.IO adapter
- [ ] Test WebSocket connections across instances
- [ ] Monitor connection pool usage

### Phase 2: Sandbox Microservice
- [ ] Create sandbox service package
- [ ] Implement container isolation
- [ ] Update FunctionNode to call sandbox service
- [ ] Add retry and timeout logic
- [ ] Load test sandbox service

### Phase 3: Queue-Based Execution
- [ ] Set up Redis/BullMQ
- [ ] Create worker service
- [ ] Update WorkflowExecutor to enqueue
- [ ] Implement WebSocket updates from workers
- [ ] Add queue monitoring

### Phase 4: Database Scaling
- [ ] Set up PostgreSQL read replicas
- [ ] Configure TypeORM read/write splitting
- [ ] Implement caching layer
- [ ] Set up database monitoring

### Phase 5: Kubernetes
- [ ] Create Kubernetes manifests
- [ ] Set up ingress controller
- [ ] Configure HPA
- [ ] Set up monitoring stack
- [ ] Test rolling updates

---

## Performance Targets

| Metric | MVP | Phase 1 | Phase 2 | Phase 3 |
|--------|-----|---------|---------|---------|
| Concurrent Users | 10 | 100 | 500 | 1000+ |
| Workflows/sec | 1 | 10 | 50 | 100+ |
| API Latency (p95) | <500ms | <200ms | <100ms | <50ms |
| Sandbox Execution | <5s | <5s | <3s | <2s |
| Database Connections | 5-10 | 20-50 | 50-100 | 100+ |

---

## Cost Considerations

- **Phase 1**: Minimal increase (more containers)
- **Phase 2**: Moderate (dedicated sandbox containers)
- **Phase 3**: Moderate (Redis, worker nodes)
- **Phase 4**: Higher (database replicas, caching)
- **Phase 5**: Variable (Kubernetes cluster costs)

---

## Security Considerations

1. **Sandbox Isolation**: Ensure code execution cannot escape container
2. **Network Policies**: Restrict inter-service communication
3. **Secrets Management**: Use Kubernetes secrets or Vault
4. **Rate Limiting**: Implement at load balancer level
5. **Audit Logging**: Track all workflow executions and changes

---

## References

- [TypeORM Connection Options](https://typeorm.io/data-source-options)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Firecracker Documentation](https://firecracker-microvm.github.io/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
