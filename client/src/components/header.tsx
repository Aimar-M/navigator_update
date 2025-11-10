import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bell, ChevronDown, Menu, MessageCircle, CalendarPlus, UserPlus, PieChart, DollarSign, HelpCircle, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useQuery } from "@tanstack/react-query";
import navigatorLogo from "@assets/ab_Navigator2-11_1749671092581.png";
import navigatorText from "@assets/ab_Navigator2-09_1749671257407.png";
import { NotificationBell } from "@/components/NotificationBell";

const API_BASE = import.meta.env.VITE_API_URL || '';


export default function Header() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { startManualTour } = useOnboarding();
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const token = user ? localStorage.getItem('auth_token') : null;
  
  // Fetch pending invitations for notifications
  const { data: pendingInvitations } = useQuery({
    queryKey: [`${API_BASE}/api/trips/memberships/pending`, !!user, token],
    queryFn: async () => {
      // if (!user || !token) return [];
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      try {
        const response = await fetch(`${API_BASE}/api/trips/memberships/pending`, { headers });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.error("Failed to fetch pending invitations", error);
        return [];
      }
    },
    enabled: !!user && !!token,
    refetchInterval: 2000,
  });

  // Fetch general notifications (downpayments, etc.)
  const { data: generalNotifications = [] } = useQuery({
    queryKey: [`${API_BASE}/api/notifications`, !!user, token],
    queryFn: async () => {
      if (!user || !token) return [];
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      try {
        const response = await fetch(`${API_BASE}/api/notifications`, { headers });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.error("Failed to fetch notifications", error);
        return [];
      }
    },
    enabled: !!user && !!token,
    refetchInterval: 5000, // Poll every 5 seconds for new notifications
  });
  
  // Update notifications when data changes
  useEffect(() => {
    if (!pendingInvitations && !generalNotifications) return;
    
    // Get read notification IDs from localStorage
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    const newNotifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      time: Date;
      data: any;
      isRead: boolean;
    }> = [];
    
    // Add trip invitation notifications
    if (pendingInvitations && pendingInvitations.length > 0) {
      pendingInvitations.forEach((invitation: any) => {
        // Create unique notification ID that includes user ID, trip ID, and timestamp
        // This ensures re-invitations after payment rejection trigger new notifications
        const timestamp = new Date(invitation.membership.joinedAt).getTime();
        const notifId = `invite-${invitation.membership.userId}-${invitation.membership.tripId}-${timestamp}`;
        newNotifications.push({
          id: notifId,
          type: 'invite',
          title: `Trip Invitation: ${invitation.trip?.name}`,
          message: `${invitation.organizer?.name || invitation.organizer?.username} invited you to join their trip`,
          time: invitation.membership.joinedAt,
          data: invitation,
          isRead: readIds.includes(notifId)
        });
      });
    }

    // Add general notifications (downpayments, etc.)
    if (generalNotifications && generalNotifications.length > 0) {
      generalNotifications.forEach((notif: any) => {
        // Only show unread notifications and filter for relevant types
        if (notif.isRead) return;
        
        // Handle downpayment notifications
        if (notif.type === 'downpayment_required' || notif.type === 'downpayment_updated' || notif.type === 'downpayment_removed' || notif.type === 'downpayment_submitted') {
          const notifId = `notif-${notif.id}`;
          newNotifications.push({
            id: notifId,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            time: notif.createdAt,
            data: notif.data || {},
            isRead: readIds.includes(notifId)
          });
        }
        
        // Handle settlement notifications
        if (notif.type === 'settlement_confirmed' || notif.type === 'settlement_rejected') {
          const notifId = `notif-${notif.id}`;
          newNotifications.push({
            id: notifId,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            time: notif.createdAt,
            data: notif.data || {},
            isRead: readIds.includes(notifId)
          });
        }
      });
    }
    
    // Sort notifications by time (newest first)
    newNotifications.sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    
    // Set has notifications flag
    setHasNotifications(newNotifications.some(n => !n.isRead));
    setNotifications(newNotifications);
  }, [pendingInvitations, generalNotifications]);
  
  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'invite') {
      navigate(`/trips/${notification.data.trip.id}`);
    } else if (notification.type === 'downpayment_required' || notification.type === 'downpayment_updated' || notification.type === 'downpayment_removed' || notification.type === 'downpayment_submitted') {
      // Navigate to trip if tripId is available in notification data
      if (notification.data?.tripId) {
        navigate(`/trips/${notification.data.tripId}`);
      }
    } else if (notification.type === 'settlement_confirmed' || notification.type === 'settlement_rejected') {
      // Navigate to trip if tripId is available in notification data
      if (notification.data?.tripId) {
        navigate(`/trips/${notification.data.tripId}`);
      }
    }
    // Mark as read in localStorage
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readIds.includes(notification.id)) {
      const newReadIds = [...readIds, notification.id];
      localStorage.setItem('readNotifications', JSON.stringify(newReadIds));
    }
    // Mark as read in state
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? {...n, isRead: true} : n
    ));
    // Update hasNotifications
    setHasNotifications(prev => prev && notifications.some(n => !n.isRead && n.id !== notification.id));
    // Close dropdown
    setNotificationsOpen(false);
  };
  
  const handleMarkAllAsRead = () => {
    // Store all notification IDs as read in localStorage
    const allIds = notifications.map(n => n.id);
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    const newReadIds = Array.from(new Set([...readIds, ...allIds]));
    localStorage.setItem('readNotifications', JSON.stringify(newReadIds));
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    setHasNotifications(false);
  };

  const handleStartTour = () => {
    // Navigate to dashboard first
    navigate('/dashboard');
    // Small delay to ensure route change completes before starting tour
    setTimeout(() => {
      startManualTour();
    }, 100);
  };

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    // Note: logout() already handles the redirect, so no need for additional redirect here
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 px-4">
      <div className="container mx-auto h-full flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/" data-tooltip="navigator-logo">
            <div className="flex items-center space-x-2 cursor-pointer">
              <img 
                src={navigatorLogo} 
                alt="Navigator Logo" 
                className="h-12 w-12 block md:hidden"
              />
              <img 
                src={navigatorText} 
                alt="Navigator" 
                className="h-14 hidden md:block"
              />
            </div>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center space-x-2">
            {/* Budget Dashboard Button */}
            {/* <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:bg-gray-100"
              onClick={() => navigate("/budget-dashboard")}
              title="Budget Dashboard"
            >
              <PieChart className="h-5 w-5" />
            </Button> */}

            <NotificationBell />

            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-500 hover:bg-gray-100"
                  data-tooltip="notification-bell"
                >
                  <Bell className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500">
                      {notifications.length > 0 && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      )}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-2">
                  <DropdownMenuLabel className="text-base font-semibold">Notifications</DropdownMenuLabel>
                  {notifications.length > 0 && (
                    <Button 
                      variant="ghost" 
                      className="h-auto p-1 text-xs text-gray-500 hover:text-gray-900"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                
                {notifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className={`p-3 cursor-pointer ${notification.isRead ? 'bg-white' : 'bg-blue-50'}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                            {notification.type === 'invite' && (
                              <UserPlus className="h-4 w-4 text-blue-600" />
                            )}
                            {notification.type === 'message' && (
                              <MessageCircle className="h-4 w-4 text-blue-600" />
                            )}
                            {notification.type === 'activity' && (
                              <CalendarPlus className="h-4 w-4 text-blue-600" />
                            )}
                            {(notification.type === 'downpayment_required' || notification.type === 'downpayment_updated' || notification.type === 'downpayment_removed' || notification.type === 'downpayment_submitted') && (
                              <DollarSign className="h-4 w-4 text-blue-600" />
                            )}
                            {(notification.type === 'settlement_confirmed' || notification.type === 'settlement_rejected') && (
                              <HandHeart className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-500">{notification.message}</p>
                            <p className="text-xs text-gray-400">
                              {notification.time && (
                                <>
                                  {new Date(notification.time).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                                  {" "}
                                  {new Date(notification.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No new notifications</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-gray-100"
                >
                  <UserAvatar user={user} className="h-8 w-8" />
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <div className="cursor-pointer w-full flex">Profile</div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/outstanding-balances">
                    <div className="cursor-pointer w-full flex items-center">
                      Outstanding Balances
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleStartTour}>
                  <div className="cursor-pointer w-full flex items-center">
                    Take a quick tour
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a 
                    href="/contact?fromHelp=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer w-full flex items-center"
                  >
                    Help
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild size="sm">
              <Link href="/login">
                <a>Log in</a>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                <a>Sign up</a>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
