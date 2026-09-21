output "static_web_app_hostname" {
  description = "Azure-generated hostname for the portfolio."
  value       = azurerm_static_web_app.portfolio.default_host_name
}

output "static_web_app_name" {
  value = azurerm_static_web_app.portfolio.name
}