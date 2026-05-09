# Mute noisy Datadog alerts using Terraform
# This is a test PR to verify the PR creation workflow

resource "datadog_monitor" "noisy_alert_mute" {
  name    = "Muted Noisy Alert - Test"
  type    = "metric alert"
  message = "This monitor is muted to reduce alert noise."

  query = "avg(last_5m):avg:system.cpu.user{*} > 95"

  monitor_thresholds {
    critical = 95
  }

  tags = ["env:production", "team:sre", "muted:true"]

  # Mute this monitor by default
  priority = 5
}
