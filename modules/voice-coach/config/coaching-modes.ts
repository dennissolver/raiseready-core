/**
 * Coaching Modes Configuration
 * Exports the coaching mode configurations for use throughout the app
 */

import { COACHING_MODES } from '../types/coaching-modes';

export { COACHING_MODES };

// Helper function to get mode configuration
export function getCoachingModeConfig(mode: 'interrupt' | 'full_listen' | 'investor_sim') {
  return COACHING_MODES[mode];
}

// Determine if interruptions are allowed for a mode
export function canInterrupt(mode: 'interrupt' | 'full_listen' | 'investor_sim'): boolean {
  return COACHING_MODES[mode].behavior.allowInterruptions;
}

// Get interruption threshold
export function getInterruptionThreshold(mode: 'interrupt' | 'full_listen' | 'investor_sim'): number {
  const config = COACHING_MODES[mode];
  
  if (!config.behavior.allowInterruptions) {
    return 0;
  }
  
  const thresholds = {
    'none': 0,
    'low': 1,
    'medium': 3,
    'high': 5,
    'very_high': 8
  };
  
  return thresholds[config.interruptThreshold] || 0;
}

// Get pause detection time in milliseconds
export function getPauseDetectionMs(mode: 'interrupt' | 'full_listen' | 'investor_sim'): number {
  return COACHING_MODES[mode].behavior.pauseDetectionMs || 1500;
}

export default COACHING_MODES;
