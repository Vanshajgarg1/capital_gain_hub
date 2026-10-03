/**
 * Global type augmentations for the application.
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export {};
