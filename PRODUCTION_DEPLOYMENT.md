# Production Configuration for GoFaGo EKS Deployment

## Prerequisites
1. AWS CLI configured with appropriate permissions
2. kubectl installed
3. eksctl installed
4. Docker installed
5. EKS cluster created

## EKS Cluster Setup Commands

```bash
# Create EKS cluster
eksctl create cluster \
  --name gofago-cluster \
  --region us-west-2 \
  --nodegroup-name gofago-nodes \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed \
  --with-oidc \
  --ssh-access \
  --ssh-public-key your-key-name

# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller/crds?ref=master"
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=gofago-cluster \
  --set serviceAccount.create=false \
  --set region=us-west-2 \
  --set vpcId=vpc-xxxxxxxxx
```

## ECR Repository Setup

```bash
# Create ECR repositories
aws ecr create-repository --repository-name gofago-backend --region us-west-2
aws ecr create-repository --repository-name gofago-frontend --region us-west-2

# Get login token
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
```

## Environment Variables

Create a `.env` file with:
```
AWS_ACCOUNT_ID=your-account-id
AWS_REGION=us-west-2
ANTHROPIC_API_KEY=your-anthropic-api-key
DOMAIN_NAME=gofago.yourdomain.com
SSL_CERT_ARN=arn:aws:acm:us-west-2:your-account-id:certificate/your-cert-id
```

## Scaling Configuration

### Horizontal Pod Autoscaler (HPA)
- Frontend: 2-10 replicas based on CPU/Memory usage
- Backend: 1-5 replicas based on CPU/Memory usage

### Cluster Autoscaler
- Node group: 2-10 nodes
- Instance type: t3.medium (can be upgraded to t3.large for production)

## Monitoring & Logging

### CloudWatch Integration
```bash
# Install CloudWatch Container Insights
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cloudwatch-namespace.yaml
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent-rbac.yaml
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent-daemonset.yaml
```

## Security Best Practices

1. **Pod Security Standards**: Enabled in EKS
2. **Network Policies**: Restrict pod-to-pod communication
3. **RBAC**: Proper role-based access control
4. **Secrets Management**: Using Kubernetes secrets for API keys
5. **Image Scanning**: ECR image scanning enabled
6. **VPC Security Groups**: Restrictive security group rules

## Cost Optimization

1. **Spot Instances**: Use spot instances for non-critical workloads
2. **Right-sizing**: Monitor and adjust resource requests/limits
3. **Cluster Autoscaler**: Automatically scale nodes based on demand
4. **Reserved Instances**: For predictable workloads

## Backup & Disaster Recovery

1. **EKS Cluster**: Cross-region backup
2. **Application Data**: Regular backups of product data
3. **Configuration**: Git-based configuration management
4. **Secrets**: AWS Secrets Manager integration

## Performance Optimization

1. **Resource Limits**: Proper CPU/Memory limits
2. **Health Checks**: Comprehensive liveness/readiness probes
3. **Load Balancing**: AWS Application Load Balancer
4. **Caching**: Consider Redis for session management
5. **CDN**: CloudFront for static assets
