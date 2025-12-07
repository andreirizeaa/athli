import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getUserId } from '../services/storageService';
import { favouriteLift as favouriteLiftApi } from '../services/lifts/liftService';
import { subscribeLiftDeleted } from '../services/lifts/liftEvents';
import { eventBus, AppEvents } from '../services/lifts/event-bus';
import { ILiftData, LiftDataContextType } from '../types/Lifts.d';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Re-export for backward compatibility
export { ILiftData };

const LiftDataContext = createContext<LiftDataContextType | undefined>(undefined);

const initialLiftData: ILiftData[] = [];

interface LiftDataProviderProps {
  children: ReactNode;
}

export function LiftDataProvider({ children }: LiftDataProviderProps) {
  const [liftData, setLiftData] = useState<ILiftData[]>(initialLiftData);
  const [userId, setUserIdState] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isTutorialReplay, setIsTutorialReplay] = useState<boolean>(false);

  useEffect(() => {
    getUserId()
      .then(setUserIdState)
      .catch(() => setUserIdState(null));
    setIsLoaded(false);
  }, []);

  // Keep userId in sync with Supabase auth too (nice to have)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserIdState(session?.user?.id ?? null);
    });
    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Set loaded to true if there's no userId (onboarding case)
  useEffect(() => {
    if (userId === null) {
      setIsLoaded(true);
    }
  }, [userId]);

  // Helper function to format date consistently
  const formatDateForLift = useCallback((date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  const addLift = useCallback((lift: ILiftData) => {
    setLiftData((prev) => [...prev, lift]);
  }, []);

  const updateLift = useCallback((id: string, updatedLift: Partial<ILiftData>) => {
    setLiftData((prev) =>
      prev.map((lift) => (lift.id === id ? { ...lift, ...updatedLift } : lift))
    );
  }, []);

  const removeLift = useCallback((id: string) => {
    setLiftData((prev) => prev.filter((lift) => lift.id !== id));
  }, []);

  const toggleFavourite = useCallback((id: string) => {
    setLiftData((prev) =>
      prev.map((lift) => (lift.id === id ? { ...lift, isFavourite: !lift.isFavourite } : lift))
    );
  }, []);

  const getLiftById = useCallback(
    (id: string): ILiftData | undefined => {
      return liftData.find((lift) => lift.id === id);
    },
    [liftData]
  );

  const getFavouriteLifts = useCallback((): ILiftData[] => {
    return liftData.filter((lift) => lift.isFavourite);
  }, [liftData]);

  const getLiftsByType = useCallback(
    (liftType: string): ILiftData[] => {
      return liftData.filter((lift) => lift.liftType === liftType);
    },
    [liftData]
  );

  const getLiftsByDate = useCallback(
    (date: Date): ILiftData[] => {
      const dateString = formatDateForLift(date);
      const liftsForDate = liftData.filter((lift) => lift.liftDate === dateString);

      // Sort by time (latest first) - parse time strings and sort
      return liftsForDate.sort((a, b) => {
        // Parse time strings like "11:59 PM" or "2:30 AM"
        const parseTime = (timeStr: string): number => {
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          return hour24 * 60 + minutes; // Convert to minutes for easy comparison
        };

        const timeA = parseTime(a.liftTime);
        const timeB = parseTime(b.liftTime);
        return timeB - timeA; // Latest first (descending order)
      });
    },
    [liftData, formatDateForLift]
  );

  const getLiftsByDateString = useCallback(
    (dateString: string): ILiftData[] => {
      return liftData.filter((lift) => lift.liftDate === dateString);
    },
    [liftData]
  );

  const clearAllLifts = useCallback(() => {
    setLiftData([]);
  }, []);

  const upsertLift = useCallback(
    (lift: ILiftData) => {
      // 1) Update local context state
      setLiftData((prev) => {
        const idx = prev.findIndex((l) => l.id === lift.id);
        if (idx === -1) return [...prev, lift];
        const next = [...prev];
        next[idx] = { ...next[idx], ...lift };
        return next;
      });

      // 2) Seed per-lift cache
      queryClient.setQueryData(['lift', lift.id], lift);

      // 3) Optimistically merge into the list cache so a refetch can't "remove" it
      queryClient.setQueryData<ILiftData[] | undefined>(['lifts-by-user', userId], (old) => {
        const list = old ?? [];
        const i = list.findIndex((l) => l.id === lift.id);
        if (i === -1) return [...list, lift];
        const next = [...list];
        next[i] = { ...next[i], ...lift };
        return next;
      });
    },
    [queryClient, userId]
  );

  // Function to save current lift data to AsyncStorage
  const saveLiftDataToStorage = useCallback(async (): Promise<void> => {
    try {
      const dataToSave = {
        liftData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('tutorial_replay_backup', JSON.stringify(dataToSave));
    } catch (error) {}
  }, [liftData]);

  // Function to restore lift data from AsyncStorage
  const restoreLiftDataFromStorage = useCallback(async (): Promise<void> => {
    try {
      const savedData = await AsyncStorage.getItem('tutorial_replay_backup');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.liftData && Array.isArray(parsedData.liftData)) {
          setLiftData(parsedData.liftData);
        }
        // Clean up the backup data
        await AsyncStorage.removeItem('tutorial_replay_backup');
      }
    } catch (error) {}
  }, []);

  // Function to clear lift data for tutorial replay
  const clearLiftDataForTutorial = useCallback(() => {
    setLiftData([]);
    setIsTutorialReplay(true);
  }, []);

  // Function to restore lift data after tutorial
  const restoreLiftDataAfterTutorial = useCallback(async () => {
    await restoreLiftDataFromStorage();
    setIsTutorialReplay(false);
  }, [restoreLiftDataFromStorage]);

  const setSignedInUser = useCallback(
    async (id: string | null) => {
      setUserIdState(id);
      // re-gate until we actually fetch lifts
      setIsLoaded(false);
      if (!id) {
        setLiftData([]);
        setIsLoaded(true);
        return;
      }
      // trigger the exact query that powers the provider
      await queryClient.refetchQueries({ queryKey: ['lifts-by-user', id], exact: true });
      // when the queryFn resolves it will set liftData and set isLoaded(true) in its finally{}
    },
    [queryClient]
  );

  // Fetch lifts on load and whenever userId changes
  useQuery({
    queryKey: ['lifts-by-user', userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        if (!userId) return [] as ILiftData[];
        const { data, error } = await supabase
          .from('lifts')
          .select(
            'id, is_favourite, lift_type, lift_date, lift_time, metric_weight, reps, raw_video_url, pose_video_url, thumbnail_url, analysis'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) return [] as ILiftData[];
        async function extractObjectKeyFromUrl(
          urlOrKey?: string | null
        ): Promise<string | undefined> {
          if (!urlOrKey) return undefined;
          if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
            // Expect formats like /storage/v1/object/public/lifts/<key>
            const marker = '/storage/v1/object/';
            const idx = urlOrKey.indexOf(marker);
            if (idx === -1) return undefined;
            const after = urlOrKey.substring(idx + marker.length); // e.g. 'public/lifts/uid/path...'
            const parts = after.split('/');
            // parts[0] is 'public' or 'sign', parts[1] should be bucket id
            if (parts.length < 3) return undefined;
            const bucketId = parts[1];
            if (bucketId !== 'lifts') return undefined;
            const pathWithQuery = parts.slice(2).join('/');
            const key = pathWithQuery.split('?')[0];
            return key;
          }
          // Already a key
          return urlOrKey;
        }

        async function signPath(key?: string): Promise<string | undefined> {
          if (!key) return undefined;
          const { data: signed, error: signError } = await supabase.storage
            .from('lifts')
            .createSignedUrl(key, 60 * 30); // 30 minutes
          if (signError) {
            return undefined;
          }
          return signed?.signedUrl;
        }

        async function mapRowToLift(row: any): Promise<ILiftData> {
          const thumbKey = await extractObjectKeyFromUrl(row.thumbnail_url);
          const rawKey = await extractObjectKeyFromUrl(row.raw_video_url);
          const poseKey = await extractObjectKeyFromUrl(row.pose_video_url);
          const [thumbnailURL, rawVideoURL, poseVideoURL] = await Promise.all([
            signPath(thumbKey),
            signPath(rawKey),
            signPath(poseKey),
          ]);

          // Fallback to original URLs if signing fails
          const finalThumbnailURL = thumbnailURL || row.thumbnail_url;
          const finalRawVideoURL = rawVideoURL || row.raw_video_url;
          const finalPoseVideoURL = poseVideoURL || row.pose_video_url;
          const rawFeedback: Array<{ imageURL: any; flaws: any; improvement: any }> = Array.isArray(
            row.analysis?.feedback
          )
            ? row.analysis.feedback
            : [];
          const signedFeedback = await Promise.all(
            rawFeedback.map(async (f) => {
              const feedbackKey = await extractObjectKeyFromUrl(
                typeof f.imageURL === 'string' ? f.imageURL : undefined
              );
              const signedUrl = await signPath(feedbackKey);
              return { ...f, imageURL: signedUrl ?? f.imageURL };
            })
          );
          return {
            id: row.id,
            isFavourite: !!row.is_favourite,
            liftType: row.lift_type,
            liftDate: formatDateForLift(new Date(row.lift_date)),
            liftTime: row.lift_time,
            metricWeight: Number(row.metric_weight),
            reps: Number(row.reps),
            rawVideoURL: finalRawVideoURL,
            poseVideoURL: finalPoseVideoURL,
            thumbnailURL: finalThumbnailURL,
            analysis: {
              accuracy: Number(row.analysis?.accuracy ?? 0),
              lineGraphValues: Array.isArray(row.analysis?.lineGraphValues)
                ? row.analysis.lineGraphValues
                : [],
              barChartValues: Array.isArray(row.analysis?.barChartValues)
                ? row.analysis.barChartValues
                : [],
              feedback: signedFeedback,
            },
          } as ILiftData;
        }

        const mapped: ILiftData[] = await Promise.all(
          (data ?? []).map((row: any) => mapRowToLift(row))
        );

        // Seed per-lift caches keyed by primary key id
        mapped.forEach((lift) => {
          queryClient.setQueryData(['lift', lift.id], lift);
        });
        setLiftData(mapped);
        return mapped;
      } finally {
        setIsLoaded(true);
      }
    },
  });

  const refreshLifts = useCallback(async () => {
    // Force an immediate refetch by invalidating and then refetching (match all userId variants)
    await queryClient.invalidateQueries({ queryKey: ['lifts-by-user'] });
    await queryClient.refetchQueries({ queryKey: ['lifts-by-user'] });
  }, [queryClient]);

  const invalidateAndRefetch = useCallback(async () => {
    // Force an immediate refetch by invalidating and then refetching (match all userId variants)
    await queryClient.invalidateQueries({ queryKey: ['lifts-by-user'] });
    await queryClient.refetchQueries({ queryKey: ['lifts-by-user'] });
  }, [queryClient]);

  // Subscribe to lift deletions to invalidate per-lift query and overall list
  useEffect(() => {
    const unsubscribe = subscribeLiftDeleted((liftId: string) => {
      try {
        queryClient.removeQueries({ queryKey: ['lift', liftId], exact: true });
      } catch (_) {}
      void refreshLifts();
      setLiftData((prev) => prev.filter((l) => l.id !== liftId));
    });
    return () => {
      try {
        unsubscribe();
      } catch (_) {}
    };
  }, [queryClient, refreshLifts]);

  // Subscribe to lift ready events to refresh data
  useEffect(() => {
    const handleLiftReady = (data: { liftId: string }) => {
      // Refresh lift data to ensure we have the latest data for notification navigation
      setTimeout(() => {
        void refreshLifts();
      }, 1000); // Small delay to allow backend processing to complete
    };

    eventBus.on(AppEvents.LiftReady, handleLiftReady);
    return () => {
      eventBus.off(AppEvents.LiftReady, handleLiftReady);
    };
  }, [refreshLifts]);

  const favouriteLiftAndRefresh = useCallback(
    async (id: string) => {
      try {
        await favouriteLiftApi(id);
      } finally {
        // Fetch only this lift by id and update state
        const { data, error } = await supabase
          .from('lifts')
          .select(
            'id, is_favourite, lift_type, lift_date, lift_time, metric_weight, reps, raw_video_url, pose_video_url, thumbnail_url, analysis'
          )
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          const updated = await (async () => {
            // reuse mapping logic
            async function extractObjectKeyFromUrlInner(
              urlOrKey?: string | null
            ): Promise<string | undefined> {
              if (!urlOrKey) return undefined;
              if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
                const marker = '/storage/v1/object/';
                const idx = urlOrKey.indexOf(marker);
                if (idx === -1) return undefined;
                const after = urlOrKey.substring(idx + marker.length);
                const parts = after.split('/');
                if (parts.length < 3) return undefined;
                const bucketId = parts[1];
                if (bucketId !== 'lifts') return undefined;
                const pathWithQuery = parts.slice(2).join('/');
                const key = pathWithQuery.split('?')[0];
                return key;
              }
              return urlOrKey;
            }
            async function signPathInner(key?: string): Promise<string | undefined> {
              if (!key) return undefined;
              const { data: signed, error: signError } = await supabase.storage
                .from('lifts')
                .createSignedUrl(key, 60 * 30);
              if (signError) return undefined;
              return signed?.signedUrl;
            }
            // Use existing helpers via closures
            const thumbKey = await extractObjectKeyFromUrlInner(data.thumbnail_url);
            const rawKey = await extractObjectKeyFromUrlInner(data.raw_video_url);
            const poseKey = await extractObjectKeyFromUrlInner(data.pose_video_url);
            const [thumbnailURL, rawVideoURL, poseVideoURL] = await Promise.all([
              signPathInner(thumbKey),
              signPathInner(rawKey),
              signPathInner(poseKey),
            ]);

            // Fallback to original URLs if signing fails
            const finalThumbnailURL = thumbnailURL || data.thumbnail_url;
            const finalRawVideoURL = rawVideoURL || data.raw_video_url;
            const finalPoseVideoURL = poseVideoURL || data.pose_video_url;
            const rawFeedback: Array<{ imageURL: any; flaws: any; improvement: any }> =
              Array.isArray(data.analysis?.feedback) ? data.analysis.feedback : [];
            const signedFeedback = await Promise.all(
              rawFeedback.map(async (f) => {
                const feedbackKey = await extractObjectKeyFromUrlInner(
                  typeof f.imageURL === 'string' ? f.imageURL : undefined
                );
                const signedUrl = await signPathInner(feedbackKey);
                return { ...f, imageURL: signedUrl ?? f.imageURL };
              })
            );
            const mappedLift: ILiftData = {
              id: data.id,
              isFavourite: !!data.is_favourite,
              liftType: data.lift_type,
              liftDate: formatDateForLift(new Date(data.lift_date)),
              liftTime: data.lift_time,
              metricWeight: Number(data.metric_weight),
              reps: Number(data.reps),
              rawVideoURL: finalRawVideoURL,
              poseVideoURL: finalPoseVideoURL,
              thumbnailURL: finalThumbnailURL,
              analysis: {
                accuracy: Number(data.analysis?.accuracy ?? 0),
                lineGraphValues: Array.isArray(data.analysis?.lineGraphValues)
                  ? data.analysis.lineGraphValues
                  : [],
                barChartValues: Array.isArray(data.analysis?.barChartValues)
                  ? data.analysis.barChartValues
                  : [],
                feedback: signedFeedback,
              },
            };
            return mappedLift;
          })();
          setLiftData((prev) => prev.map((l) => (l.id === id ? updated : l)));
          queryClient.setQueryData(['lift', id], updated);
        }
      }
    },
    [queryClient, userId]
  );

  const value = useMemo(
    () => ({
      liftData,
      addLift,
      updateLift,
      removeLift,
      toggleFavourite,
      getLiftById,
      getFavouriteLifts,
      getLiftsByType,
      getLiftsByDate,
      getLiftsByDateString,
      clearAllLifts,
      upsertLift,
      formatDateForLift,
      refreshLifts,
      invalidateAndRefetch,
      favouriteLiftAndRefresh,
      isLiftDataLoaded: isLoaded,
      isTutorialReplay,
      saveLiftDataToStorage,
      restoreLiftDataFromStorage,
      clearLiftDataForTutorial,
      restoreLiftDataAfterTutorial,
      setSignedInUser,
    }),
    [
      liftData,
      addLift,
      updateLift,
      removeLift,
      toggleFavourite,
      getLiftById,
      getFavouriteLifts,
      getLiftsByType,
      getLiftsByDate,
      getLiftsByDateString,
      clearAllLifts,
      upsertLift,
      formatDateForLift,
      refreshLifts,
      invalidateAndRefetch,
      favouriteLiftAndRefresh,
      isLoaded,
      isTutorialReplay,
      saveLiftDataToStorage,
      restoreLiftDataFromStorage,
      clearLiftDataForTutorial,
      restoreLiftDataAfterTutorial,
      setSignedInUser,
    ]
  );

  // Function to clear only tutorial-seeded lifts (those with IDs starting with 'demo-')
  const clearTutorialLifts = useCallback(() => {
    setLiftData((prev) => prev.filter((lift) => !lift.id.startsWith('demo-')));
  }, []);

  // Expose clearTutorialLifts globally for tutorial completion
  React.useEffect(() => {
    global.clearTemporaryLifts = clearTutorialLifts;
    global.saveLiftDataToStorage = saveLiftDataToStorage;
    global.clearLiftDataForTutorial = clearLiftDataForTutorial;
    global.restoreLiftDataAfterTutorial = restoreLiftDataAfterTutorial;

    // Expose getLiftById function for notification navigation
    (global as any).getLiftFromContext = (id: string) => {
      const lift = getLiftById(id);
      return lift;
    };

    return () => {
      global.clearTemporaryLifts = undefined;
      global.saveLiftDataToStorage = undefined;
      global.clearLiftDataForTutorial = undefined;
      global.restoreLiftDataAfterTutorial = undefined;
      (global as any).getLiftFromContext = undefined;
    };
  }, [
    clearTutorialLifts,
    saveLiftDataToStorage,
    clearLiftDataForTutorial,
    restoreLiftDataAfterTutorial,
    getLiftById,
  ]);

  // Reset function for account deletion
  const resetContext = React.useCallback(() => {
    setLiftData([]);
    setIsLoaded(false);
  }, []);

  // Expose reset function globally for account deletion
  React.useEffect(() => {
    (global as any).resetLiftDataContext = resetContext;
    return () => {
      (global as any).resetLiftDataContext = undefined;
    };
  }, [resetContext]);

  return <LiftDataContext.Provider value={value}>{children}</LiftDataContext.Provider>;
}

