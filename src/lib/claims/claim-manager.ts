import { IdeaClaim, User } from '@/types';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

// In-memory atomic store used for deterministic testing & offline local fallback
const globalForClaims = globalThis as unknown as { __trendpost_claims__?: Map<string, IdeaClaim> };
const inMemoryClaims = globalForClaims.__trendpost_claims__ ?? new Map<string, IdeaClaim>();
globalForClaims.__trendpost_claims__ = inMemoryClaims;

export interface ClaimResult {
  success: boolean;
  message: string;
  claim?: IdeaClaim;
  alreadyClaimedByOther?: boolean;
  claimerName?: string;
}

export class ClaimManager {
  /**
   * Atomically claims an idea for a user.
   * Guarantees that two concurrent requests for the same idea will never both succeed.
   */
  static async claimIdea(ideaId: string, user: Pick<User, 'id' | 'name' | 'email' | 'role'>): Promise<ClaimResult> {
    const runId = `claim-${Date.now()}`;

    logger.info({
      service: 'claim',
      event: 'CLAIM_REQUEST',
      message: `User ${user.name} (${user.id}) attempting to claim idea ${ideaId}`,
      metadata: { ideaId, userId: user.id },
      runId,
    });

    // Check active claim
    const existing = inMemoryClaims.get(ideaId);
    if (existing && !existing.released_at) {
      if (existing.user_id === user.id) {
        return {
          success: true,
          message: 'You already hold an active claim on this idea.',
          claim: existing,
        };
      }

      logger.warn({
        service: 'claim',
        event: 'CLAIM_CONFLICT',
        message: `Claim conflict: Idea ${ideaId} already claimed by ${existing.user?.name || existing.user_id}`,
        metadata: { ideaId, requestedBy: user.id, heldBy: existing.user_id },
        runId,
      });

      return {
        success: false,
        alreadyClaimedByOther: true,
        claimerName: existing.user?.name || 'Another user',
        message: `This idea was already claimed by ${existing.user?.name || 'another team member'}.`,
        claim: existing,
      };
    }

    // Atomically create new claim
    const newClaim: IdeaClaim = {
      id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      idea_id: ideaId,
      user_id: user.id,
      claimed_at: nowUTC(),
      released_at: null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    inMemoryClaims.set(ideaId, newClaim);

    logger.info({
      service: 'claim',
      event: 'CLAIM_GRANTED',
      message: `Idea ${ideaId} successfully claimed by ${user.name}`,
      metadata: { claimId: newClaim.id, ideaId, userId: user.id },
      runId,
    });

    return {
      success: true,
      message: 'Idea claimed successfully!',
      claim: newClaim,
    };
  }

  /**
   * Releases an active claim
   */
  static async releaseClaim(ideaId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const existing = inMemoryClaims.get(ideaId);
    if (!existing || existing.released_at) {
      return { success: false, message: 'No active claim exists for this idea.' };
    }

    if (existing.user_id !== userId) {
      return { success: false, message: 'You cannot release an idea claimed by someone else.' };
    }

    existing.released_at = nowUTC();
    inMemoryClaims.delete(ideaId);

    logger.info({
      service: 'claim',
      event: 'CLAIM_RELEASED',
      message: `Idea ${ideaId} released by user ${userId}`,
      metadata: { ideaId, userId },
    });

    return { success: true, message: 'Idea claim released successfully.' };
  }

  /**
   * Gets the active claim for an idea if any exists
   */
  static getActiveClaim(ideaId: string): IdeaClaim | null {
    const claim = inMemoryClaims.get(ideaId);
    if (claim && !claim.released_at) {
      return claim;
    }
    return null;
  }

  /**
   * Clears all in-memory claims (useful for tests)
   */
  static resetForTesting() {
    inMemoryClaims.clear();
  }
}
