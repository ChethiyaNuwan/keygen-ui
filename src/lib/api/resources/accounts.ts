import { KeygenClient } from '../client';
import { Account, User, KeygenResponse } from '../../types/keygen';

export class AccountResource {
  constructor(private client: KeygenClient) {}

  /**
   * This deployment's own account record.
   *
   * accounts_controller.rb resolves the account via the authenticated token
   * (`current_account`), not the :account_id URL segment — but that segment
   * still has to be the real, matching UUID. Verified live against the
   * deployed instance: a placeholder ("self") or a mismatched-but-valid UUID
   * both 404 — there is no singleplayer shortcut. Every user response
   * includes the account relationship (user_serializer.rb), so this reads
   * the id off /me first.
   */
  async get(): Promise<KeygenResponse<Account>> {
    const me = await this.client.request<User>('/me');
    const accountRel = me.data?.relationships?.account?.data;
    const accountId = accountRel && !Array.isArray(accountRel) ? accountRel.id : undefined;

    if (!accountId) {
      throw new Error('Could not resolve the current account ID from /me');
    }

    return this.client.request<Account>(`/accounts/${accountId}`);
  }
}
