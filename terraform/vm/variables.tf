variable "project_id" {
  description = "The GCP project ID to deploy the VM into"
  type        = string
}

variable "region" {
  description = "The GCP region for the VM"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone for the VM"
  type        = string
  default     = "us-central1-a"
}
