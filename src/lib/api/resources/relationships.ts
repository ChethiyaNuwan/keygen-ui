import { KeygenClient } from '../client';
import { KeygenResponse } from '@/lib/types/keygen';

/**
 * Group membership is written on the member, not the group — Keygen exposes
 * no attach endpoint under /groups/:id/users or /groups/:id/licenses (only
 * index/show). A member joins or leaves a group via `PUT :resource/:id/group`
 * with `{ data: { type: 'groups', id } }` to join, `{ data: null }` to leave.
 *
 * Shared by UserResource.changeGroup, LicenseResource.changeGroup, and
 * GroupResource.addUser/removeUser/addLicense/removeLicense so the verb and
 * body shape live in exactly one place.
 */
export async function setGroup<T = unknown>(
  client: KeygenClient,
  resourcePath: string,
  groupId: string | null
): Promise<KeygenResponse<T>> {
  return client.request<T>(`${resourcePath}/group`, {
    method: 'PUT',
    body: { data: groupId ? { type: 'groups', id: groupId } : null },
  });
}
