#!/bin/bash

# GoFaGo EKS Deployment Script
# This script deploys the GoFaGo application to AWS EKS

set -e

# Configuration
CLUSTER_NAME="gofago-cluster"
REGION="us-west-2"
ACCOUNT_ID="YOUR_ACCOUNT_ID"
NAMESPACE="gofago"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting GoFaGo EKS Deployment${NC}"
echo "=================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed. Please install kubectl first.${NC}"
    exit 1
fi

# Check if aws cli is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install AWS CLI first.${NC}"
    exit 1
fi

# Check if eksctl is installed
if ! command -v eksctl &> /dev/null; then
    echo -e "${RED}❌ eksctl is not installed. Please install eksctl first.${NC}"
    exit 1
fi

# Update kubeconfig
echo -e "${YELLOW}📋 Updating kubeconfig for cluster: ${CLUSTER_NAME}${NC}"
aws eks update-kubeconfig --region ${REGION} --name ${CLUSTER_NAME}

# Create namespace
echo -e "${YELLOW}📁 Creating namespace: ${NAMESPACE}${NC}"
kubectl apply -f k8s/namespace-ingress.yaml

# Create secrets and configmap
echo -e "${YELLOW}🔐 Creating secrets and configmap${NC}"
kubectl apply -f k8s/secrets-configmap.yaml

# Deploy backend
echo -e "${YELLOW}🔧 Deploying backend service${NC}"
kubectl apply -f k8s/backend-deployment.yaml

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/gofago-backend -n ${NAMESPACE}

# Deploy frontend
echo -e "${YELLOW}🎨 Deploying frontend service${NC}"
kubectl apply -f k8s/frontend-deployment.yaml

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to be ready${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/gofago-frontend -n ${NAMESPACE}

# Apply ingress
echo -e "${YELLOW}🌐 Applying ingress configuration${NC}"
kubectl apply -f k8s/namespace-ingress.yaml

# Get service URLs
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "=================================="
echo -e "${GREEN}📊 Deployment Status:${NC}"
kubectl get pods -n ${NAMESPACE}
echo ""
echo -e "${GREEN}🌐 Services:${NC}"
kubectl get services -n ${NAMESPACE}
echo ""
echo -e "${GREEN}🔗 Ingress:${NC}"
kubectl get ingress -n ${NAMESPACE}
echo ""

# Get LoadBalancer URL
LB_URL=$(kubectl get service gofago-frontend-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
if [ ! -z "$LB_URL" ]; then
    echo -e "${GREEN}🎉 Application is available at: http://${LB_URL}${NC}"
else
    echo -e "${YELLOW}⏳ LoadBalancer is still provisioning. Check with: kubectl get service gofago-frontend-service -n ${NAMESPACE}${NC}"
fi

echo -e "${GREEN}🎯 Useful Commands:${NC}"
echo "  View pods: kubectl get pods -n ${NAMESPACE}"
echo "  View logs: kubectl logs -f deployment/gofago-frontend -n ${NAMESPACE}"
echo "  Scale frontend: kubectl scale deployment gofago-frontend --replicas=5 -n ${NAMESPACE}"
echo "  Delete deployment: kubectl delete namespace ${NAMESPACE}"
