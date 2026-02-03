# Runbook: Database Connection Issues

**Last Updated:** 2026-01-15  
**Owner:** Platform Team  
**Severity:** P1/P2

## Overview

This runbook covers investigation and mitigation steps for database connection pool exhaustion, timeouts, and related performance issues in our microservices.

## Symptoms

- Services reporting database connection timeout errors
- HTTP 500 errors from services that depend on PostgreSQL
- Elevated error rates in downstream services
- `timeout exceeded when trying to connect` in application logs

## Initial Investigation

### 1. Check Service Health

```bash
# Check if affected services are running
kubectl get pods -n product-api

# Review recent logs for errors
kubectl logs -n product-api -l app=<service-name> --tail=100
```

### 2. Verify Database Connectivity

```bash
# Check PostgreSQL pod status
kubectl get pods -n product-api -l app=postgres

# Test basic connectivity
kubectl exec -it -n product-api <postgres-pod> -- psql -U appuser -d ecommerce -c "SELECT 1;"
```

### 3. Analyze Connection Pool Metrics

Query the database to understand current connection usage:

```sql
-- Check total connections
SELECT count(*) FROM pg_stat_activity WHERE datname='ecommerce';

-- Break down by state
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname='ecommerce' 
GROUP BY state;

-- Check connection age
SELECT 
  pid,
  usename,
  application_name,
  state,
  NOW() - state_change as time_in_state,
  query
FROM pg_stat_activity 
WHERE datname='ecommerce'
ORDER BY state_change;
```

**What to look for:**
- Are we at or near `max_connections`?
- Are most connections `active` or `idle`?
- Are there old connections that haven't changed state recently?

### 4. Review Application Pool Configuration

Each microservice has its own connection pool configuration. Verify settings:

```javascript
// Typical pg pool config
{
  max: 5,                        // Max connections per service instance
  connectionTimeoutMillis: 5000, // How long to wait for connection
  idleTimeoutMillis: 30000       // Close idle connections after 30s
}
```

**Check:**
- Is `idleTimeoutMillis` too high?
- Are services requesting more connections than pool allows?
- Are there multiple instances of services?

### 5. Check Distributed Traces (CRITICAL)

Navigate to Cloud Trace and search for affected service spans:

**Look for patterns:**
- High latency on database operations
- Errors in database-related spans
- Compare successful vs failed request traces
- Check span events and attributes for clues

**Useful trace filters:**
```
service:<service-name>
status:error
span.duration > 4s
```

**Deep dive into successful vs failed traces:**

1. **Find successful requests** (before failures started):
   - Filter: `service:payment-service status:ok`
   - Look at span events - what lifecycle events are recorded?
   - Check for database-related events (connection acquired, query executed, etc.)

2. **Compare multiple successful traces:**
   - Do all successful requests have the same span events?
   - Are any events inconsistent or missing in some traces?
   - Check for patterns like: some have event X, others don't

3. **Check for resource cleanup events:**
   - Look for events indicating resource release (e.g., `connection_released`, `cleanup`, etc.)
   - If these events exist, are they present in ALL successful traces?
   - **Red flag:** Inconsistent cleanup events across successful requests

4. **Analyze span attributes:**
   - Check custom attributes like `db.pool.size`, `db.pool.idle`, `connection.leaked`
   - Look for attributes that indicate resource state
   - Compare attribute values across multiple traces

**Key questions to answer from traces:**
- Is there evidence of resource acquisition in spans? (connection, file handle, etc.)
- Is there matching evidence of resource release?
- Are cleanup operations happening consistently?
- Do failed requests show different patterns than successful ones?

**Example investigation:**
```
1. Query: service:payment-service operation:processPayment status:ok
2. Sample 10-20 successful traces from before failure
3. Check each trace for presence of cleanup/release events
4. Calculate: What % have cleanup events? (Should be 100%)
5. If < 100%, you've found a resource leak pattern
```

## Common Root Causes

### A. Traffic Spike

**Indicators:**
- All connections active (not idle)
- Recent increase in request rate
- Connections at max capacity

**Fix:**
- Scale up service replicas
- Increase database max_connections
- Add rate limiting

### B. Slow Queries

**Indicators:**
- Connections mostly active
- Long-running queries in `pg_stat_activity`
- Database CPU elevated

**Fix:**
- Identify slow queries with `pg_stat_statements`
- Add missing indexes
- Optimize query logic

### C. Connection Pool Misconfiguration

**Indicators:**
- Services timing out but database not at capacity
- Pool settings too aggressive

**Fix:**
- Adjust timeout settings
- Review pool size per replica

### D. Connection Lifecycle Issues

**Indicators:**
- Connections in `idle` state for extended periods
- Low overall connection count but still experiencing timeouts
- Pattern of gradual degradation over time

**Investigation steps:**
1. Check how long idle connections have been in that state
2. Review application code for connection handling patterns
3. Look for missing connection cleanup in error paths
4. Check if connections are properly released after use

**In application code, verify:**
- Connections acquired with `pool.connect()` are released
- Release happens in `finally` blocks, not just success paths
- Error handlers don't prevent connection cleanup
- No early returns that skip cleanup code

**Correct pattern example:**
```javascript
let client;
try {
  client = await pool.connect();
  
  // Execute queries
  const result = await client.query('...');
  
  // Process result
  res.json(result);
  
} catch (err) {
  // Handle errors
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
  
} finally {
  // ALWAYS release connection, regardless of success or failure
  if (client) {
    client.release();
  }
}
```

**Anti-patterns to watch for:**
- Connection release only in success path (not in error/finally)
- Conditional release without covering all paths
- Early returns before release
- Missing finally block for cleanup

## Mitigation Steps

### Immediate (< 5 minutes)

1. **Restart affected service** to clear connection pool:
   ```bash
   kubectl rollout restart deployment <service-name> -n product-api
   ```

2. **Monitor recovery:**
   ```bash
   kubectl logs -n product-api -l app=<service-name> -f
   ```

### Short-term (< 1 hour)

1. Reduce traffic if possible (rate limiting, circuit breakers)
2. Scale up service replicas if capacity issue
3. Temporarily increase database connection limits
4. Monitor connection pool metrics continuously

### Long-term

1. Fix root cause in application code
2. Add connection pool monitoring and alerts
3. Implement connection pool health checks
4. Add automated tests for connection lifecycle
5. Review all services for similar patterns

## Monitoring & Alerts

**Key metrics to track:**
- `postgres.connections.total`
- `postgres.connections.idle`
- `postgres.connections.active`
- `service.db.timeout_errors`
- `service.db.connection_wait_time`

**Recommended alerts:**
- Idle connections > 40% of max_connections for > 2 minutes
- Connection timeout errors > 5% of requests
- Service error rate > 10%

## Related Documentation

- [PostgreSQL Connection Pooling Best Practices](../guides/postgres-pooling.md)
- [Microservices Database Guidelines](../guides/microservices-db.md)
- [Incident Response Process](../processes/incident-response.md)

## Post-Incident

After resolving the issue:

1. Document findings in incident report
2. Update service code if bug found
3. Add/update tests to prevent regression
4. Review similar code patterns in other services
5. Update alerts based on learnings

---

**Questions? Contact:** #platform-team on Slack
