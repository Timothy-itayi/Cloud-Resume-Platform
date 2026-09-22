# Cloud Resume Platform

Static website that houses the cloud and IT work. Azure Static Web Apps on the Free SKU. Terraform creates the resource. GitHub Actions deploys `site/` on push to `main`.

This repo is the index. It does not host PitWall, run Docker, talk to Entra ID, or execute PowerShell checks. Those live in the repositories below.

## Documentation

| Page | What it covers |
| --- | --- |
| [site/](site/) | Static portfolio |
| [infra/always-on/](infra/always-on/) | Terraform for the Static Web App |
| [Deploy workflow](.github/workflows/deploy-site.yml) | GitHub Actions upload to Azure |

## Projects

### [PitWall](https://github.com/Timothy-itayi/PitWall)

Serverless Formula 1 dashboard on Azure, backed by historical OpenF1 data.

The browser never calls OpenF1. Visitors read a Function API that serves a private Blob cache. A timer writes `dashboard.json`; race details are cache-aside. The Function App is a standalone resource because Static Web Apps managed functions have no timer trigger on the Free SKU.

Live: [https://jolly-mud-0b0e27600.5.azurestaticapps.net](https://jolly-mud-0b0e27600.5.azurestaticapps.net)

| Page | What it covers |
| --- | --- |
| [Features](https://github.com/Timothy-itayi/PitWall/blob/main/docs/features.md) | Season So Far, PitWall Battle, Race Timeline |
| [Architecture](https://github.com/Timothy-itayi/PitWall/blob/main/docs/architecture.md) | Request paths, cache-aside, cost, CI |
| [API](https://github.com/Timothy-itayi/PitWall/blob/main/docs/api.md) | HTTP contracts, cache headers, snapshot shapes |
| [Reliability](https://github.com/Timothy-itayi/PitWall/blob/main/docs/reliability.md) | Last-known-good dashboard, stale flag |
| [Security](https://github.com/Timothy-itayi/PitWall/blob/main/docs/security.md) | Identity, CORS, refresh protection |

Evidence screenshots live in [PitWall `evidence/`](https://github.com/Timothy-itayi/PitWall/tree/main/evidence).

### [IT Operations Homelab](https://github.com/Timothy-itayi/operation-homelabs)

On-call practice for the workflow a service desk already uses: tickets, identity, and monitoring — without paying for a cloud help-desk stack.

The lab is Docker Compose on localhost. One folder per service. `.env` stays off Git. osTicket, MariaDB, LLDAP, and Uptime Kuma bind to `127.0.0.1`. MariaDB has no host port. It is not a public deployment and it is not Active Directory.

| Page | What it covers |
| --- | --- |
| [Docker setup](https://github.com/Timothy-itayi/operation-homelabs/blob/main/docs/01-docker-setup.md) | Repo layout, secrets, localhost binds |
| [osTicket deploy](https://github.com/Timothy-itayi/operation-homelabs/blob/main/docs/02-osticket-deployment.md) | Compose design, first boot, recovery |
| [Ticket scenarios](https://github.com/Timothy-itayi/operation-homelabs/blob/main/docs/03-osticket-scenarios.md) | VPN, password, access, printer |
| [LLDAP](https://github.com/Timothy-itayi/operation-homelabs/blob/main/docs/04-lldap-identity.md) | Directory users, password reset |
| [Uptime Kuma](https://github.com/Timothy-itayi/operation-homelabs/blob/main/docs/05-uptime-kuma.md) | Monitors, status page, simulated outage |

Evidence screenshots live in [operation-homelabs `evidence/`](https://github.com/Timothy-itayi/operation-homelabs/tree/main/evidence).

### [Azure RBAC & Storage Lab](https://github.com/Timothy-itayi/azure-rbac-storage-lab)

A disposable Azure lab that proves least-privilege Blob Storage access for a separate identity.

Storage existed only so the access test had something to fail against. `Storage Blob Data Reader` at container scope: read succeeded, upload was denied. Changing that one role to `Storage Blob Data Contributor` made the same write succeed. Identity and resources were deleted afterwards. This is not a standing tenant and it is not a production storage design.

| Page | What it covers |
| --- | --- |
| [Lab walkthrough](https://github.com/Timothy-itayi/azure-rbac-storage-lab/blob/main/docs/walkthrough.md) | Setup, tests, and commands |
| [CLI evidence](https://github.com/Timothy-itayi/azure-rbac-storage-lab/blob/main/docs/evidence.md) | Read allowed, write denied, role change, cleanup |
| [Security notes](https://github.com/Timothy-itayi/azure-rbac-storage-lab/blob/main/docs/security.md) | Lab controls vs a real tenant |

### [PowerShell IT Support Toolkit](https://github.com/Timothy-itayi/powershell-it-support-toolkit)

On-demand diagnostics for the checks support engineers already repeat: DNS, ICMP, TCP, HTTP, and obvious account-access mistakes.

The toolkit is PowerShell 7 on macOS. It reports state. It does not remediate, talk to Active Directory, or replace Uptime Kuma. Checks target existing local services (osTicket, LLDAP, Uptime Kuma) plus a public Azure Static Web App — not a new infrastructure stack.

Scripts emit PowerShell objects so results can be formatted, filtered, or exported. Identity data is synthetic. `config/services.json` stays local and gitignored.

| Page | What it covers |
| --- | --- |
| [Getting started](https://github.com/Timothy-itayi/powershell-it-support-toolkit/blob/main/docs/getting-started.md) | PowerShell 7, config copy, smoke test |
| [Architecture](https://github.com/Timothy-itayi/powershell-it-support-toolkit/blob/main/docs/architecture.md) | Layout, constraints, and trade-offs |
| [Test-NetworkPath](https://github.com/Timothy-itayi/powershell-it-support-toolkit/blob/main/docs/network-path.md) | DNS, ICMP, and TCP reachability |
| [Test-ServiceHealth](https://github.com/Timothy-itayi/powershell-it-support-toolkit/blob/main/docs/service-health.md) | HTTP checks, outage, recovery |
| [Get-AccountAudit](https://github.com/Timothy-itayi/powershell-it-support-toolkit/blob/main/docs/account-audit.md) | Disabled accounts and access-review findings |

Evidence screenshots live in [powershell-it-support-toolkit `evidence/`](https://github.com/Timothy-itayi/powershell-it-support-toolkit/tree/main/evidence).
