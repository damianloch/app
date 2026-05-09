output "instance_name" {
  description = "Name of the VM instance"
  value       = google_compute_instance.small_vm.name
}

output "instance_external_ip" {
  description = "External IP address of the VM"
  value       = google_compute_instance.small_vm.network_interface[0].access_config[0].nat_ip
}

output "instance_internal_ip" {
  description = "Internal IP address of the VM"
  value       = google_compute_instance.small_vm.network_interface[0].network_ip
}

output "instance_self_link" {
  description = "Self-link of the VM instance"
  value       = google_compute_instance.small_vm.self_link
}
