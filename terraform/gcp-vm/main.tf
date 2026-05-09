terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "caramel-spot-460614-c7"
  region  = "us-central1"
  zone    = "us-central1-c"
}

resource "google_compute_instance" "small_vm" {
  name         = "aurora-small-vm"
  machine_type = "e2-small"
  zone         = "us-central1-c"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"

    access_config {
      // Ephemeral public IP
    }
  }

  metadata = {
    created-by = "aurora"
  }

  tags = ["http-server", "https-server"]

  labels = {
    environment = "dev"
    managed-by  = "aurora"
  }
}

output "instance_name" {
  value = google_compute_instance.small_vm.name
}

output "instance_external_ip" {
  value = google_compute_instance.small_vm.network_interface[0].access_config[0].nat_ip
}

output "instance_internal_ip" {
  value = google_compute_instance.small_vm.network_interface[0].network_ip
}
