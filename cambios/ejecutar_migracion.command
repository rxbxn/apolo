#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "============================================================"
echo "  MIGRACIÓN APOLO - Instalando dependencias..."
echo "============================================================"
pip3 install requests pandas openpyxl --break-system-packages -q 2>/dev/null || \
pip3 install requests pandas openpyxl -q 2>/dev/null || \
python3 -m pip install requests pandas openpyxl -q
echo ""
python3 run_migration.py
echo ""
echo "Presiona Enter para cerrar..."
read
