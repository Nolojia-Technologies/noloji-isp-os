import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localizedFormat from "dayjs/plugin/localizedFormat";

// Configure dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Kenyan Shillings
 */
export function formatCurrency(amount: number | string, options?: {
  showSymbol?: boolean;
  decimals?: number;
}): string {
  const { showSymbol = true, decimals = 2 } = options || {};
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  const formatted = new Intl.NumberFormat('en-KE', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'KES',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numAmount);

  return formatted;
}

/**
 * Format numbers with proper localization
 */
export function formatNumber(value: number | string, options?: Intl.NumberFormatOptions): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-KE', options).format(numValue);
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format bandwidth with proper units
 */
export function formatBandwidth(bps: number): string {
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  let unitIndex = 0;
  let value = bps;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Date formatting utilities with Nairobi timezone
 */
export const dateUtils = {
  /**
   * Format date for display in local timezone (Africa/Nairobi)
   */
  format(date: Date | string, format: string = 'MMM DD, YYYY HH:mm'): string {
    return dayjs(date).tz('Africa/Nairobi').format(format);
  },

  /**
   * Get relative time from now
   */
  fromNow(date: Date | string): string {
    return dayjs(date).fromNow();
  },

  /**
   * Check if date is today
   */
  isToday(date: Date | string): boolean {
    return dayjs(date).isSame(dayjs(), 'day');
  },

  /**
   * Get start of day in Nairobi timezone
   */
  startOfDay(date?: Date | string): string {
    return dayjs(date).tz('Africa/Nairobi').startOf('day').toISOString();
  },

  /**
   * Get end of day in Nairobi timezone
   */
  endOfDay(date?: Date | string): string {
    return dayjs(date).tz('Africa/Nairobi').endOf('day').toISOString();
  },

  /**
   * Format duration
   */
  duration(milliseconds: number): string {
    const duration = dayjs.duration(milliseconds);
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
};

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generate random ID
 */
export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Kenyan format)
 */
export function isValidKenyanPhone(phone: string): boolean {
  // Supports formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
  const phoneRegex = /^(\+?254|0)[17]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format phone number to international format
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');

  if (cleaned.startsWith('0')) {
    return '+254' + cleaned.slice(1);
  } else if (cleaned.startsWith('254')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+254')) {
    return cleaned;
  }

  return phone; // Return original if doesn't match expected formats
}

/**
 * Validate MAC address
 */
export function isValidMacAddress(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Validate IP address (IPv4)
 */
export function isValidIpAddress(ip: string): boolean {
  const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

/**
 * Get status color based on status string
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();

  if (['active', 'online', 'connected', 'success', 'paid'].includes(statusLower)) {
    return 'text-success';
  } else if (['inactive', 'offline', 'disconnected', 'failed', 'unpaid'].includes(statusLower)) {
    return 'text-danger';
  } else if (['pending', 'processing', 'loading'].includes(statusLower)) {
    return 'text-warning';
  } else if (['paused', 'suspended', 'maintenance'].includes(statusLower)) {
    return 'text-muted-foreground';
  }

  return 'text-foreground';
}

/**
 * Get signal strength color and text
 */
export function getSignalStrength(rssi: number): { color: string; text: string } {
  if (rssi >= -50) {
    return { color: 'text-success', text: 'Excellent' };
  } else if (rssi >= -60) {
    return { color: 'text-success', text: 'Good' };
  } else if (rssi >= -70) {
    return { color: 'text-warning', text: 'Fair' };
  } else if (rssi >= -80) {
    return { color: 'text-danger', text: 'Weak' };
  } else {
    return { color: 'text-danger', text: 'Very Weak' };
  }
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substr(0, length) + '...';
}

/**
 * Create initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  return Object.keys(obj).length === 0;
}