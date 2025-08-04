#!/usr/bin/env bash
set -e

# 1. Build React frontend
npm install
npm run build

# 2. Move React build to Django static directory
mkdir -p backend/static/frontend
rm -rf backend/static/frontend/*
mv build/* backend/static/frontend/

# 3. Install backend dependencies
cd backend
pip install -r requirements.txt

# 4. Collect Django static files
python manage.py collectstatic --noinput
