// components/setup/BrandingPreview.tsx
// ============================================================================
// BRANDING PREVIEW - Shows extracted branding for user confirmation
// Allows manual override before platform creation
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Palette, RefreshCw, Check, Edit2, Eye } from 'lucide-react';

interface BrandingColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

interface BrandingData {
  colors: BrandingColors;
  description?: string;
  tone?: string;
  industry?: string;
  dominantColor?: string;
  logoColors?: string[];
}

interface BrandingPreviewProps {
  websiteUrl: string;
  companyName: string;
  onConfirm: (branding: BrandingData) => void;
  onSkip?: () => void;
}

export function BrandingPreview({ websiteUrl, companyName, onConfirm, onSkip }: BrandingPreviewProps) {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedColors, setEditedColors] = useState<BrandingColors | null>(null);
  const [source, setSource] = useState<string>('');

  // Fetch branding from API
  const extractBranding = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/setup/extract-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyWebsite: websiteUrl,
          companyName: companyName,
        }),
      });

      const data = await response.json();

      if (data.success && data.branding) {
        setBranding(data.branding);
        setEditedColors(data.branding.colors);
        setSource(data.source);
      } else {
        setError('Failed to extract branding');
      }
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteUrl) {
      extractBranding();
    }
  }, [websiteUrl]);

  const handleColorChange = (key: keyof BrandingColors, value: string) => {
    if (editedColors) {
      setEditedColors({ ...editedColors, [key]: value });
    }
  };

  const handleConfirm = () => {
    if (branding && editedColors) {
      onConfirm({
        ...branding,
        colors: editedColors,
      });
    }
  };

  const ColorInput = ({ label, colorKey, value }: { label: string; colorKey: keyof BrandingColors; value: string }) => (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-inner cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        {editMode && (
          <input
            type="color"
            value={value}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <input
              type="text"
              value={value}
              onChange={(e) => handleColorChange(colorKey, e.target.value)}
              className="text-xs font-mono bg-gray-100 px-2 py-1 rounded w-24 uppercase"
              placeholder="#000000"
            />
          ) : (
            <span className="text-xs font-mono text-gray-500 uppercase">{value}</span>
          )}
        </div>
      </div>
    </div>
  );

  // Preview mockup of how the platform will look
  const PlatformPreview = () => {
    if (!editedColors) return null;

    return (
      <div
        className="rounded-xl overflow-hidden shadow-lg border border-gray-200"
        style={{ backgroundColor: editedColors.background }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: editedColors.primary }}
        >
          <span className="font-semibold text-white text-sm">{companyName}</span>
          <div className="flex gap-2">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{ backgroundColor: editedColors.accent, color: '#fff' }}
            >
              Sign In
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: editedColors.text }}
          >
            Perfect Your Pitch
          </h2>
          <p
            className="text-sm mb-4 opacity-70"
            style={{ color: editedColors.text }}
          >
            AI-powered pitch coaching for founders
          </p>
          <button
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: editedColors.primary }}
          >
            Get Started →
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <Palette className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">Analyzing Website</h3>
            <p className="text-sm text-gray-500 mt-1">
              Capturing screenshot and extracting brand colors...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !branding) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Palette className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Couldn't Extract Branding</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={extractBranding}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
              >
                Use Defaults
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!branding || !editedColors) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Brand Colors Extracted</h3>
            <p className="text-xs text-gray-500">
              Source: {source === 'ai-vision' ? '🤖 AI Vision Analysis' : source === 'html-extraction' ? '📄 HTML Extraction' : '⚙️ Defaults'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
            editMode 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {editMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          {editMode ? 'Done Editing' : 'Edit Colors'}
        </button>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Color Inputs */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Brand Colors
            </h4>
            <ColorInput label="Primary Color" colorKey="primary" value={editedColors.primary} />
            <ColorInput label="Accent Color" colorKey="accent" value={editedColors.accent} />
            <ColorInput label="Background" colorKey="background" value={editedColors.background} />
            <ColorInput label="Text Color" colorKey="text" value={editedColors.text} />

            {branding.dominantColor && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Detected Dominant Color</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-200"
                    style={{ backgroundColor: branding.dominantColor }}
                  />
                  <span className="text-xs font-mono text-gray-500">{branding.dominantColor}</span>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Platform Preview
            </h4>
            <PlatformPreview />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={extractBranding}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Re-analyze
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrandingPreview;