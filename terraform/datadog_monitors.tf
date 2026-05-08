# Terraform configuration to mute noisy Datadog alerts
# This is a test PR to validate the PR creation workflow

terraform {
  required_providers {
    datadog = {
      source = "DataDog/datadog"
    }
  }
}

resource "datadog_monitor" "noisy_alert_mute" {
  name    = "Muted Noisy Alert"
  type    = "metric alert"
  message = "This alert has been muted due to excessive noise."
  query   = "avg(last_5m):avg:system.cpu.user{*} > 95"

  monitor_thresholds {
    critical = 95
  }

  tags = ["managed-by:terraform", "status:muted"]
}
