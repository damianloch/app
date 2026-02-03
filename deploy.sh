#!/bin/bash

set -e

echo "Product Recommendations API - Quick Deploy Script"
echo "=================================================="
echo

# Check if GCP_PROJECT_ID is set
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID environment variable is not set"
    echo "Usage: export GCP_PROJECT_ID=your-project-id && ./deploy.sh"
    exit 1
fi

echo "Using GCP Project: $GCP_PROJECT_ID"
echo

# Build Docker image
echo "Building Docker image..."
docker build -t product-recommendations-api:latest .

# Tag for GCR
echo "Tagging image for Google Container Registry..."
docker tag product-recommendations-api:latest gcr.io/$GCP_PROJECT_ID/product-recommendations-api:latest

# Push to GCR
echo "Pushing to Google Container Registry..."
docker push gcr.io/$GCP_PROJECT_ID/product-recommendations-api:latest

# Update k8s manifests with project ID
echo "Updating Kubernetes manifests..."
sed -i.bak "s/YOUR_GCP_PROJECT_ID/$GCP_PROJECT_ID/g" k8s/configmap.yaml
sed -i.bak "s/YOUR_PROJECT_ID/$GCP_PROJECT_ID/g" k8s/deployment.yaml

# Create namespace
echo "Creating Kubernetes namespace..."
kubectl apply -f k8s/namespace.yaml

# Create secret if service-account.json exists
if [ -f "service-account.json" ]; then
    echo "Creating Kubernetes secret for GCP service account..."
    kubectl create secret generic gcp-service-account-key \
        --from-file=key.json=./service-account.json \
        --namespace=product-api \
        --dry-run=client -o yaml | kubectl apply -f -
else
    echo "Warning: service-account.json not found. Please create the secret manually."
fi

# Apply configurations
echo "Applying Kubernetes configurations..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/traffic-generator.yaml

# Restore original manifests
mv k8s/configmap.yaml.bak k8s/configmap.yaml
mv k8s/deployment.yaml.bak k8s/deployment.yaml

echo
echo "Deployment complete!"
echo
echo "Checking deployment status..."
kubectl get pods -n product-api
echo
echo "To get the external IP:"
echo "  kubectl get svc product-recommendations-api -n product-api"
echo
echo "To view logs:"
echo "  kubectl logs -n product-api -l app=product-recommendations-api -f"
echo
echo "To monitor memory usage:"
echo "  kubectl top pods -n product-api --watch"
