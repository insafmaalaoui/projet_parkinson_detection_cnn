#!/bin/bash
# Script de démarrage rapide pour Mac/Linux

echo ""
echo "=========================================="
echo " MediDiagnose - Lancement Rapide (Mac/Linux)"
echo "=========================================="
echo ""

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "[ERREUR] Python3 n'est pas installé"
    echo ""
    echo "Solution (Mac):"
    echo "  brew install python3"
    echo ""
    echo "Solution (Linux/Ubuntu):"
    echo "  sudo apt-get install python3 python3-venv python3-pip"
    echo ""
    exit 1
fi

echo "[1/4] Création de l'environnement virtuel..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "      ✅ Environnement virtuel créé"
else
    echo "      ℹ️  Environnement virtuel déjà existant"
fi

echo ""
echo "[2/4] Activation de l'environnement virtuel..."
source venv/bin/activate
echo "      ✅ Environnement activé"

echo ""
echo "[3/4] Installation des dépendances..."
pip install -r requirements.txt -q
echo "      ✅ Dépendances installées"

echo ""
echo "[4/4] Initialisation de la base de données..."
python3 init_db.py
echo "      ✅ Base de données prête"

echo ""
echo "=========================================="
echo " ✅ SETUP TERMINÉ!"
echo "=========================================="
echo ""
echo "🚀 Lancement du serveur FastAPI..."
echo "   En 3 secondes..."
echo ""
sleep 3

python3 main.py
