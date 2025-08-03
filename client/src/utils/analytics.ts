// Analytics utility for tracking public result views and interactions

interface AnalyticsEvent {
  event: string;
  resultId?: string;
  timestamp: string;
  userAgent: string;
  referrer?: string;
  path: string;
}

export const trackEvent = async (event: string, resultId?: string) => {
  try {
    const analyticsEvent: AnalyticsEvent = {
      event,
      resultId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      path: window.location.pathname,
    };

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    await fetch(`${apiBase}/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsEvent),
    });
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
};

export const trackPublicResultView = (resultId: string) => {
  trackEvent('public_result_view', resultId);
};

export const trackPublicResultShare = (resultId: string) => {
  trackEvent('public_result_share', resultId);
};

export const trackPublicResultCTA = (resultId: string) => {
  trackEvent('public_result_cta_click', resultId);
}; 