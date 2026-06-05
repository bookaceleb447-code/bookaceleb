import { Firestore, doc, updateDoc, setDoc } from 'firebase/firestore';

/**
 * Checks if a celebrity's AI Premium subscription has expired.
 * If the current time is past the expiry date, automatically downgrades the subscription back to the free plan.
 * Returns true if a downgrade occurred, otherwise false.
 */
export async function checkAndExpireAiPremium(
  db: any,
  userId: string,
  data: any
): Promise<boolean> {
  if (!userId || !data) return false;

  const isPremium = data.isAiSubscribed === true || data.aiPremium === true;
  if (!isPremium) return false;

  const nowMs = Date.now();
  let shouldDowngrade = false;

  if (data.aiPremiumExpiryDate) {
    const expiryMs = new Date(data.aiPremiumExpiryDate).getTime();
    if (!isNaN(expiryMs) && nowMs >= expiryMs) {
      shouldDowngrade = true;
    }
  } else if (data.aiPremiumExpiresAt) {
    if (nowMs >= data.aiPremiumExpiresAt) {
      shouldDowngrade = true;
    }
  } else if (data.aiPremiumActivatedAt) {
    // If we only have activated timestamp, fallback to 31 days monthly limit check
    const durationDays = data.aiPremiumPlan === 'yearly' ? 365 : 31;
    if (nowMs >= data.aiPremiumActivatedAt + (durationDays * 24 * 60 * 60 * 1000)) {
      shouldDowngrade = true;
    }
  } else {
    // If premium is active but activate/expires timestamps are completely missing,
    // we backfill them to start today (monthly), which is extremely robust.
    try {
      console.log(`[PremiumCheck] Backfilling AI activation date for user: ${userId}`);
      const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000;
      await updateDoc(doc(db, 'celebrityProfiles', userId), {
        aiPremiumActivatedAt: nowMs,
        aiPremiumExpiresAt: nowMs + thirtyOneDaysMs,
        aiPremiumExpiryDate: new Date(nowMs + thirtyOneDaysMs).toISOString()
      });
      try {
        await updateDoc(doc(db, 'users', userId), {
          aiPremiumActivatedAt: nowMs,
          aiPremiumExpiresAt: nowMs + thirtyOneDaysMs,
          aiPremiumExpiryDate: new Date(nowMs + thirtyOneDaysMs).toISOString()
        });
      } catch (_) {}
      try {
        await setDoc(doc(db, 'aiUsage', userId), {
          aiPremiumActivatedAt: nowMs,
          aiPremiumExpiresAt: nowMs + thirtyOneDaysMs,
          aiPremiumExpiryDate: new Date(nowMs + thirtyOneDaysMs).toISOString()
        }, { merge: true });
      } catch (_) {}
    } catch (err) {
      console.error('[PremiumCheck] Error backfilling AI timestamps:', err);
    }
  }

  if (shouldDowngrade) {
    console.log(`[PremiumCheck] AI Premium Plan has expired for user ${userId}. Reverting to standard Free Plan.`);
    try {
      // 1. Revert celebrityProfiles
      await updateDoc(doc(db, 'celebrityProfiles', userId), {
        isAiSubscribed: false,
        aiPremium: false,
        aiPremiumPlan: 'free',
        aiPremiumActivatedAt: null,
        aiPremiumExpiresAt: null,
        aiPremiumExpiryDate: null
      });

      // 2. Revert users
      try {
        await updateDoc(doc(db, 'users', userId), {
          isAiSubscribed: false,
          aiPremium: false,
          aiPremiumPlan: 'free',
          aiPremiumActivatedAt: null,
          aiPremiumExpiresAt: null,
          aiPremiumExpiryDate: null
        });
      } catch (err) {
        console.warn(`[PremiumCheck] Could not sync 'users' AI downgrade for ${userId}:`, err);
      }

      // 3. Revert aiUsage
      try {
        await setDoc(doc(db, 'aiUsage', userId), {
          planType: 'free',
          dailyLimit: 5,
          maxDailyRequests: 5,
          aiPremium: false,
          remainingRequests: 5,
          aiPremiumActivatedAt: null,
          aiPremiumExpiresAt: null,
          aiPremiumPlan: 'free',
          aiPremiumExpiryDate: null
        }, { merge: true });
      } catch (err) {
        console.warn(`[PremiumCheck] Could not sync 'aiUsage' AI downgrade for ${userId}:`, err);
      }

      return true;
    } catch (err) {
      console.error(`[PremiumCheck] Failed to execute AI downgrade task for ${userId}:`, err);
    }
  }

  return false;
}

/**
 * Checks if a celebrity's premium / verified activation status has expired.
 * If the current time is past the expiry date, automatically locks and reverts the account to Free.
 * Returns true if a downgrade occurred, otherwise false.
 */
export async function checkAndExpireCelebrity(
  db: any,
  userId: string,
  data: any
): Promise<boolean> {
  if (!userId || !data) return false;

  const isPremium = data.celebrityPremium === true || data.verifiedCelebrity === true || data.premiumCelebrity === true;
  if (!isPremium) return false;

  const nowMs = Date.now();
  let shouldDowngrade = false;

  if (data.celebrityExpiryDate) {
    const expiryMs = new Date(data.celebrityExpiryDate).getTime();
    if (!isNaN(expiryMs) && nowMs >= expiryMs) {
      shouldDowngrade = true;
    }
  } else if (data.upgradeDate) {
    // Fallback if no expiry timestamp is recorded, check standard Monthly (31 days) or Yearly default
    const isYearly = data.celebrityPlan === 'yearly';
    const durationDays = isYearly ? 365 : 31;
    const baseMs = new Date(data.upgradeDate).getTime();
    if (!isNaN(baseMs) && nowMs >= baseMs + (durationDays * 24 * 60 * 60 * 1000)) {
      shouldDowngrade = true;
    }
  }

  if (shouldDowngrade) {
    console.log(`[PremiumCheck] Celebrity core upgrade plan has expired for user ${userId}. Reverting to custom Free Plan.`);
    try {
      // 1. Revert celebrityProfiles
      await updateDoc(doc(db, 'celebrityProfiles', userId), {
        celebrityPremium: false,
        verifiedCelebrity: false,
        premiumCelebrity: false,
        isLocked: true,
        celebrityPlan: 'free',
        celebrityExpiryDate: null
      });

      // 2. Revert users
      try {
        await updateDoc(doc(db, 'users', userId), {
          celebrityPremium: false,
          verifiedCelebrity: false,
          premiumCelebrity: false,
          isLocked: true,
          celebrityPlan: 'free',
          celebrityExpiryDate: null
        });
      } catch (err) {
        console.warn(`[PremiumCheck] Could not sync 'users' celebrity downgrade for ${userId}:`, err);
      }

      return true;
    } catch (err) {
      console.error(`[PremiumCheck] Failed to execute celebrity core downgrade for ${userId}:`, err);
    }
  }

  return false;
}

/**
 * Runs a unified background check on the provided user profile details.
 */
export async function checkAllUserPremiums(
  db: any,
  userId: string,
  data: any
): Promise<{ celebrityDowngraded: boolean; aiDowngraded: boolean }> {
  const celebrityDowngraded = await checkAndExpireCelebrity(db, userId, data);
  const aiDowngraded = await checkAndExpireAiPremium(db, userId, data);
  return { celebrityDowngraded, aiDowngraded };
}
