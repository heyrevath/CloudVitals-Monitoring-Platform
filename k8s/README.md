# Kubernetes Manifests (Planned Migration)

This directory contains Kubernetes manifests for a planned migration of CloudVitals from Docker Compose on AWS EC2 to a Kubernetes cluster.

## Current Status
CloudVitals is currently deployed using Docker Compose on AWS EC2.
Kubernetes migration is planned as a future enhancement.

## Planned Architecture
- **Namespace:** cloudvitals
- **Deployments:** frontend, backend, prometheus, alertmanager, loki, promtail, grafana
- **Services:** ClusterIP for internal, LoadBalancer/Ingress for external
- **Ingress:** NGINX Ingress Controller

## Files
| File | Description |
|------|-------------|
| `backend-deployment.yaml` | Node.js backend deployment |
| `backend-service.yaml` | Backend ClusterIP service |
| `frontend-deployment.yaml` | React frontend deployment |
| `frontend-service.yaml` | Frontend ClusterIP service |
| `prometheus-deployment.yaml` | Prometheus metrics server |
| `cloudvitals-ingress.yaml` | Main ingress routing |
| `grafana-deployment.yaml` | Grafana dashboard |
| `grafana-ingress.yaml` | Grafana ingress routing |

## Future Enhancements
- Add resource limits and requests to all deployments
- Add liveness and readiness probes
- Configure Horizontal Pod Autoscaler (HPA)
- Add ConfigMaps and Secrets management
- Deploy to AWS EKS
