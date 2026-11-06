import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(), insert: vi.fn(), update: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  default: { from: mocks.from },
  isSupabaseConfigured: true,
}));

import { getCloudProfile, saveCloudProfile } from '../services/cloudProfileService';

describe('cloud profile adapter idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert, update: mocks.update, select: mocks.select });
    mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.updateEq.mockReturnValue({ eq: mocks.updateEq, select: () => ({ maybeSingle: mocks.maybeSingle }) });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.single.mockResolvedValue({ data: { id: 'row:one', user_id: 'user:one', cloud_revision: 1 }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  test('creates a cloud profile at revision one when there is no base row', async () => {
    const profile = { schemaVersion: 'profile.v2', profileId: 'profile:one' };

    await saveCloudProfile('user:one', profile);

    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith('user_progress');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user:one', profile_data: profile, cloud_revision: 1 }));
  });

  test('updates only when the cloud base revision still matches', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'row:one', user_id: 'user:one', cloud_revision: 4 }, error: null });
    const profile = { schemaVersion: 'profile.v2', profileId: 'profile:one' };

    await saveCloudProfile('user:one', profile, 3);

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ profile_data: profile, cloud_revision: 4 }));
    expect(mocks.updateEq).toHaveBeenNthCalledWith(1, 'user_id', 'user:one');
    expect(mocks.updateEq).toHaveBeenNthCalledWith(2, 'cloud_revision', 3);
  });

  test('returns null when compare-and-swap finds a newer cloud revision', async () => {
    const profile = { schemaVersion: 'profile.v2', profileId: 'profile:one' };

    await expect(saveCloudProfile('user:one', profile, 3)).resolves.toBeNull();
  });

  test('returns null only when the cloud profile row is absent', async () => {
    await expect(getCloudProfile('user:one')).resolves.toBeNull();
  });

  test('propagates cloud read errors so sync cannot treat them as a missing row', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: new Error('network unavailable') });

    await expect(getCloudProfile('user:one')).rejects.toThrow('network unavailable');
  });
});
