import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimManager } from '@/lib/claims/claim-manager';
import { User } from '@/types';

describe('Transactional Idea Claiming & Race Condition Prevention', () => {
  const personA: User = {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'person.a@trendpost.local',
    name: 'Person A',
    role: 'admin',
    telegram_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const personB: User = {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'person.b@trendpost.local',
    name: 'Person B',
    role: 'member',
    telegram_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    ClaimManager.resetForTesting();
  });

  it('allows Person A to claim an unclaimed idea', async () => {
    const ideaId = 'idea-test-101';
    const result = await ClaimManager.claimIdea(ideaId, personA);

    expect(result.success).toBe(true);
    expect(result.claim?.user_id).toBe(personA.id);

    const activeClaim = ClaimManager.getActiveClaim(ideaId);
    expect(activeClaim?.user_id).toBe(personA.id);
  });

  it('atomically blocks Person B from claiming an idea already held by Person A', async () => {
    const ideaId = 'idea-test-102';
    // Person A claims first
    await ClaimManager.claimIdea(ideaId, personA);

    // Person B attempts to claim the same idea
    const resultB = await ClaimManager.claimIdea(ideaId, personB);

    expect(resultB.success).toBe(false);
    expect(resultB.alreadyClaimedByOther).toBe(true);
    expect(resultB.claimerName).toBe('Person A');
    expect(resultB.message).toContain('already claimed');
  });

  it('handles concurrent race condition where Person A and Person B claim simultaneously', async () => {
    const ideaId = 'idea-race-condition-999';

    // Fire both claims concurrently
    const [claimA, claimB] = await Promise.all([
      ClaimManager.claimIdea(ideaId, personA),
      ClaimManager.claimIdea(ideaId, personB),
    ]);

    // Exactly one must succeed, and exactly one must fail
    const successes = [claimA.success, claimB.success].filter(Boolean);
    const conflicts = [claimA.alreadyClaimedByOther, claimB.alreadyClaimedByOther].filter(Boolean);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    // The active claim in the store must belong to the winner
    const activeClaim = ClaimManager.getActiveClaim(ideaId);
    expect(activeClaim).toBeDefined();
    expect([personA.id, personB.id]).toContain(activeClaim?.user_id);
  });

  it('allows claiming after the previous claim is released', async () => {
    const ideaId = 'idea-test-103';

    // Person A claims
    await ClaimManager.claimIdea(ideaId, personA);

    // Person A releases claim
    const releaseRes = await ClaimManager.releaseClaim(ideaId, personA.id);
    expect(releaseRes.success).toBe(true);

    // Person B should now be able to claim successfully
    const claimB = await ClaimManager.claimIdea(ideaId, personB);
    expect(claimB.success).toBe(true);
    expect(claimB.claim?.user_id).toBe(personB.id);
  });

  it('prevents Person B from releasing Person A claim', async () => {
    const ideaId = 'idea-test-104';
    await ClaimManager.claimIdea(ideaId, personA);

    const badRelease = await ClaimManager.releaseClaim(ideaId, personB.id);
    expect(badRelease.success).toBe(false);
    expect(badRelease.message).toContain('cannot release');
  });
});
