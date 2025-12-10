# =============================================================================
# YGGDRASIL - Installation Script for Windows
# =============================================================================
# This script sets up YGGDRASIL development environment
# Usage: irm https://raw.githubusercontent.com/Krigsexe/yggdrasil/main/scripts/setup.ps1 | iex
# =============================================================================

$ErrorActionPreference = "Stop"

# Colors
function Write-Header {
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Blue
    Write-Host "    YGGDRASIL - L'Arbre-Monde de l'IA" -ForegroundColor Blue
    Write-Host "=============================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[*] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[X] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    return [bool](Get-Command -Name $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Verification des prerequis..."

    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = node -v
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -ge 20) {
            Write-Success "Node.js $nodeVersion detecte"
        } else {
            Write-Error "Node.js 20+ requis (detecte: $nodeVersion)"
            Write-Host "Installez Node.js depuis: https://nodejs.org"
            exit 1
        }
    } else {
        Write-Error "Node.js n'est pas installe"
        Write-Host "Installez Node.js 20+ depuis: https://nodejs.org"
        exit 1
    }

    # Check pnpm
    if (Test-Command "pnpm") {
        $pnpmVersion = pnpm -v
        Write-Success "pnpm $pnpmVersion detecte"
    } else {
        Write-Warning "pnpm n'est pas installe, installation..."
        npm install -g pnpm
        Write-Success "pnpm installe"
    }

    # Check Docker
    if (Test-Command "docker") {
        try {
            docker info 2>$null | Out-Null
            Write-Success "Docker detecte et fonctionnel"
        } catch {
            Write-Warning "Docker est installe mais pas en cours d'execution"
            Write-Host "Demarrez Docker Desktop"
        }
    } else {
        Write-Warning "Docker n'est pas installe"
        Write-Host "Installez Docker depuis: https://www.docker.com"
        Write-Host "L'installation continuera, mais vous devrez installer Docker pour la base de donnees"
    }

    # Check Git
    if (Test-Command "git") {
        $gitVersion = git --version
        Write-Success "Git detecte"
    } else {
        Write-Error "Git n'est pas installe"
        Write-Host "Installez Git depuis: https://git-scm.com"
        exit 1
    }
}

# Clone repository
function Install-Repository {
    Write-Step "Clonage du repository YGGDRASIL..."

    if (Test-Path "yggdrasil") {
        Write-Warning "Le dossier 'yggdrasil' existe deja"
        $response = Read-Host "Voulez-vous le supprimer et recloner? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Remove-Item -Recurse -Force "yggdrasil"
        } else {
            Set-Location "yggdrasil"
            Write-Step "Mise a jour du repository..."
            git pull
            return
        }
    }

    git clone https://github.com/Krigsexe/yggdrasil.git
    Set-Location "yggdrasil"
    Write-Success "Repository clone"
}

# Install dependencies
function Install-Dependencies {
    Write-Step "Installation des dependances..."
    pnpm install
    Write-Success "Dependances installees"
}

# Setup environment
function Initialize-Environment {
    Write-Step "Configuration de l'environnement..."

    if (Test-Path ".env") {
        Write-Warning "Le fichier .env existe deja, il ne sera pas ecrase"
    } else {
        Copy-Item ".env.example" ".env"
        Write-Success "Fichier .env cree a partir du template"
    }
}

# Start Docker services
function Start-DockerServices {
    Write-Step "Demarrage des services Docker..."

    if (Test-Command "docker") {
        try {
            docker info 2>$null | Out-Null
            docker compose up -d
            Write-Success "Services Docker demarres"

            # Wait for PostgreSQL to be ready
            Write-Step "Attente que PostgreSQL soit pret..."
            Start-Sleep -Seconds 5
        } catch {
            Write-Warning "Docker non disponible, sautez cette etape"
        }
    } else {
        Write-Warning "Docker non disponible, sautez cette etape"
    }
}

# Initialize database
function Initialize-Database {
    Write-Step "Initialisation de la base de donnees..."

    if (Test-Command "docker") {
        try {
            docker info 2>$null | Out-Null
            pnpm prisma generate
            try {
                pnpm prisma migrate dev --name init 2>$null
            } catch {
                pnpm prisma db push
            }
            Write-Success "Base de donnees initialisee"
        } catch {
            Write-Warning "Sautez l'initialisation de la base de donnees (Docker requis)"
        }
    } else {
        Write-Warning "Sautez l'initialisation de la base de donnees (Docker requis)"
    }
}

# Print final instructions
function Show-Instructions {
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "    Installation terminee avec succes!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "ETAPES SUIVANTES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ajoutez vos cles API dans le fichier .env:"
    Write-Host ""
    Write-Host "   GROQ_API_KEY=gsk_xxxx..." -ForegroundColor Cyan
    Write-Host "   GOOGLE_GEMINI_API_KEY=AIzaSy..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Obtenez-les gratuitement:"
    Write-Host "   - Groq: https://console.groq.com/keys"
    Write-Host "   - Gemini: https://aistudio.google.com/apikey"
    Write-Host ""
    Write-Host "2. Demarrez HEIMDALL (backend):"
    Write-Host "   pnpm --filter @yggdrasil/heimdall dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Dans un autre terminal, demarrez BIFROST (frontend):"
    Write-Host "   cd packages/bifrost; pnpm dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Ouvrez http://localhost:3001 dans votre navigateur"
    Write-Host ""
    Write-Host "L'Arbre grandit avec ceux qui le nourrissent." -ForegroundColor Blue
    Write-Host ""
}

# Main execution
function Main {
    Write-Header
    Test-Prerequisites
    Install-Repository
    Install-Dependencies
    Initialize-Environment
    Start-DockerServices
    Initialize-Database
    Show-Instructions
}

Main
