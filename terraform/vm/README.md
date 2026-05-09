# GCP Small VM

Terraform configuration to deploy a small VM instance on Google Cloud Platform.

## Specifications

| Property | Value |
|----------|-------|
| Machine Type | e2-micro (2 vCPU, 1 GB RAM) |
| OS | Debian 12 |
| Disk | 10 GB pd-standard |
| Region | us-central1 (configurable) |
| Network | Default VPC with public IP |

## Usage

1. Copy the example tfvars file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your GCP project ID.

3. Initialize and apply:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## Variables

| Name | Description | Default |
|------|-------------|--------|
| project_id | GCP project ID | (required) |
| region | GCP region | us-central1 |
| zone | GCP zone | us-central1-a |

## Outputs

- `instance_name` - Name of the created VM
- `instance_external_ip` - Public IP address
- `instance_internal_ip` - Internal IP address
- `instance_self_link` - GCP self-link for the instance
