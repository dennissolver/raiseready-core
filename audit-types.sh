#!/bin/bash

# Type Safety Audit Script
# This script finds all remaining type safety issues in your codebase

echo "=================================="
echo "  RaiseReady Type Safety Audit"
echo "=================================="
echo ""

echo "📊 Finding all 'as any' type casts..."
echo "------------------------------------"
grep -rn "as any" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | while read -r line; do
    echo "❌ $line"
done
COUNT_AS_ANY=$(grep -r "as any" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
echo "Total 'as any' casts found: $COUNT_AS_ANY"
echo ""

echo "📊 Finding inline Database type definitions..."
echo "------------------------------------"
grep -rn "Database\['public'\]\['Tables'\]" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | while read -r line; do
    echo "⚠️  $line"
done
COUNT_INLINE=$(grep -r "Database\['public'\]\['Tables'\]" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
echo "Total inline type definitions found: $COUNT_INLINE"
echo ""

echo "📊 Finding setState with type casts..."
echo "------------------------------------"
grep -rn "set[A-Z].*as " app/ --include="*.tsx" --include="*.ts" 2>/dev/null | while read -r line; do
    echo "⚠️  $line"
done
echo ""

echo "📊 Finding files querying pitch_decks..."
echo "------------------------------------"
grep -rn "from('pitch_decks')" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    linenum=$(echo "$line" | cut -d: -f2)
    echo "📄 $file:$linenum"
done
echo ""

echo "📊 Finding files querying investor_profiles..."
echo "------------------------------------"
grep -rn "from('investor_profiles')" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    linenum=$(echo "$line" | cut -d: -f2)
    echo "📄 $file:$linenum"
done
echo ""

echo "📊 Finding files querying investor_watchlist..."
echo "------------------------------------"
grep -rn "from('investor_watchlist')" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    linenum=$(echo "$line" | cut -d: -f2)
    echo "📄 $file:$linenum"
done
echo ""

echo "📊 Finding custom type interfaces..."
echo "------------------------------------"
grep -rn "^interface.*{" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "Props" | while read -r line; do
    echo "🔍 $line"
done
echo ""

echo "=================================="
echo "  Summary"
echo "=================================="
echo "❌ 'as any' casts: $COUNT_AS_ANY (Target: 0)"
echo "⚠️  Inline Database types: $COUNT_INLINE (Target: 0)"
echo ""

if [ "$COUNT_AS_ANY" -eq 0 ] && [ "$COUNT_INLINE" -eq 0 ]; then
    echo "✅ SUCCESS! No type safety issues found!"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run type-check"
    echo "2. Run: npm run build"
    echo "3. Test the application thoroughly"
else
    echo "⚠️  Action needed: Please review the issues above"
    echo ""
    echo "Next steps:"
    echo "1. Replace 'as any' casts with proper types"
    echo "2. Import types from @/types/database instead of defining inline"
    echo "3. See MIGRATION-GUIDE.md for detailed instructions"
    echo "4. Check the *-FIXED.tsx files for examples"
fi
echo ""

echo "=================================="
echo "  Files Ready for Migration"
echo "=================================="
echo ""
echo "✅ Fixed examples provided:"
echo "   - app-projects-page-FIXED.tsx"
echo "   - app-investors-page-FIXED.tsx"
echo "   - app-investor-watchlist-page-FIXED.tsx"
echo ""
echo "📚 Resources:"
echo "   - types-database.ts (centralized type definitions)"
echo "   - MIGRATION-GUIDE.md (step-by-step instructions)"
echo ""