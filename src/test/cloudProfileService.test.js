import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), upsert: vi.fn(), select: vi.fn(), single: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  default: { from: mocks.from },
  isSupabaseConfigured: true,
}));

import { saveCloudProfile } from '../services/cloudProfileService';

describe('cloud profile adapter idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.upsert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({ data: { id: 'row:one', user_id: 'user:one' }, error: null });
  });

  test('retries through the user_id upsert conflict key instead of inserting duplicates', async () => {
    const profile = { schemaVersion: 'profile.v2', profileId: 'profile:one' };

    await saveCloudProfile('user:one', profile);
    await saveCloudProfile('user:one', profile);

    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(mocks.from).toHaveBeenCalledWith('user_progress');
    for (const [payload, options] of mocks.upsert.mock.calls) {
      expect(payload).toMatchObject({ user_id: 'user:one', profile_data: profile });
      expect(options).toEqual({ onConflict: 'user_id' });
    }
  });
});
