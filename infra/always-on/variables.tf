variable "location" {
  description = "Azure region used for the Static Web App resource metadata."
  type        = string
  default     = "eastasia"
}

variable "resource_group_name" {
  description = "Resource group for the always-on portfolio."
  type        = string
  default     = "rg-cloud-resume-prod"
}

variable "static_web_app_name" {
  description = "Globally/regionally acceptable name for the Static Web App resource."
  type        = string
}