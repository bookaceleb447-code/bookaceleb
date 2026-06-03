import { Firestore, doc, updateDoc, setDoc } from 'firebase/firestore';

/**
 * Checks if a celebrity's AI Premium subscription has expired (validity of 35 days).
 * If the current time is past the expiry date, automatically downgrades the subscription back to the free plan.
 * Returns true if a downgrade occurred, otherwise false.
 */
export async function checkAndExpireAiPremium(
  db: Firestore,
  userId: string,
  data: any
): Promise<boolean> {
  if (!userId || !data) return false;

  const isPremium = data.isAiSubscribed === true || data.aiPremium === true;
  if (!isPremium) return false;

  const nowMs = Date.now();
  let shouldDowngrade = false;

  const thirtyFiveDaysMs = 35 * 24 * 60 * 60 * 1000;

  if (data.aiPremiumExpiresAt) {
    if (nowMs >= data.aiPremiumExpiresAt) {
      shouldDowngrade = true;
    }
  } else if (data.aiPremiumActivatedAt) {
    if (nowMs >= data.aiPremiumActivatedAt + thirtyFiveDaysMs) {
      shouldDowngrade = true;
    }
  } else {
    // If premium is active but activate/expires timestamps are completely missing,
    // we backfill them to start today, which is extremely robust.
    try {
      console.log(`[PremiumCheck] Backfilling activation date for user: ${userId}`);
      await updateDoc(doc(db, 'celebrityProfiles', userId), {
        aiPremiumActivatedAt: nowMs,
        aiPremiumExpiresAt: nowMs + thirtyFiveDaysMs
      });
      try {
        await updateDoc(doc(db, 'users', userId), {
          aiPremiumActivatedAt: nowMs,
          aiPremiumExpiresAt: nowMs + thirtyFiveDaysMs
        });
      } catch (_) {}
      try {
        await setDoc(doc(db, 'aiUsage', userId), {
          aiPremiumActivatedAt: nowMs,
          aiPremiumExpiresAt: nowMs + thirtyFiveDaysMs
        }, { merge: true });
      } catch (_) {}
    } catch (err) {
      console.error('[PremiumCheck] Error backfilling timestamps:', err);
    }
  }

  if (shouldDowngrade) {
    console.log(`[PremiumCheck] AI Premium Plan has expired for user ${userId}. Reverting to standard Free Plan.`);
    try {
      // 1. Revert celebrityProfiles
      await updateDoc(doc(db, 'celebrityProfiles', userId), {
        isAiSubscribed: false,
        aiPremium: false,
        aiPremiumActivatedAt: null,
        aiPremiumExpiresAt: null
      });

      // 2. Revert users
      try {
        await updateDoc(doc(db, 'users', userId), {
          isAiSubscribed: false,
          aiPremium: false,
          aiPremiumActivatedAt: null,
          aiPremiumExpiresAt: null
        });
      } catch (err) {
        console.warn(`[PremiumCheck] Could not sync 'users' downgrade for ${userId}:`, err);
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
          aiPremiumExpiresAt: null
        }, { merge: true });
      } catch (err) {
        console.warn(`[PremiumCheck] Could not sync 'aiUsage' downgrade for ${userId}:`, err);
      }

      return true;
    } catch (err) {
      console.error(`[PremiumCheck] Failed to execute downgrade task for ${userId}:`, err);
    }
  }

  return false;
}
