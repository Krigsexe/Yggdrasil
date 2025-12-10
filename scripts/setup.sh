#!/bin/bash
# =============================================================================
# YGGDRASIL - Installation Script for Linux/macOS
# =============================================================================
# This script sets up YGGDRASIL development environment
# Usage: curl -fsSL https://raw.githubusercontent.com/Krigsexe/yggdrasil/main/scripts/setup.sh | bash
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}"
    echo "============================================="
    echo "    YGGDRASIL - L'Arbre-Monde de l'IA"
    echo "============================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[*]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[X]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_step "Verification des prerequis..."

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 20 ]; then
            print_success "Node.js $(node -v) detecte"
        else
            print_error "Node.js 20+ requis (detecte: $(node -v))"
            exit 1
        fi
    else
        print_error "Node.js n'est pas installe"
        echo "Installez Node.js 20+ depuis: https://nodejs.org"
        exit 1
    fi

    # Check pnpm
    if command_exists pnpm; then
        print_success "pnpm $(pnpm -v) detecte"
    else
        print_warning "pnpm n'est pas installe, installation..."
        npm install -g pnpm
        print_success "pnpm installe"
    fi

    # Check Docker
    if command_exists docker; then
        if docker info >/dev/null 2>&1; then
            print_success "Docker detecte et fonctionnel"
        else
            print_warning "Docker est installe mais pas en cours d'execution"
            echo "Demarrez Docker Desktop ou le service Docker"
        fi
    else
        print_warning "Docker n'est pas installe"
        echo "Installez Docker depuis: https://www.docker.com"
        echo "L'installation continuera, mais vous devrez installer Docker pour la base de donnees"
    fi

    # Check Git
    if command_exists git; then
        print_success "Git $(git --version | cut -d' ' -f3) detecte"
    else
        print_error "Git n'est pas installe"
        exit 1
    fi
}

# Clone repository
clone_repo() {
    print_step "Clonage du repository YGGDRASIL..."

    if [ -d "yggdrasil" ]; then
        print_warning "Le dossier 'yggdrasil' existe deja"
        read -p "Voulez-vous le supprimer et recloner? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf yggdrasil
        else
            cd yggdrasil
            print_step "Mise a jour du repository..."
            git pull
            return
        fi
    fi

    git clone https://github.com/Krigsexe/yggdrasil.git
    cd yggdrasil
    print_success "Repository clone"
}

# Install dependencies
install_deps() {
    print_step "Installation des dependances..."
    pnpm install
    print_success "Dependances installees"
}

# Setup environment
setup_env() {
    print_step "Configuration de l'environnement..."

    if [ -f ".env" ]; then
        print_warning "Le fichier .env existe deja, il ne sera pas ecrase"
    else
        cp .env.example .env
        print_success "Fichier .env cree a partir du template"
    fi
}

# Start Docker services
start_docker() {
    print_step "Demarrage des services Docker..."

    if command_exists docker && docker info >/dev/null 2>&1; then
        docker compose up -d
        print_success "Services Docker demarres"

        # Wait for PostgreSQL to be ready
        print_step "Attente que PostgreSQL soit pret..."
        sleep 5
    else
        print_warning "Docker non disponible, sautez cette etape"
    fi
}

# Initialize database
init_database() {
    print_step "Initialisation de la base de donnees..."

    if command_exists docker && docker info >/dev/null 2>&1; then
        pnpm prisma generate
        pnpm prisma migrate dev --name init 2>/dev/null || pnpm prisma db push
        print_success "Base de donnees initialisee"
    else
        print_warning "Sautez l'initialisation de la base de donnees (Docker requis)"
    fi
}

# Print final instructions
print_instructions() {
    echo ""
    echo -e "${GREEN}============================================="
    echo "    Installation terminee avec succes!"
    echo "=============================================${NC}"
    echo ""
    echo -e "${YELLOW}ETAPES SUIVANTES:${NC}"
    echo ""
    echo "1. Ajoutez vos cles API dans le fichier .env:"
    echo ""
    echo "   GROQ_API_KEY=gsk_xxxx..."
    echo "   GOOGLE_GEMINI_API_KEY=AIzaSy..."
    echo ""
    echo "   Obtenez-les gratuitement:"
    echo "   - Groq: https://console.groq.com/keys"
    echo "   - Gemini: https://aistudio.google.com/apikey"
    echo ""
    echo "2. Demarrez HEIMDALL (backend):"
    echo "   pnpm --filter @yggdrasil/heimdall dev"
    echo ""
    echo "3. Dans un autre terminal, demarrez BIFROST (frontend):"
    echo "   cd packages/bifrost && pnpm dev"
    echo ""
    echo "4. Ouvrez http://localhost:3001 dans votre navigateur"
    echo ""
    echo -e "${BLUE}L'Arbre grandit avec ceux qui le nourrissent.${NC}"
    echo ""
}

# Main execution
main() {
    print_header
    check_prerequisites
    clone_repo
    install_deps
    setup_env
    start_docker
    init_database
    print_instructions
}

main "$@"