export function useLiftData() {
  const context = useContext(LiftDataContext);
  if (context === undefined) {
    throw new Error('useLiftData must be used within a LiftDataProvider');
  }
  return context;
}

// Expose a helper for tutorial to inject a dummy lift quickly
declare global {
  var addDummyLift: (() => void) | undefined;
}

export function TutorialLiftSeeder() {
  const { addLift, formatDateForLift } = useLiftData();
  React.useEffect(() => {
    global.addDummyLift = () => {
      // Generate 10 lifts, one for each day starting from today going back 9 days
      for (let i = 0; i < 10; i++) {
        const today = new Date();
        const liftDate = new Date(today);
        liftDate.setDate(today.getDate() - i);

        // Use Barbell Front Squat for all tutorial lifts
        const randomMovement = 'Barbell Front Squat';

        // Random weight between 80-110 kg
        const randomWeight = Math.floor(Math.random() * (110 - 80 + 1)) + 80;

        // Random accuracy between 65-85%
        const randomAccuracy = Math.floor(Math.random() * (85 - 65 + 1)) + 65;

        // Random reps between 1-10
        const randomReps = Math.floor(Math.random() * 10) + 1;

        // Set all tutorial lifts to 23:59
        const randomTime = '11:59 PM';

        // Generate line graph values based on accuracy
        const lineGraphValues = Array.from(
          { length: randomReps },
          () => Math.floor(Math.random() * 20) + (randomAccuracy - 10) // ±10 variation around accuracy
        );

        const id = `demo-${liftDate.getTime()}-${i}`;

        addLift({
          id,
          isFavourite: Math.random() > 0.8, // 20% chance of being favourite
          liftType: randomMovement,
          liftDate: formatDateForLift(liftDate),
          liftTime: randomTime,
          metricWeight: randomWeight,
          reps: randomReps,
          rawVideoURL: require('../../assets/tutorial/formai-example-video.mp4'),
          poseVideoURL: require('../../assets/tutorial/formai-example-pose.mp4'),
          thumbnailURL: require('../../assets/tutorial/formai-example-video-thumbnail.jpg'),
          analysis: {
            accuracy: randomAccuracy,
            lineGraphValues: lineGraphValues,
            barChartValues: lineGraphValues,
            feedback: [
              {
                imageURL: require('../../assets/tutorial/formai-example-feedback.png'),
                flaws: [
                  'Right knee is caving inward compared to the left, showing knee valgus.',
                  'Right ankle angle suggests the heel may be lifting more than the left.',
                  'Torso is leaning forward excessively, which stresses the lower back.',
                  'Barbell path is slightly forward of mid-foot, reducing lifting efficiency.',
                  'Hip angle indicates possible butt wink or pelvic tuck at the bottom.',
                ],
                improvement: [
                  "Actively push knees out and think 'spread the floor' with your feet to prevent valgus.",
                  'Improve ankle dorsiflexion with stretches and banded mobilizations to keep heels grounded.',
                  'Brace your core harder using the Valsalva maneuver to maintain an upright torso.',
                  'Keep the bar over mid-foot and adjust grip width to tighten the upper back.',
                  'Strengthen glutes and hamstrings with RDLs, hip thrusts, and pause squats to control hip position.',
                  'Consider weightlifting shoes with a heel lift if ankle mobility limits squat depth.',
                ],
              },
            ],
          },
        });
      }
    };
    return () => {
      if (global.addDummyLift) delete global.addDummyLift;
    };
  }, [addLift, formatDateForLift]);
  return null;
}

// Export URL signing functions for use in other contexts
export async function extractObjectKeyFromUrl(
  urlOrKey?: string | null
): Promise<string | undefined> {
  if (!urlOrKey) return undefined;
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    // Expect formats like /storage/v1/object/public/lifts/<key>
    const marker = '/storage/v1/object/';
    const idx = urlOrKey.indexOf(marker);
    if (idx === -1) return undefined;
    const after = urlOrKey.substring(idx + marker.length); // e.g. 'public/lifts/uid/path...'
    const parts = after.split('/');
    // parts[0] is 'public' or 'sign', parts[1] should be bucket id
    if (parts.length < 3) return undefined;
    const bucketId = parts[1];
    if (bucketId !== 'lifts') return undefined;
    const pathWithQuery = parts.slice(2).join('/');
    const key = pathWithQuery.split('?')[0];
    return key;
  }
  // Already a key
  return urlOrKey;
}

export async function signPath(key?: string): Promise<string | undefined> {
  if (!key) return undefined;
  const { data: signed, error: signError } = await supabase.storage
    .from('lifts')
    .createSignedUrl(key, 60 * 30); // 30 minutes
  if (signError) {
    return undefined;
  }
  return signed?.signedUrl;
}
