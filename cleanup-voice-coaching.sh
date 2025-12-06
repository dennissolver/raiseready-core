#!/bin/bash

# Voice AI Coaching Cleanup Script
# Removes broken voice coaching implementation while preserving database schema
# Re-enables TypeScript and ESLint strict checking

echo "🧹 Starting Voice AI Coaching cleanup..."
echo ""

# Step 1: Delete voice coaching files
echo "📁 Deleting voice coaching files..."

# API routes
if [ -d "app/api/voice-coach" ]; then
  rm -rf app/api/voice-coach/
  echo "  ✓ Deleted app/api/voice-coach/"
fi

# UI components
if [ -d "components/voice-coach" ]; then
  rm -rf components/voice-coach/
  echo "  ✓ Deleted components/voice-coach/"
fi

# Practice page
if [ -f "app/founder/practice/page.tsx" ]; then
  rm app/founder/practice/page.tsx
  echo "  ✓ Deleted app/founder/practice/page.tsx"
fi

# Hooks
if [ -f "hooks/useVoiceSession.ts" ]; then
  rm hooks/useVoiceSession.ts
  echo "  ✓ Deleted hooks/useVoiceSession.ts"
fi

# Libraries
if [ -f "lib/elevenlabs-client.ts" ]; then
  rm lib/elevenlabs-client.ts
  echo "  ✓ Deleted lib/elevenlabs-client.ts"
fi

if [ -f "lib/voice-session-manager.ts" ]; then
  rm lib/voice-session-manager.ts
  echo "  ✓ Deleted lib/voice-session-manager.ts"
fi

# Types
if [ -f "types/voice-coach.ts" ]; then
  rm types/voice-coach.ts
  echo "  ✓ Deleted types/voice-coach.ts"
fi

if [ -f "types/voice-coach-aliases.ts" ]; then
  rm types/voice-coach-aliases.ts
  echo "  ✓ Deleted types/voice-coach-aliases.ts"
fi

# Scripts
if [ -f "fix-voice-coach-imports.sh" ]; then
  rm fix-voice-coach-imports.sh
  echo "  ✓ Deleted fix-voice-coach-imports.sh"
fi

echo ""
echo "✅ Voice coaching files deleted"
echo ""

# Step 2: Update next.config.js
echo "⚙️  Re-enabling TypeScript and ESLint checking..."

cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
EOF

echo "  ✓ Updated next.config.js"
echo ""

# Step 3: Test build
echo "🔨 Testing build..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! Build completed with no errors"
  echo ""
  echo "📊 Summary:"
  echo "  • Voice coaching files removed"
  echo "  • TypeScript strict checking re-enabled"
  echo "  • ESLint checking re-enabled"
  echo "  • Build passes with 0 errors"
  echo "  • Database tables preserved for future rebuild"
  echo ""
  echo "🎯 Next steps:"
  echo "  1. git add -A"
  echo "  2. git commit -m 'Remove voice coaching for proper rebuild'"
  echo "  3. git push origin main"
  echo ""
  echo "📝 Note: Database tables retained:"
  echo "  • voice_coaching_sessions"
  echo "  • voice_messages"
  echo "  • voice_feedback"
  echo "  These will be used when rebuilding the feature properly."
else
  echo ""
  echo "❌ Build failed - there may be other TypeScript errors to fix"
  echo "Run 'npm run build' to see detailed errors"
  echo ""
fi