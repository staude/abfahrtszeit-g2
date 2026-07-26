#!/usr/bin/env bash
# Setup fuer abfahrtszeit-g2 (Even G2 Plugin)
set -euo pipefail
cd "$(dirname "$0")"

# Node pruefen
if ! command -v node >/dev/null; then
  echo "Node fehlt. Node 20 LTS oder 22+ installieren." >&2
  exit 1
fi

# Abhaengigkeiten
npm install

# Globale Toolchain nur installieren, wenn sie fehlt
command -v evenhub >/dev/null 2>&1 || npm install -g @evenrealities/evenhub-cli
command -v evenhub-simulator >/dev/null 2>&1 || npm install -g @evenrealities/evenhub-simulator

# Git-Repo mit richtiger Identitaet (Projekt-Standards)
if [ ! -d .git ]; then
  git init -b main
  git config user.name "Frank Neumann-Staude"
  git config user.email "frank@staude.net"
fi

echo "Fertig. Start: npm run dev + evenhub-simulator http://localhost:5173"
