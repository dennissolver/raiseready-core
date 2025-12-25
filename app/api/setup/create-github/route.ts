// app/api/setup/create-github/route.ts
// ============================================================================
// GITHUB REPOSITORY CREATION - Pulls from raiseready-child-template
//
// REFACTORED: No more hardcoded files. Pulls from template repo and only
// customizes config/client.ts with branding.
//
// FIX APPLIED: Added Step 1.5 to bootstrap empty repos before using Git Data API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';
const TEMPLATE_OWNER = 'dennissolver';
const TEMPLATE_REPO = 'raiseready-child-template';
const TEMPLATE_BRANCH = 'main';

// Files/folders to exclude when copying from template
const EXCLUDED_PATHS = [
  '.git',
  '.venv',
  '.idea',
  'node_modules',
  '.next',
  '.env',
  '.env.local',
  '__pycache__',
];

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';
type PlatformMode = 'screening' | 'coaching';

interface ExtractedBranding {
  company: {
    name: string;
    tagline: string;
    description: string;
    website: string;
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  logo: {
    url: string | null;
    base64?: string | null;
    favicon?: string | null;
  };
  thesis: {
    focusAreas: string[];
    sectors: string[];
    stages?: string[];
    philosophy: string;
    idealFounder: string;
  };
  contact: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
  };
  platformType: PlatformType;
}

interface AdminInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface CreateGithubRequest {
  repoName: string;
  branding: ExtractedBranding;
  companyName: string;
  admin?: AdminInfo;
  platformMode?: PlatformMode;
}

