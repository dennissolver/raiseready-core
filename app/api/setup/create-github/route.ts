import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

interface CreateGithubRequest {
  repoName: string;
  formData: {
    companyName: string;
    companyWebsite: string;
    companyPhone: string;
    companyEmail: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone: string;
    agentName: string;
    voiceGender: string;
    voiceLanguage: string;
    voiceType: string;
    llmProvider: string;
    extractedThesis: string;
    extractedColors: {
      primary: string;
      accent: string;
      background: string;
    };
  };
  createdResources: {
    supabaseUrl: string;
    supabaseProjectId: string;
    elevenlabsAgentId: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateGithubRequest = await req.json();
    const { repoName, formData, createdResources } = body;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';
    const templateRepo = process.env.GITHUB_TEMPLATE_REPO || 'raiseready-template';

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Step 1: Check if repo already exists
    console.log(`Checking for existing repo: ${owner}/${repoName}`);
    
    const checkResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, { headers });
    
    if (checkResponse.ok) {
      const existingRepo = await checkResponse.json();
      console.log(`Repo already exists: ${existingRepo.html_url}`);
      
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Repository already exists',
        repoUrl: existingRepo.html_url,
        repoFullName: existingRepo.full_name,
        cloneUrl: existingRepo.clone_url,
      });
    }

    // Step 2: Create repo from template
    console.log(`Creating GitHub repo: ${repoName} from template ${templateRepo}`);

    const createResponse = await fetch(`${GITHUB_API}/repos/${owner}/${templateRepo}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner,
        name: repoName,
        description: `${formData.companyName} Pitch Coaching Platform`,
        private: true,
        include_all_branches: false,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('GitHub create error:', error);
      
      if (error.includes('already exists') || error.includes('name already exists')) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Repository already exists',
          repoUrl: `https://github.com/${owner}/${repoName}`,
          repoFullName: `${owner}/${repoName}`,
        });
      }
      
      return NextResponse.json({ error: `Failed to create repo: ${error}` }, { status: 500 });
    }

    const repo = await createResponse.json();
    console.log('Repo created:', repo.full_name);

    // Wait for repo to be ready
    await sleep(3000);

    // Step 3: Update config/client.ts (optional, may fail if repo still initializing)
    try {
      const clientConfig = generateClientConfig(formData, createdResources, repoName);
      
      const getFileResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repoName}/contents/config/client.ts`,
        { headers }
      );

      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        
        await fetch(
          `${GITHUB_API}/repos/${owner}/${repoName}/contents/config/client.ts`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              message: `Configure platform for ${formData.companyName}`,
              content: Buffer.from(clientConfig).toString('base64'),
              sha: fileData.sha,
            }),
          }
        );
        console.log('Config updated');
      }
    } catch (err) {
      console.warn('Could not update config (non-critical):', err);
    }

    return NextResponse.json({
      success: true,
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
      cloneUrl: repo.clone_url,
    });

  } catch (error) {
    console.error('Create GitHub error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function generateClientConfig(
  formData: CreateGithubRequest['formData'],
  resources: CreateGithubRequest['createdResources'],
  repoName: string
): string {
  const urlPrefix = repoName.replace('-pitch', '');
  
  return `// config/client.ts
// Auto-generated for: ${formData.companyName}
// Generated: ${new Date().toISOString()}

export const clientConfig = {
  company: {
    name: "${formData.companyName}",
    legalName: "${formData.companyName}",
    tagline: "AI-Powered Pitch Coaching",
    description: "Perfect your investor pitch with AI coaching",
    website: "${formData.companyWebsite}",
    platformUrl: "https://${repoName}.vercel.app",
    supportEmail: "${formData.companyEmail || formData.adminEmail}",
    salesEmail: "${formData.adminEmail}",
  },
  admin: {
    firstName: "${formData.adminFirstName}",
    lastName: "${formData.adminLastName}",
    email: "${formData.adminEmail}",
  },
  theme: {
    colors: {
      primary: "${formData.extractedColors?.primary || '#3B82F6'}",
      accent: "${formData.extractedColors?.accent || '#10B981'}",
      background: "${formData.extractedColors?.background || '#0F172A'}",
    },
  },
  coaching: {
    coachName: "${formData.agentName}",
    voiceAgentId: "${resources.elevenlabsAgentId || ''}",
  },
  services: {
    supabase: {
      projectId: "${resources.supabaseProjectId || ''}",
      url: "${resources.supabaseUrl || ''}",
    },
    elevenlabs: {
      agentId: "${resources.elevenlabsAgentId || ''}",
    },
  },
};

export const getCompanyName = () => clientConfig.company.name;
export const getCoachName = () => clientConfig.coaching.coachName;
`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}