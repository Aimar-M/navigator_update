import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  if (!start || !end) return '';
  
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  // Same year
  if (startDate.getFullYear() === endDate.getFullYear()) {
    // Same month
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short' })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
    // Different month
    return `${startDate.toLocaleDateString('en-US', { month: 'short' })} ${startDate.getDate()} - ${endDate.toLocaleDateString('en-US', { month: 'short' })} ${endDate.getDate()}, ${startDate.getFullYear()}`;
  }
  
  // Different year
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function formatTime(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} • ${formatTime(d)}`;
}

export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getTripStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-primary-100 text-primary-800';
    case 'planning':
      return 'bg-amber-100 text-amber-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'upcoming':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getMemberStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'text-success-500';
    case 'pending':
      return 'text-amber-500';
    case 'declined':
      return 'text-error-500';
    default:
      return 'text-gray-500';
  }
}

// Stock travel images for demo
export const destinationImages = [
  'https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1569288063643-5d29ad6a7695?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600'
];

// Group travel photos
export const groupTravelImages = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1527631746610-bca00a040d60?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600'
];

// Planning/itinerary images
export const planningImages = [
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1502920514313-52581002a659?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600',
  'https://images.unsplash.com/photo-1459257831348-f0cdd359235f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600'
];

// Random selection from the destination images
export function getRandomDestinationImage(): string {
  return destinationImages[Math.floor(Math.random() * destinationImages.length)];
}

// Weather icons mapping
export const weatherIcons: Record<string, string> = {
  'Sunny': 'ri-sun-line',
  'Partly Cloudy': 'ri-sun-cloudy-line',
  'Cloudy': 'ri-cloudy-line',
  'Rainy': 'ri-rainy-line',
  'Thunderstorm': 'ri-thunderstorms-line',
  'Snowy': 'ri-snowy-line'
};

// Detect if user is on mobile device
export function isMobileDevice(): boolean {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Detect specific mobile platform
export function getMobilePlatform(): 'ios' | 'android' | 'desktop' {
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
	const isAndroid = /Android/.test(navigator.userAgent);
	
	if (isIOS) return 'ios';
	if (isAndroid) return 'android';
	return 'desktop';
}

// Attempt to open Venmo app with mobile app deep links and fallbacks
export function openVenmoLinkWithFallback(webUrl: string, timeoutMs: number = 1600): void {
	try {
		const url = new URL(webUrl);
		// Expecting format: https://venmo.com/<handle>?txn=pay&amount=...&note=...
		const handle = decodeURIComponent(url.pathname.replace(/^\//, ''));
		const params = url.searchParams;
		const txn = params.get('txn') || 'pay';
		const amount = params.get('amount') || '';
		const note = params.get('note') || '';

		const platform = getMobilePlatform();
		const isMobile = isMobileDevice();

		// Build app deep link
		const appLink = `venmo://paycharge?txn=${encodeURIComponent(txn)}&recipients=${encodeURIComponent(handle)}&amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}`;

		const appStoreUrl = 'https://apps.apple.com/app/id351727428';
		const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.venmo';

		// On mobile, try app deep link first
		if (isMobile) {
			let didHide = false;
			const onVisibilityChange = () => { if (document.hidden) didHide = true; };
			document.addEventListener('visibilitychange', onVisibilityChange);

			// Attempt to open the Venmo app
			(window as any).location.href = appLink;

			// If the app doesn't open, fall back to app store
			setTimeout(() => {
				document.removeEventListener('visibilitychange', onVisibilityChange);
				if (!didHide) {
					if (platform === 'ios') {
						(window as any).location.href = appStoreUrl;
					} else if (platform === 'android') {
						(window as any).location.href = playStoreUrl;
					} else {
						// Fallback to web on desktop
						window.open(webUrl, '_blank', 'noopener,noreferrer');
					}
				}
			}, timeoutMs);
		} else {
			// On desktop, open web link in new tab
			window.open(webUrl, '_blank', 'noopener,noreferrer');
		}
	} catch {
		// If parsing fails, just open the web URL
		window.open(webUrl, '_blank', 'noopener,noreferrer');
	}
}

// Attempt to open PayPal app with mobile app deep links and fallbacks
export function openPayPalLinkWithFallback(webUrl: string, timeoutMs: number = 1600): void {
	try {
		const url = new URL(webUrl);
		const platform = getMobilePlatform();
		const isMobile = isMobileDevice();

		// Extract PayPal email from the URL
		const businessParam = url.searchParams.get('business');
		const amount = url.searchParams.get('amount') || '';
		const itemName = url.searchParams.get('item_name') || '';

		// Build PayPal app deep link
		// PayPal deep link format: paypal://sendmoney?recipient=email&amount=amount&note=note
		const appLink = `paypal://sendmoney?recipient=${encodeURIComponent(businessParam || '')}&amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(itemName)}`;

		const appStoreUrl = 'https://apps.apple.com/app/id283646709'; // PayPal iOS app
		const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.paypal.android.p2pmobile'; // PayPal Android app

		// On mobile, try app deep link first
		if (isMobile) {
			let didHide = false;
			const onVisibilityChange = () => { if (document.hidden) didHide = true; };
			document.addEventListener('visibilitychange', onVisibilityChange);

			// Attempt to open the PayPal app
			(window as any).location.href = appLink;

			// If the app doesn't open, fall back to app store
			setTimeout(() => {
				document.removeEventListener('visibilitychange', onVisibilityChange);
				if (!didHide) {
					if (platform === 'ios') {
						(window as any).location.href = appStoreUrl;
					} else if (platform === 'android') {
						(window as any).location.href = playStoreUrl;
					} else {
						// Fallback to web on desktop
						window.open(webUrl, '_blank', 'noopener,noreferrer');
					}
				}
			}, timeoutMs);
		} else {
			// On desktop, open web link in new tab
			window.open(webUrl, '_blank', 'noopener,noreferrer');
		}
	} catch {
		// If parsing fails, just open the web URL
		window.open(webUrl, '_blank', 'noopener,noreferrer');
	}
}

// Universal payment link opener that detects payment method and uses appropriate mobile app
export function openPaymentLinkWithMobileFallback(paymentLink: string, paymentMethod: 'venmo' | 'paypal'): void {
	if (paymentMethod === 'venmo') {
		openVenmoLinkWithFallback(paymentLink);
	} else if (paymentMethod === 'paypal') {
		openPayPalLinkWithFallback(paymentLink);
	} else {
		// Fallback for unknown payment methods
		window.open(paymentLink, '_blank', 'noopener,noreferrer');
	}
}
