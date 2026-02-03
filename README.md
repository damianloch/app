# E-Commerce Microservices Platform

A production-ready microservices architecture for e-commerce operations with full OpenTelemetry tracing integration for Google Cloud Trace.

## Architecture

This platform consists of three microservices:

- **Frontend API** (Port 8080) - API gateway that orchestrates checkout operations
- **Product Service** (Port 8081) - Product catalog management
- **Payment Service** (Port 8082) - Payment processing
- **PostgreSQL** - Shared database backend

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google Cloud Platform account
- Kubernetes cluster (GKE recommended)
- `kubectl` CLI tool
- `gcloud` CLI tool

## Local Development

### Install Dependencies

Each service has its own dependencies:

```bash
cd services/frontend-api && npm install
cd ../product-service && npm install
cd ../payment-service && npm install
```

### Configure Environment

Create service account credentials and set:

```bash
export GCP_PROJECT_ID=your-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Docker Build

Build all service images:

```bash
# Frontend API
cd services/frontend-api
docker buildx build --platform linux/amd64 -t gcr.io/$GCP_PROJECT_ID/frontend-api:latest --push .

# Product Service
cd ../product-service
docker buildx build --platform linux/amd64 -t gcr.io/$GCP_PROJECT_ID/product-service:latest --push .

# Payment Service
cd ../payment-service
docker buildx build --platform linux/amd64 -t gcr.io/$GCP_PROJECT_ID/payment-service:latest --push .
```

## Google Cloud Setup

### Enable Required APIs

```bash
gcloud services enable cloudtrace.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Create Service Account

```bash
gcloud iam service-accounts create ecommerce-api-sa \
    --display-name="E-Commerce API Service Account"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
    --member="serviceAccount:ecommerce-api-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudtrace.agent"

gcloud iam service-accounts keys create service-account.json \
    --iam-account=ecommerce-api-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com
```

### Create GKE Cluster

```bash
gcloud container clusters create ecommerce-cluster \
    --zone=us-central1-a \
    --num-nodes=2 \
    --machine-type=e2-medium \
    --logging=SYSTEM,WORKLOAD \
    --monitoring=SYSTEM

gcloud container clusters get-credentials ecommerce-cluster --zone=us-central1-a
```

## Kubernetes Deployment

### 1. Update Manifests

Update the following files with your GCP project ID:
- `k8s/configmap.yaml` - Set `gcp_project_id`
- `k8s/frontend-deployment.yaml` - Update image path
- `k8s/product-deployment.yaml` - Update image path
- `k8s/payment-deployment.yaml` - Update image path

### 2. Create Kubernetes Secret

```bash
kubectl apply -f k8s/namespace.yaml

kubectl create secret generic gcp-service-account-key \
    --from-file=key.json=./service-account.json \
    --namespace=product-api
```

### 3. Deploy Database

```bash
kubectl apply -f k8s/postgres-init.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n product-api --timeout=120s
```

### 4. Initialize Database

```bash
POSTGRES_POD=$(kubectl get pod -n product-api -l app=postgres -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n product-api $POSTGRES_POD -- psql -U appuser -d ecommerce -c "
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  category VARCHAR(100),
  price DECIMAL(10,2),
  description TEXT,
  in_stock BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  product_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, category, price, description) VALUES
  ('Wireless Headphones', 'Electronics', 79.99, 'High-quality wireless headphones'),
  ('Smart Watch', 'Electronics', 199.99, 'Fitness tracking smartwatch'),
  ('Laptop Stand', 'Office', 34.99, 'Ergonomic aluminum laptop stand'),
  ('Mechanical Keyboard', 'Electronics', 129.99, 'RGB mechanical gaming keyboard'),
  ('USB-C Hub', 'Electronics', 49.99, '7-in-1 USB-C multiport adapter')
ON CONFLICT DO NOTHING;
"
```

### 5. Deploy Microservices

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/product-deployment.yaml
kubectl apply -f k8s/payment-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### 6. Deploy Traffic Generator

```bash
kubectl apply -f k8s/traffic-generator.yaml
```

## API Endpoints

### Frontend API

```bash
# Get external IP
EXTERNAL_IP=$(kubectl get svc frontend-api -n product-api -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Checkout
curl http://$EXTERNAL_IP/api/checkout/user-123?productId=1

# List products
curl http://$EXTERNAL_IP/api/products

# Health check
curl http://$EXTERNAL_IP/health
```

### Direct Service Access (Internal)

```bash
# Product Service
kubectl port-forward -n product-api svc/product-service 8081:8081
curl http://localhost:8081/api/products/1

# Payment Service
kubectl port-forward -n product-api svc/payment-service 8082:8082
curl -X POST http://localhost:8082/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","productId":1,"amount":99.99}'
```

## Monitoring

### View Logs

```bash
# All services
kubectl logs -n product-api -l app=frontend-api -f
kubectl logs -n product-api -l app=product-service -f
kubectl logs -n product-api -l app=payment-service -f

# Database
kubectl logs -n product-api -l app=postgres -f
```

### Check Resource Usage

```bash
kubectl top pods -n product-api --watch
```

### View Traces

Navigate to [Google Cloud Trace](https://console.cloud.google.com/traces) to view distributed traces across all services.

## Traffic Generation

Automated traffic generation runs every minute via Kubernetes CronJob:

```bash
# Check status
kubectl get cronjobs -n product-api
kubectl get jobs -n product-api

# View logs
kubectl logs -n product-api -l app=traffic-generator
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n product-api
kubectl describe pod -n product-api <pod-name>
```

### Database Connections

```bash
kubectl exec -it -n product-api $(kubectl get pod -n product-api -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- \
  psql -U appuser -d ecommerce -c "SELECT count(*) FROM pg_stat_activity WHERE datname='ecommerce';"
```

### Service Health

```bash
kubectl get svc -n product-api
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace product-api

# Delete cluster
gcloud container clusters delete ecommerce-cluster --zone=us-central1-a

# Delete service account
gcloud iam service-accounts delete ecommerce-api-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com
```

## Project Structure

```
.
├── services/
│   ├── frontend-api/           # API Gateway
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── product-service/        # Product Catalog
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── payment-service/        # Payment Processing
│       ├── src/index.js
│       ├── package.json
│       └── Dockerfile
├── shared/
│   └── tracing.js              # Shared OpenTelemetry config
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── postgres-*.yaml         # Database deployment
│   ├── frontend-deployment.yaml
│   ├── product-deployment.yaml
│   ├── payment-deployment.yaml
│   └── traffic-generator.yaml
└── README.md
```

## License

MIT
