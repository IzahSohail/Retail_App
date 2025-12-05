#!/bin/bash
set -e

echo "🚀 Safe Merge Strategy - Preserving All Work"
echo "=============================================="
echo ""

cd /Users/tereza/Downloads/Retail_App-checkpoint3

# Step 1: Commit your current work
echo "📝 Step 1: Committing your current work..."
git add -A
git commit -m "feat: Add Docker setup, Vite migration, UML docs, and backend updates

- Complete Docker setup with compose files and Dockerfiles
- Migrate frontend from Create React App to Vite
- Add comprehensive UML documentation (Process Refund + Register Sale)
- Update backend server.js with cart checkout and payment processing
- Update Prisma schema
- Add Docker guides, scripts, and documentation
- Convert frontend files to .jsx extension"

echo "✅ Your work committed!"
echo ""

# Step 2: Create integration branch from origin/main
echo "🔀 Step 2: Creating integration branch from origin/main..."
git fetch origin
git switch -c terezia/integrate-all origin/main

echo "✅ On fresh branch from origin/main"
echo ""

# Step 3: Merge your work
echo "🔀 Step 3: Merging your work into the integration branch..."
echo "⚠️  Conflicts are EXPECTED - we'll resolve them strategically"
echo ""

if git merge main --no-ff -m "Merge: Integrate Docker, Vite, docs with latest origin/main"; then
  echo "✅ Clean merge! No conflicts."
else
  echo "⚠️  Conflicts detected (this is normal!)"
  echo ""
  echo "📋 Analyzing conflicts..."
  git status
  echo ""
  echo "===================="
  echo "CONFLICT RESOLUTION:"
  echo "===================="
  echo ""
  
  # Check which files have conflicts
  CONFLICTS=$(git diff --name-only --diff-filter=U)
  
  if echo "$CONFLICTS" | grep -q "prisma/schema.prisma"; then
    echo "❌ prisma/schema.prisma has conflicts - NEEDS MANUAL MERGE"
    echo "   Action: Open in editor and merge both schemas"
  fi
  
  if echo "$CONFLICTS" | grep -q "backend/src/server.js"; then
    echo "❌ backend/src/server.js has conflicts - NEEDS MANUAL MERGE"  
    echo "   Action: Open in editor and keep both sets of endpoints"
  fi
  
  if echo "$CONFLICTS" | grep -q "package.json"; then
    echo "❌ package.json has conflicts - NEEDS MANUAL MERGE"
    echo "   Action: Merge dependencies, keep YOUR scripts"
  fi
  
  if echo "$CONFLICTS" | grep -q "frontend/"; then
    echo "❌ Frontend files have conflicts - KEEPING YOURS"
    git checkout --ours frontend/
  fi
  
  echo ""
  echo "🛠️  Auto-resolving Docker and documentation conflicts..."
  echo ""
  
  # Auto-resolve: Keep YOUR Docker files (they're new, not conflicts)
  # These are untracked files from your branch, so they just need to be kept
  
  echo "✅ Next steps:"
  echo "1. Open these files in VS Code and manually merge:"
  echo "   - prisma/schema.prisma (merge both schemas)"
  echo "   - backend/src/server.js (if conflicted)"
  echo "   - package.json (merge dependencies)"
  echo ""
  echo "2. After resolving, run:"
  echo "   git add -A"
  echo "   git commit -m 'Merge: Resolved conflicts - preserved all features'"
  echo "   git push -u origin terezia/integrate-all"
  echo ""
  echo "📖 See MERGE_STRATEGY.md for detailed guidance"
  
  exit 1
fi

echo ""
echo "🎉 Merge complete! Pushing to remote..."
git push -u origin terezia/integrate-all

echo ""
echo "✅ SUCCESS! Your branch is ready for PR"
echo "🌐 Create PR at: https://github.com/IzahSohail/Retail_App/compare/terezia/integrate-all"

