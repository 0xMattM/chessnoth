#!/bin/bash
# Script de build que ignora errores de ESLint
set -e

# Ejecutar build pero ignorar errores de ESLint
ESLINT_NO_DEV_ERRORS=true NEXT_PRIVATE_SKIP_ESLINT=1 next build || {
  # Si falla, intentar de nuevo sin ESLint
  echo "Build falló, reintentando sin ESLint..."
  SKIP_ESLINT=true next build
}

