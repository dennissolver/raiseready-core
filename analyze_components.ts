// analyze_components.ts
import fs from 'fs';
import path from 'path';

interface ComponentInfo {
  path: string;
  exports: string[];
  imports: string[];
  props?: string;
}

function analyzeComponent(filePath: string): ComponentInfo {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract exports
  const exportMatches = content.match(/export (?:default )?(?:function|const|class) (\w+)/g) || [];
  const exports = exportMatches.map(m => m.split(' ').pop()!);

  // Extract imports
  const importMatches = content.match(/import .+ from ['"](.+)['"]/g) || [];
  const imports = importMatches.map(m => m.match(/from ['"](.+)['"]/)?.[1] || '');

  // Extract props interface
  const propsMatch = content.match(/interface (\w+Props) \{[\s\S]+?\}/);
  const props = propsMatch?.[0];

  return { path: filePath, exports, imports, props };
}

function scanComponents(dir: string): ComponentInfo[] {
  const results: ComponentInfo[] = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results.push(...scanComponents(fullPath));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      results.push(analyzeComponent(fullPath));
    }
  }

  return results;
}

const components = scanComponents('./components');
console.log(JSON.stringify(components, null, 2));