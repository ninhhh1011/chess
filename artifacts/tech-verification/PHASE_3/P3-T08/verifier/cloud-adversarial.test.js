import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), upsert: vi.fn(), select: vi.fn(), single: vi.fn(), insert: vi.fn(),
}));
vi.mock('../../../../../src/lib/supabaseClient', () => ({
  default: { from: mocks.from },
  isSupabaseConfigured: true,
}));

import { saveCloudProfile } from '../../../../../src/services/cloudProfileService';

describe('P3-T08 independent cloud upsert audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upsert: mocks.upsert, insert: mocks.insert });
    mocks.upsert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.single.mockResolvedValue({ data: { id: 'row:one', user_id: 'user:one' }, error: null });
  });

  test('retries the same profile only through user_progress upsert on user_id', async () => {
    const profile = { schemaVersion: 'profile.v2', profileId: 'profile:one', revision: 4 };
    await expect(saveCloudProfile('user:one', profile)).resolves.toMatchObject({ user_id: 'user:one' });
    await expect(saveCloudProfile('user:one', profile)).resolves.toMatchObject({ user_id: 'user:one' });

    expect(mocks.from.mock.calls).toEqual([['user_progress'], ['user_progress']]);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    for (const [payload, options] of mocks.upsert.mock.calls) {
      expect(payload).toMatchObject({ user_id: 'user:one', profile_data: profile });
      expect(payload.updated_at).toBe(new Date(payload.updated_at).toISOString());
      expect(options).toEqual({ onConflict: 'user_id' });
    }
  });

  test('returns no false success on database error or thrown transport failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.single.mockResolvedValueOnce({ data: null, error: { message: 'row denied' } });
    await expect(saveCloudProfile('user:one', { revision: 1 })).resolves.toBeNull();
    mocks.upsert.mockImplementationOnce(() => { throw new TypeError('fetch failed'); });
    await expect(saveCloudProfile('user:one', { revision: 2 })).resolves.toBeNull();
  });
});
