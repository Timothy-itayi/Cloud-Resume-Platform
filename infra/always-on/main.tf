resource "azurerm_resource_group" "portfolio" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    project     = "cloud-resume"
    environment = "prod"
    lifecycle   = "always-on"
  }
}

resource "azurerm_static_web_app" "portfolio" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.portfolio.name
  location            = azurerm_resource_group.portfolio.location

  sku_tier = "Free"
  sku_size = "Free"

  tags = {
    project     = "cloud-resume"
    environment = "prod"
    lifecycle   = "always-on"
  }
}
