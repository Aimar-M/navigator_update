// FullStory integration utilities
declare global {
  interface Window {
    FS: {
      identify: (uid: string, userVars?: Record<string, any>) => void;
      setUserVars: (userVars: Record<string, any>) => void;
      event: (eventName: string, properties?: Record<string, any>) => void;
      anonymize: () => void;
      shutdown: () => void;
      restart: () => void;
      log: (level: string, message: string) => void;
      consent: (consent: boolean) => void;
    };
  }
}

export class FullStoryService {
  private static instance: FullStoryService;
  private isInitialized = false;

  private constructor() {
    this.waitForFullStory();
  }

  public static getInstance(): FullStoryService {
    if (!FullStoryService.instance) {
      FullStoryService.instance = new FullStoryService();
    }
    return FullStoryService.instance;
  }

  private waitForFullStory(): void {
    const checkFullStory = () => {
      if (window.FS) {
        this.isInitialized = true;
        console.log('FullStory initialized successfully');
        console.log('FullStory object:', window.FS);
      } else {
        console.log('Waiting for FullStory to load...');
        setTimeout(checkFullStory, 100);
      }
    };
    checkFullStory();
  }

  public identifyUser(userId: string, userVars?: Record<string, any>): void {
    if (!this.isInitialized || !window.FS) {
      console.warn('FullStory not initialized yet, will retry...');
      // Retry after a short delay
      setTimeout(() => {
        if (window.FS) {
          this.isInitialized = true;
          this.identifyUser(userId, userVars);
        }
      }, 1000);
      return;
    }

    try {
      window.FS.identify(userId, userVars);
      console.log('FullStory: User identified', { userId, userVars });
    } catch (error) {
      console.error('FullStory: Error identifying user', error);
    }
  }

  public setUserVars(userVars: Record<string, any>): void {
    if (!this.isInitialized || !window.FS) {
      console.warn('FullStory not initialized yet');
      return;
    }

    try {
      window.FS.setUserVars(userVars);
      console.log('FullStory: User vars set', userVars);
    } catch (error) {
      console.error('FullStory: Error setting user vars', error);
    }
  }

  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.isInitialized || !window.FS) {
      console.warn('FullStory not initialized yet');
      return;
    }

    try {
      window.FS.event(eventName, properties);
      console.log('FullStory: Event tracked', { eventName, properties });
    } catch (error) {
      console.error('FullStory: Error tracking event', error);
    }
  }

  public anonymizeUser(): void {
    if (!this.isInitialized || !window.FS) {
      console.warn('FullStory not initialized yet');
      return;
    }

    try {
      window.FS.anonymize();
      console.log('FullStory: User anonymized');
    } catch (error) {
      console.error('FullStory: Error anonymizing user', error);
    }
  }

  public setConsent(consent: boolean): void {
    if (!this.isInitialized || !window.FS) {
      console.warn('FullStory not initialized yet');
      return;
    }

    try {
      window.FS.consent(consent);
      console.log('FullStory: Consent set', consent);
    } catch (error) {
      console.error('FullStory: Error setting consent', error);
    }
  }

  public log(level: string, message: string): void {
    if (!this.isInitialized || !window.FS) {
      console.warn('FullStory not initialized yet');
      return;
    }

    try {
      window.FS.log(level, message);
    } catch (error) {
      console.error('FullStory: Error logging', error);
    }
  }

  public testConnection(): void {
    console.log('FullStory: Testing connection...');
    console.log('FullStory: window.FS available:', !!window.FS);
    console.log('FullStory: isInitialized:', this.isInitialized);
    
    if (window.FS) {
      try {
        window.FS.event('FullStory Test', { 
          timestamp: new Date().toISOString(),
          test: true 
        });
        console.log('FullStory: Test event sent successfully');
      } catch (error) {
        console.error('FullStory: Error sending test event:', error);
      }
    }
  }
}

// Export singleton instance
export const fullstory = FullStoryService.getInstance();

// Common event tracking functions
export const trackUserLogin = (userId: string, userEmail?: string) => {
  fullstory.identifyUser(userId, {
    email: userEmail,
    loginTime: new Date().toISOString(),
  });
  fullstory.trackEvent('User Login', {
    userId,
    timestamp: new Date().toISOString(),
  });
};

export const trackUserLogout = (userId: string) => {
  fullstory.trackEvent('User Logout', {
    userId,
    timestamp: new Date().toISOString(),
  });
  fullstory.anonymizeUser();
};

export const trackTripCreated = (tripId: string, tripName: string, userId: string) => {
  fullstory.trackEvent('Trip Created', {
    tripId,
    tripName,
    userId,
    timestamp: new Date().toISOString(),
  });
};

export const trackTripJoined = (tripId: string, userId: string) => {
  fullstory.trackEvent('Trip Joined', {
    tripId,
    userId,
    timestamp: new Date().toISOString(),
  });
};

export const trackPageView = (pageName: string, properties?: Record<string, any>) => {
  fullstory.trackEvent('Page View', {
    page: pageName,
    timestamp: new Date().toISOString(),
    ...properties,
  });
};
