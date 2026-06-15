"use client";

import { configureAuth } from "@atechhub/firebase";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { AuthRouteGuard } from "@/components/auth/auth-route-guard";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useAppStore } from "@/hooks/use-app-store";
import { isValidPortalRole } from "@/lib/config/auth-routes";
import { firebaseAuthConfig, firebaseConfig } from "@/lib/env";
import {
  markScannerLoginNotified,
  notifyScannerLogin,
} from "@/lib/services/scanner-login-notification.service";
import { collectClientDeviceInfo } from "@/lib/utils/device-info";
import {
  initializeMessaging,
  onForegroundMessage,
  registerServiceWorker,
} from "@/lib/utils/firebase-messaging";

interface FirebaseProviderProps {
  children: React.ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const setUser = useAppStore((state) => state.setUser);
  const setAuthReady = useAppStore((state) => state.setAuthReady);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeForeground: (() => void) | null = null;

    const finishAuthInit = () => {
      setAuthReady(true);
    };

    try {
      configureAuth(firebaseAuthConfig);
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      const database = getDatabase(app);

      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        registerServiceWorker().catch((error) => {
          console.error("Failed to register service worker:", error);
        });
      }

      unsubscribeAuth = onAuthStateChanged(auth, async (loggedInUser) => {
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }
        if (unsubscribeForeground) {
          unsubscribeForeground();
          unsubscribeForeground = null;
        }

        if (!loggedInUser?.uid) {
          setUser(null);
          finishAuthInit();
          return;
        }

        const userRef = ref(database, `users/${loggedInUser.uid}`);
        unsubscribeUser = onValue(userRef, async (snap) => {
          const userData = snap.val();

          if (!userData) {
            console.warn("Auth user has no portal profile. Signing out.");
            await auth.signOut();
            setUser(null);
            toast.error("This account is not authorized to sign in.");
            finishAuthInit();
            return;
          }

          if (!isValidPortalRole(userData.role)) {
            console.warn("Invalid portal role. Signing out.");
            await auth.signOut();
            setUser(null);
            toast.error("This account is not authorized to sign in.");
            finishAuthInit();
            return;
          }

          if (userData.status === "inactive") {
            await auth.signOut();
            setUser(null);
            toast.error("Your account is inactive. Please contact support.");
            finishAuthInit();
            return;
          }

          const portalUser = {
            ...userData,
            uid: loggedInUser.uid,
            id: loggedInUser.uid,
          };
          setUser(portalUser);

          if (userData.role === "scanner" && markScannerLoginNotified(loggedInUser.uid)) {
            void notifyScannerLogin({
              scannerUserId: loggedInUser.uid,
              scannerName: userData.name || "Gate Scanner",
              scannerEmail: userData.email || "",
              device: collectClientDeviceInfo(),
            });
          }

          if (typeof window !== "undefined" && userData.role !== "scanner") {
            try {
              const token = await initializeMessaging(loggedInUser.uid);
              if (token) {
                console.log("FCM token obtained and saved");
              }

              unsubscribeForeground = onForegroundMessage((payload) => {
                const notificationTitle =
                  payload.notification?.title || "Notification";
                const notificationBody = payload.notification?.body || "";
                const clickAction =
                  payload.data?.url || payload.fcmOptions?.link;

                toast.custom(
                  (t) => (
                    <button
                      type="button"
                      className="w-full max-w-md rounded-lg border bg-card shadow-lg p-4 text-left cursor-pointer hover:shadow-xl transition-shadow"
                      onClick={() => {
                        toast.dismiss(t);
                        if (clickAction) {
                          window.location.href = clickAction;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-sm font-semibold text-card-foreground truncate">
                            {notificationTitle}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {notificationBody}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.dismiss(t);
                          }}
                          className="text-muted-foreground hover:text-foreground flex-shrink-0 text-xs"
                          aria-label="Close notification"
                        >
                          ✕
                        </button>
                      </div>
                    </button>
                  ),
                  { duration: 8000, position: "top-right" },
                );
              });
            } catch (error) {
              console.error("Failed to initialize messaging:", error);
            }
          }

          finishAuthInit();
        });
      });
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      finishAuthInit();
    }

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [setUser, setAuthReady]);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <LogoSpinner size={100} />
        </div>
      }
    >
      <AuthRouteGuard>{children}</AuthRouteGuard>
    </Suspense>
  );
}
