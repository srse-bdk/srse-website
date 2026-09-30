"use client";

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";
import { getApp } from "firebase/app";
import { firebaseVapidConfig } from "@/lib/env";

let messaging: Messaging | null = null;
let messagingInitPromise: Promise<Messaging | null> | null = null;

function canUseMessagingApis(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  // Firebase Messaging needs a secure context (https or localhost).
  if (!window.isSecureContext) return false;
  return true;
}

/**
 * Initialize Firebase Messaging only when the browser supports it.
 * Avoids crashes like `addEventListener` on undefined in unsupported
 * environments (some Safari / insecure contexts / missing SW).
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!canUseMessagingApis()) {
    return null;
  }

  if (messaging) {
    return messaging;
  }

  if (!messagingInitPromise) {
    messagingInitPromise = (async () => {
      try {
        const supported = await isSupported();
        if (!supported) {
          return null;
        }
        const app = getApp();
        messaging = getMessaging(app);
        return messaging;
      } catch (error) {
        console.warn("Firebase Messaging unavailable:", error);
        messaging = null;
        return null;
      }
    })();
  }

  return messagingInitPromise;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get FCM token for the current user/device
 */
export async function getFCMToken(): Promise<string | null> {
  if (!canUseMessagingApis()) {
    return null;
  }

  const messagingInstance = await getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    const vapidKey = firebaseVapidConfig.publicKey;
    if (!vapidKey) {
      console.warn("VAPID key not configured; skipping FCM token");
      return null;
    }

    const token = await getToken(messagingInstance, {
      vapidKey,
    });

    return token;
  } catch (error) {
    console.warn("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Save notification token to Firebase Database
 */
export async function saveNotificationToken(
  userId: string,
  token: string,
  deviceInfo?: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        token,
        deviceInfo: deviceInfo || navigator.userAgent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.warn("Error saving notification token:", error);
    return false;
  }
}

/**
 * Initialize messaging and get token
 * Call this when user logs in
 */
export async function initializeMessaging(
  userId: string,
): Promise<string | null> {
  if (!canUseMessagingApis()) {
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  const token = await getFCMToken();
  if (!token) {
    return null;
  }

  await saveNotificationToken(userId, token);
  return token;
}

/**
 * Listen for foreground messages
 */
export async function onForegroundMessage(
  callback: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  if (!canUseMessagingApis()) {
    return null;
  }

  const messagingInstance = await getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    return onMessage(messagingInstance, callback);
  } catch (error) {
    console.warn("Error setting up foreground message listener:", error);
    return null;
  }
}

/**
 * Register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canUseMessagingApis()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      {
        scope: "/",
      },
    );
    return registration;
  } catch (error) {
    console.warn("Error registering service worker:", error);
    return null;
  }
}
