// @ts-nocheck
/**
 * OnboardingGate — Shows BusinessOnboarding overlay for authenticated users
 * who haven't completed onboarding yet.
 *
 * Renders children normally. If onboarding is incomplete, overlays the wizard.
 * User can "Skip for now" to dismiss without completing.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useBusinessIntelligence';
import { BusinessOnboarding } from './BusinessOnboarding';
import { useQueryClient } from '@tanstack/react-query';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useOnboardingStatus();

  // Allow user to dismiss the onboarding without completing
  const [dismissed, setDismissed] = useState(false);

  // Don't show onboarding while auth or status is loading
  if (authLoading || statusLoading) {
    return <>{children}</>;
  }

  // Only show for authenticated users who haven't completed onboarding
  const shouldShowOnboarding = isAuthenticated && status && !status.onboardingComplete && !dismissed;

  return (
    <>
      {children}
      {shouldShowOnboarding && (
        <BusinessOnboarding
          onComplete={() => {
            setDismissed(true);
            queryClient.invalidateQueries({ queryKey: ['intelligence', 'onboarding-status'] });
          }}
          onSkip={() => setDismissed(true)}
        />
      )}
    </>
  );
}
