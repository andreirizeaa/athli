import React, { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import {
  CustomPurchaseControllerProvider,
  SuperwallProvider as ExpoSuperwallProvider,
  SuperwallLoaded,
  useUser,
  SuperwallExpoModule,
} from 'expo-superwall';
import Purchases from 'react-native-purchases';
import { usePurchases } from './PurchasesContext';
import { showAlert } from '../services/alertService';

interface SuperwallContextValue {
  // Add any Superwall-specific state or methods here if needed
}

const SuperwallContext = createContext<SuperwallContextValue | undefined>(undefined);

function SubscriptionSync() {
  const { setSubscriptionStatus, subscriptionStatus } = useUser();
  const { isInitializing, customerInfo } = usePurchases();

  useEffect(() => {
    // Don't run until SDK is initialized
    if (isInitializing) return;

    Purchases.addCustomerInfoUpdateListener((customerInfo: any) => {
      const entitlementIds = Object.keys(customerInfo.entitlements.active);
      setSubscriptionStatus({
        status: entitlementIds.length === 0 ? 'INACTIVE' : 'ACTIVE',
        entitlements: entitlementIds.map((id) => ({
          id,
          type: 'SERVICE_LEVEL',
        })),
      });
    });

    // Get initial customer info only after initialization
    const syncInitialStatus = async () => {
      try {
        // Use the customerInfo from context if available, otherwise fetch it
        let info = customerInfo;
        if (!info) {
          info = await Purchases.getCustomerInfo();
        }

        const entitlementIds = Object.keys(info.entitlements.active);

        setSubscriptionStatus({
          status: entitlementIds.length === 0 ? 'INACTIVE' : 'ACTIVE',
          entitlements: entitlementIds.map((id) => ({
            id,
            type: 'SERVICE_LEVEL',
          })),
        });
      } catch (error) {
        showAlert(
          'Error',
          'Unable to sync subscription status. Please check your connection.',
          undefined,
          'SUPERWALL_CONTEXT_SYNC_ERROR',
          error
        );
      }
    };

    syncInitialStatus();
  }, [setSubscriptionStatus, isInitializing, customerInfo]);

  return null; // This component just handles the sync
}

export function SuperwallProvider({ children }: { children: ReactNode }) {
  const { purchasePackage, restorePurchases, packages, hasSubscription, hasHdVideos } =
    usePurchases();

  // Keep always-fresh booleans in refs so async flows can read the newest values
  const hasSubRef = useRef(hasSubscription);
  const hasHDRef = useRef(hasHdVideos);
  useEffect(() => {
    hasSubRef.current = hasSubscription;
  }, [hasSubscription]);
  useEffect(() => {
    hasHDRef.current = hasHdVideos;
  }, [hasHdVideos]);

  return (
    <CustomPurchaseControllerProvider
      controller={{
        onPurchase: async (params) => {
          try {
            const pkg = packages.find((p) => p.product.identifier === params.productId);
            if (!pkg)
              return {
                type: 'failed' as const,
                error: `Package not found for product: ${params.productId}`,
              };
            const result = await purchasePackage(pkg);
            return result;
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            if (msg === 'Purchase was cancelled.') {
              try {
                SuperwallExpoModule.didPurchase?.({ type: 'cancelled' });
              } catch {}
              return { type: 'cancelled' as const };
            }
            return { type: 'failed' as const, error: msg };
          }
        },

        onPurchaseRestore: async () => {
          try {
            // Snapshot which paywall we're likely on
            const wasSubscribed = hasSubRef.current; // videos paywall if true
            const wasHD = hasHDRef.current;

            // Kick off restore with RevenueCat
            await restorePurchases();

            // Decide success strictly from usePurchases booleans
            if (wasSubscribed) {
              // On videos paywall: require HD videos
              if (hasHDRef.current) {
                try {
                  SuperwallExpoModule.didRestore?.({ type: 'restored' });
                } catch {}
                return { type: 'restored' as const };
              }
              return { type: 'failed' as const, error: 'No HD Videos found to restore' };
            } else {
              // On subscription paywall: require subscription
              if (hasSubRef.current) {
                try {
                  SuperwallExpoModule.didRestore?.({ type: 'restored' });
                } catch {}
                return { type: 'restored' as const };
              }
              return { type: 'failed' as const, error: 'No active subscription found to restore' };
            }
          } catch (error) {
            const msg = (error as { message?: string })?.message ?? 'Unknown restore error';
            return { type: 'failed' as const, error: msg };
          }
        },
      }}
    >
      <ExpoSuperwallProvider apiKeys={{ ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY }}>
        <SuperwallLoaded>
          <SubscriptionSync />
          {children}
        </SuperwallLoaded>
      </ExpoSuperwallProvider>
    </CustomPurchaseControllerProvider>
  );
}

export function useSuperwall() {
  const ctx = useContext(SuperwallContext);
  if (!ctx) throw new Error('useSuperwall must be used within a SuperwallProvider');
  return ctx;
}

// Export the useUser hook from expo-superwall for convenience
export { useUser };