interface TreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: CreateGithubRequest = await request.json();
    const { repoName, branding, companyName, admin, platformMode = 'screening' } = body;

    if (!repoName || !branding) {
      return NextResponse.json(
        { error: 'Missing required fields: repoName, branding' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN not configured' },
        { status: 500 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    console.log(`[create-github] Starting for: ${repoName}`);

    // ========================================================================
    // STEP 1: Create the new repository
    // ========================================================================
    console.log(`[create-github] Creating repository...`);

    const createRepoResponse = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repoName,
        description: `${companyName || branding.company.name} - AI-Powered Pitch Coaching Platform`,
        private: false,
        auto_init: false,
      }),
    });

    let owner = TEMPLATE_OWNER;

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.json();
      if (!error.message?.includes('already exists')) {
        throw new Error(`Failed to create repository: ${error.message}`);
      }
      console.log(`[create-github] Repository already exists, will update...`);
    } else {
      const repoData = await createRepoResponse.json();
      owner = repoData.owner?.login || TEMPLATE_OWNER;
    }

    // ========================================================================
    // STEP 1.5: Initialize empty repository with bootstrap commit
    // ========================================================================
    // GitHub's Git Data API (blobs, trees, commits) requires at least one commit.
    // The "create or update file contents" API uniquely works on empty repos.

    console.log(`[create-github] Checking if repository needs initialization...`);

    // Small delay to ensure repo is ready after creation
    await new Promise(r => setTimeout(r, 1000));

    // Check if repo is empty by trying to get the main branch
    const checkBranchResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`,
      { headers }
    );

    if (!checkBranchResponse.ok) {
      console.log(`[create-github] Repository is empty, creating bootstrap commit...`);

      // Repo is empty - create initial commit using contents API (works on empty repos)
      const bootstrapResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repoName}/contents/.gitkeep`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Initialize repository',
            content: Buffer.from('# Generated platform\n').toString('base64'),
          }),
        }
      );

      if (!bootstrapResponse.ok) {
        const err = await bootstrapResponse.json();
        console.error(`[create-github] Bootstrap failed:`, err);
        throw new Error(`Failed to initialize repository: ${err.message}`);
      }

      console.log(`[create-github] Repository initialized with bootstrap commit`);

      // Small delay to ensure commit is processed
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.log(`[create-github] Repository already has commits, skipping bootstrap`);
    }

    // ========================================================================
    // STEP 2: Fetch template repository tree
    // ========================================================================
    console.log(`[create-github] Fetching template from ${TEMPLATE_OWNER}/${TEMPLATE_REPO}...`);

    const treeResponse = await fetch(
      `${GITHUB_API}/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/git/trees/${TEMPLATE_BRANCH}?recursive=1`,
      { headers }
    );

    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch template: ${treeResponse.statusText}`);
    }

    const treeData = await treeResponse.json();
    const templateTree: TreeItem[] = treeData.tree;

    console.log(`[create-github] Found ${templateTree.length} items in template`);

    // ========================================================================
    // STEP 3: Filter and fetch file contents
    // ========================================================================
    const filesToCreate: { path: string; content: string }[] = [];
    let processedCount = 0;

    for (const item of templateTree) {
      // Skip directories
      if (item.type !== 'blob') continue;

      // Skip excluded paths
      if (EXCLUDED_PATHS.some(excluded => item.path.startsWith(excluded))) continue;

      // Skip large binary files
      if (item.size && item.size > 1000000) continue;

      try {
        // Fetch file content
        const blobResponse = await fetch(item.url, { headers });
        if (!blobResponse.ok) continue;

        const blobData = await blobResponse.json();
        let content: string;

        try {
          content = Buffer.from(blobData.content, 'base64').toString('utf-8');
        } catch {
          // Skip binary files that can't be decoded
          continue;
        }

        // Customize config/client.ts with branding
        if (item.path === 'config/client.ts') {
          content = generateClientConfig(branding, admin, platformMode);
        }

        // Customize package.json name
        if (item.path === 'package.json') {
          content = customizePackageJson(content, repoName, companyName || branding.company.name);
        }

        filesToCreate.push({ path: item.path, content });
        processedCount++;

        // Progress logging every 20 files
        if (processedCount % 20 === 0) {
          console.log(`[create-github] Processed ${processedCount} files...`);
        }
      } catch (err) {
        console.warn(`[create-github] Skipped ${item.path}: ${err}`);
      }
    }

    console.log(`[create-github] Total files to create: ${filesToCreate.length}`);

    // ========================================================================
    // STEP 4: Create blobs for all files
    // ========================================================================
    console.log(`[create-github] Creating blobs...`);

    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < filesToCreate.length; i += BATCH_SIZE) {
      const batch = filesToCreate.slice(i, i + BATCH_SIZE);

      const blobPromises = batch.map(async (file) => {
        try {
          const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/blobs`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: Buffer.from(file.content).toString('base64'),
              encoding: 'base64',
            }),
          });

          if (!blobResponse.ok) {
            console.warn(`[create-github] Failed to create blob for ${file.path}`);
            return null;
          }

          const blobData = await blobResponse.json();
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha,
          };
        } catch (err) {
          console.warn(`[create-github] Error creating blob for ${file.path}: ${err}`);
          return null;
        }
      });

      const results = await Promise.all(blobPromises);
      treeItems.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));

      // Small delay between batches
      if (i + BATCH_SIZE < filesToCreate.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`[create-github] Created ${treeItems.length} blobs`);

    // ========================================================================
    // STEP 5: Create tree (without base_tree to fully replace contents)
    // ========================================================================
    console.log(`[create-github] Creating tree...`);

    const createTreeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tree: treeItems }),
    });

    if (!createTreeResponse.ok) {
      const err = await createTreeResponse.json();
      throw new Error(`Failed to create tree: ${err.message}`);
    }

    const newTree = await createTreeResponse.json();

    // ========================================================================
    // STEP 6: Create commit (with parent from bootstrap if exists)
    // ========================================================================
    console.log(`[create-github] Creating commit...`);

    // Get the current HEAD to use as parent
    let parentSha: string | undefined;
    const headResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`,
      { headers }
    );
    if (headResponse.ok) {
      const headData = await headResponse.json();
      parentSha = headData.object?.sha;
    }

    const createCommitResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Initial setup: ${companyName || branding.company.name} platform\n\nGenerated from raiseready-child-template`,
        tree: newTree.sha,
        parents: parentSha ? [parentSha] : [],
      }),
    });

    if (!createCommitResponse.ok) {
      const err = await createCommitResponse.json();
      throw new Error(`Failed to create commit: ${err.message}`);
    }

    const newCommit = await createCommitResponse.json();

    // ========================================================================
    // STEP 7: Update main branch reference
    // ========================================================================
    console.log(`[create-github] Updating main branch...`);

    // Since we bootstrapped, the ref already exists - update it
    const updateRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    });

    if (!updateRefResponse.ok) {
      // Fallback: try creating the ref
      const createRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/refs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: 'refs/heads/main',
          sha: newCommit.sha,
        }),
      });

      if (!createRefResponse.ok) {
        const err = await createRefResponse.json();
        throw new Error(`Failed to create/update ref: ${err.message}`);
      }
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[create-github] ✅ Complete in ${duration}s`);

    return NextResponse.json({
      success: true,
      repository: {
        name: repoName,
        owner,
        url: `https://github.com/${owner}/${repoName}`,
        cloneUrl: `https://github.com/${owner}/${repoName}.git`,
      },
      stats: {
        filesCreated: treeItems.length,
        duration: `${duration}s`,
      },
    });

  } catch (error) {
    console.error('[create-github] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'github-creation',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER: Customize package.json
// ============================================================================

function customizePackageJson(content: string, repoName: string, companyName: string): string {
  try {
    const pkg = JSON.parse(content);
    pkg.name = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    pkg.description = `${companyName} - AI-Powered Pitch Coaching Platform`;
    return JSON.stringify(pkg, null, 2);
  } catch {
    return content;
  }
}

// ============================================================================
// HELPER: Generate client config
// ============================================================================
// NOTE: Copy your existing generateClientConfig function here (lines 360-674 from original)
// I'm including a placeholder - replace with your actual implementation

function generateClientConfig(
  branding: ExtractedBranding,
  admin?: AdminInfo,
  platformMode: PlatformMode = 'screening'
): string {
  const { company, colors, logo, thesis, contact, platformType } = branding;
  const isImpact = platformType === 'impact_investor';

  // This is a simplified version - copy your full implementation from the original file
  return `// config/client.ts
// Auto-generated client configuration

export const clientConfig = {
  // Company
  company: {
    name: "${escapeString(company.name)}",
    tagline: "${escapeString(company.tagline || '')}",
    description: "${escapeString(company.description || '')}",
    website: "${company.website || ''}",
    supportEmail: "${contact.email || ''}",
  },

  // Platform Type & Mode
  platformType: "${platformType}" as const,
  platformMode: "${platformMode}" as const,

  // Admin
  admin: {
    firstName: "${escapeString(admin?.firstName || '')}",
    lastName: "${escapeString(admin?.lastName || '')}",
    email: "${admin?.email || ''}",
    phone: "${admin?.phone || ''}",
  },

  // Theme
  theme: {
    colors: {
      primary: "${colors.primary || '#8B5CF6'}",
      accent: "${colors.accent || '#10B981'}",
      background: "${colors.background || '#0F172A'}",
      text: "${colors.text || '#F8FAFC'}",
    },
  },

  // Logo
  logo: {
    url: ${logo.url ? `"${logo.url}"` : 'null'},
    favicon: ${logo.favicon ? `"${logo.favicon}"` : 'null'},
  },

  // Investment Thesis
  thesis: {
    focusAreas: ${JSON.stringify(thesis.focusAreas || ['Technology', 'Healthcare', 'Climate'])},
    sectors: ${JSON.stringify(thesis.sectors || ['Technology', 'Healthcare', 'FinTech'])},
    stages: ${JSON.stringify(thesis.stages || ['Pre-Seed', 'Seed', 'Series A'])},
    philosophy: "${escapeString(thesis.philosophy || '')}",
    idealFounder: "${escapeString(thesis.idealFounder || '')}",
    scoringFocus: "${isImpact ? 'impact' : 'growth'}" as "storytelling" | "impact" | "growth",
  },

  // Platform Features
  platform: {
    features: {
      voiceCoaching: true,
      investorMatching: true,
      sdgScoring: ${isImpact},
      impactMetrics: ${isImpact},
    },
  },
};

export default clientConfig;
`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}