'use client'

import { useState, useEffect } from 'react'
import { Upload, TrendingUp, CheckCircle, AlertCircle, Target } from 'lucide-react'

interface MaterialsImprovementProps {
  sessionId: string
  currentDeckId: string
  focusAreas: string[]
  currentScores: Record<string, number>
  onTransitionToVerbal: () => void
}

interface VersionComparison {
  overallScoreChange: number
  categoryComparisons: Array<{
    category: string
    previousScore: number
    currentScore: number
    change: number
    improved: boolean
  }>
  significantImprovements: string[]
  remainingWeaknesses: string[]
}

export default function MaterialsImprovementMode({
  sessionId,
  currentDeckId,
  focusAreas,
  currentScores,
  onTransitionToVerbal,
}: MaterialsImprovementProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(focusAreas[0] || '')
  const [coaching, setCoaching] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [readinessCheck, setReadinessCheck] = useState<{
    ready: boolean
    message: string
    overallScore: number
  } | null>(null)

  // Load coaching for current focus area
  useEffect(() => {
    if (selectedCategory) {
      loadCategoryCoaching(selectedCategory)
    }
  }, [selectedCategory])

  const loadCategoryCoaching = async (category: string) => {
    try {
      const response = await fetch('/api/coach/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'get_category_coaching',
          data: { category },
        }),
      })

      const result = await response.json()
      if (result.success) {
        setCoaching(result.coaching)
      }
    } catch (error) {
      console.error('Failed to load coaching:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)
      formData.append('parentDeckId', currentDeckId)

      const response = await fetch('/api/coach/reupload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setComparison(result.comparison)
        setUploadProgress(100)
        
        // Check if ready for verbal practice
        checkVerbalReadiness()
      } else {
        alert('Upload failed: ' + result.error)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const checkVerbalReadiness = async () => {
    try {
      const response = await fetch('/api/coach/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'check_verbal_readiness',
        }),
      })

      const result = await response.json()
      if (result.success) {
        setReadinessCheck({
          ready: result.ready,
          message: result.message,
          overallScore: result.overallScore,
        })

        if (result.ready) {
          // Auto-suggest transition after 3 seconds
          setTimeout(() => {
            if (confirm('Your materials are ready! Move to verbal pitch practice?')) {
              onTransitionToVerbal()
            }
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Readiness check error:', error)
    }
  }

  const formatCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      problemClarity: 'Problem Clarity',
      solutionFit: 'Solution Fit',
      marketOpportunity: 'Market Opportunity',
      teamCredibility: 'Team Credibility',
      impactPotential: 'Impact Potential',
      financialViability: 'Financial Viability',
    }
    return names[category] || category
  }

  const getCategoryIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (score >= 65) return <Target className="w-5 h-5 text-yellow-500" />
    return <AlertCircle className="w-5 h-5 text-red-500" />
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Phase 2: Materials Improvement</h2>
            <p className="text-gray-600 mt-1">Strengthen your deck category by category</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {readinessCheck?.overallScore || 0}/100
            </div>
            <div className="text-sm text-gray-500">Overall Score</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((readinessCheck?.overallScore || 0) / 100) * 100}%` }}
          />
        </div>
      </div>

      {/* Comparison Results (after re-upload) */}
      {comparison && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 text-lg mb-2">
                Progress Update! (+{comparison.overallScoreChange} points)
              </h3>

              {comparison.significantImprovements.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold text-green-800 mb-2">Significant Improvements:</p>
                  <ul className="space-y-1">
                    {comparison.significantImprovements.map(category => {
                      const comp = comparison.categoryComparisons.find(c => c.category === category)
                      return comp ? (
                        <li key={category} className="text-green-700">
                          ✨ {formatCategoryName(category)}: {comp.previousScore} → {comp.currentScore} (+
                          {comp.change})
                        </li>
                      ) : null
                    })}
                  </ul>
                </div>
              )}

              {comparison.remainingWeaknesses.length > 0 && (
                <div>
                  <p className="font-semibold text-orange-800 mb-2">Still needs work:</p>
                  <ul className="space-y-1">
                    {comparison.remainingWeaknesses.map(category => {
                      const comp = comparison.categoryComparisons.find(c => c.category === category)
                      return comp ? (
                        <li key={category} className="text-orange-700">
                          • {formatCategoryName(category)}: {comp.currentScore}/100
                        </li>
                      ) : null
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Readiness Check Result */}
      {readinessCheck && readinessCheck.ready && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-bold text-green-900 text-xl">🎉 You're Investor-Ready!</h3>
              <p className="text-green-700">Overall Score: {readinessCheck.overallScore}/100</p>
            </div>
          </div>
          <p className="text-gray-700 mb-4 whitespace-pre-line">{readinessCheck.message}</p>
          <button
            onClick={onTransitionToVerbal}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Start Pitch Practice →
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Focus Areas Sidebar */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">Focus Areas</h3>
          <div className="space-y-2">
            {focusAreas.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedCategory === category
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">
                    {formatCategoryName(category)}
                  </span>
                  {getCategoryIcon(currentScores[category] || 0)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        currentScores[category] >= 75
                          ? 'bg-green-500'
                          : currentScores[category] >= 65
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${currentScores[category] || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {currentScores[category] || 0}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <div className="pt-4 border-t border-gray-200">
            <label
              htmlFor="deck-upload"
              className={`block w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
                isUploading
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                {isUploading ? 'Uploading...' : 'Upload Revised Deck'}
              </span>
              <input
                id="deck-upload"
                type="file"
                accept=".pdf,.pptx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            {isUploading && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coaching Content */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Current Focus: {formatCategoryName(selectedCategory)}
                </h3>
                <p className="text-sm text-gray-600">
                  Score: {currentScores[selectedCategory] || 0}/100 • Target: 80+
                </p>
              </div>
            </div>

            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-700 whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: coaching.replace(/\n/g, '<br />') }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
