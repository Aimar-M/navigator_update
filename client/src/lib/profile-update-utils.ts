import { QueryClient } from '@tanstack/react-query';

/**
 * Comprehensive profile update utility that invalidates ALL queries
 * containing user information across the entire application
 */
export function invalidateAllUserQueries(queryClient: QueryClient, userId?: number, username?: string) {
  console.log('🔄 Invalidating all user-related queries for:', { userId, username });

  // 1. Basic data queries
  queryClient.invalidateQueries({ queryKey: ['/trips'] });
  queryClient.invalidateQueries({ queryKey: ['/expenses'] });
  queryClient.invalidateQueries({ queryKey: ['/activities'] });
  queryClient.invalidateQueries({ queryKey: ['/messages'] });
  queryClient.invalidateQueries({ queryKey: ['/memberships'] });
  queryClient.invalidateQueries({ queryKey: ['/settlements'] });
  queryClient.invalidateQueries({ queryKey: ['/flights'] });
  queryClient.invalidateQueries({ queryKey: ['/polls'] });
  queryClient.invalidateQueries({ queryKey: ['/rsvp'] });
  queryClient.invalidateQueries({ queryKey: ['/chats'] });
  queryClient.invalidateQueries({ queryKey: ['/invitations'] });

  // 2. Trip member queries (CRITICAL for member displays)
  queryClient.invalidateQueries({ queryKey: ['/trips', 'members'] });
  queryClient.invalidateQueries({ queryKey: ['/trips', 'memberships'] });
  queryClient.invalidateQueries({ queryKey: ['/trips/memberships/pending'] });

  // 3. User-specific queries
  if (userId) {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && 
               queryKey.some(key => key === userId);
      }
    });
  }

  if (username) {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && 
               queryKey.some(key => key === username);
      }
    });
  }

  // 4. All member-related queries using predicate (most comprehensive)
  queryClient.invalidateQueries({ 
    predicate: (query) => {
      const queryKey = query.queryKey;
      if (!Array.isArray(queryKey)) return false;
      
      // Check for any key containing user-related terms
      const hasUserTerms = queryKey.some(key => {
        if (typeof key !== 'string') return false;
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('members') ||
               lowerKey.includes('memberships') ||
               lowerKey.includes('user') ||
               lowerKey.includes('profile') ||
               lowerKey.includes('avatar');
      });
      
      // Check for specific patterns we know contain user data
      const hasUserPatterns = queryKey.some(key => {
        if (typeof key !== 'string') return false;
        return key.includes('/members') ||
               key.includes('/users') ||
               key.includes('/profile') ||
               key.includes('/avatar');
      });
      
      return hasUserTerms || hasUserPatterns;
    }
  });

  // 5. Specific query patterns that we know contain user data
  const specificPatterns = [
    ['/trips', 'members'],
    ['/trips', 'memberships'],
    ['/trips/memberships/pending'],
    ['/users'],
    ['/profile'],
    ['/avatar'],
    ['/settlements'],
    ['/expenses'],
    ['/activities'],
    ['/flights'],
    ['/polls'],
    ['/rsvp'],
    ['/chats'],
    ['/messages'],
    ['/invitations']
  ];

  specificPatterns.forEach(pattern => {
    queryClient.invalidateQueries({ queryKey: pattern });
  });

  console.log('✅ All user-related queries invalidated');
}

/**
 * Optimistic profile update helper
 */
export function optimisticallyUpdateUserData(
  queryClient: QueryClient, 
  userId: number, 
  updates: any
) {
  // Update the main user profile query
  queryClient.setQueryData([`${import.meta.env.VITE_API_URL || ''}/api/auth/me`], (old: any) => ({
    ...old,
    ...updates,
    name: updates.name || (updates.firstName && updates.lastName 
      ? `${updates.firstName} ${updates.lastName}`.trim()
      : old?.name)
  }));

  // Update any user-specific queries
  queryClient.setQueryData([`${import.meta.env.VITE_API_URL || ''}/api/users/${userId}`], (old: any) => ({
    ...old,
    ...updates,
    name: updates.name || (updates.firstName && updates.lastName 
      ? `${updates.firstName} ${updates.lastName}`.trim()
      : old?.name)
  }));

  console.log('🚀 Optimistically updated user data:', updates);
}
