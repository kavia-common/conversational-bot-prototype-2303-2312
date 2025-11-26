import React from 'react';
import env from '../utils/env';

/**
 * PUBLIC_INTERFACE
 * FeatureFlagGate
 * Renders children only if the provided flag name is enabled via env FEATURE_FLAGS or EXPERIMENTS_ENABLED (for allowAll).
 */
export default function FeatureFlagGate({ flag, allowAll = false, children, fallback = null }) {
  /** This is a public function: conditional render gate based on feature flags. */
  const { FEATURE_FLAGS, EXPERIMENTS_ENABLED } = env();
  const enabled = Boolean(
    (flag && FEATURE_FLAGS && FEATURE_FLAGS[flag]) ||
      (allowAll && EXPERIMENTS_ENABLED)
  );
  if (enabled) return <>{children}</>;
  return fallback;
}
