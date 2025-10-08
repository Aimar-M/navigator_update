import { useCallback } from 'react';
import { fullstory, trackTripCreated, trackTripJoined, trackPageView } from '@/lib/fullstory';

export const useFullStory = () => {
  const identifyUser = useCallback((userId: string, userVars?: Record<string, any>) => {
    fullstory.identifyUser(userId, userVars);
  }, []);

  const setUserVars = useCallback((userVars: Record<string, any>) => {
    fullstory.setUserVars(userVars);
  }, []);

  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    fullstory.trackEvent(eventName, properties);
  }, []);

  const trackTripCreation = useCallback((tripId: string, tripName: string, userId: string) => {
    trackTripCreated(tripId, tripName, userId);
  }, []);

  const trackTripJoin = useCallback((tripId: string, userId: string) => {
    trackTripJoined(tripId, userId);
  }, []);

  const trackPage = useCallback((pageName: string, properties?: Record<string, any>) => {
    trackPageView(pageName, properties);
  }, []);

  const anonymizeUser = useCallback(() => {
    fullstory.anonymizeUser();
  }, []);

  const setConsent = useCallback((consent: boolean) => {
    fullstory.setConsent(consent);
  }, []);

  const log = useCallback((level: string, message: string) => {
    fullstory.log(level, message);
  }, []);

  return {
    identifyUser,
    setUserVars,
    trackEvent,
    trackTripCreation,
    trackTripJoin,
    trackPage,
    anonymizeUser,
    setConsent,
    log,
  };
};
