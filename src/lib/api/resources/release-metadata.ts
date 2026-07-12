import { KeygenClient } from '../client';
import {
  ReleasePlatform,
  ReleaseArch,
  ReleaseChannelRecord,
  ReleaseEngine,
  KeygenListResponse,
} from '../../types/keygen';

/**
 * The platforms, architectures, channels and engines the account's releases
 * actually use.
 *
 * Keygen derives these from the artifacts that have been uploaded, so they are
 * the honest list to filter or populate dropdowns with — better than a
 * hardcoded guess that drifts from what is really published.
 */
export class ReleaseMetadataResource {
  constructor(private client: KeygenClient) {}

  private listOf<T>(path: string, productId?: string): Promise<KeygenListResponse<T>> {
    const endpoint = productId ? `products/${productId}/${path}` : path;
    return this.client.request<T[]>(endpoint);
  }

  /** e.g. windows, darwin, linux */
  async platforms(productId?: string): Promise<KeygenListResponse<ReleasePlatform>> {
    return this.listOf<ReleasePlatform>('platforms', productId);
  }

  /** e.g. x86_64, arm64 */
  async arches(productId?: string): Promise<KeygenListResponse<ReleaseArch>> {
    return this.listOf<ReleaseArch>('arches', productId);
  }

  /** e.g. stable, rc, beta */
  async channels(productId?: string): Promise<KeygenListResponse<ReleaseChannelRecord>> {
    return this.listOf<ReleaseChannelRecord>('channels', productId);
  }

  /** package engines, e.g. rubygems, npm, oci */
  async engines(productId?: string): Promise<KeygenListResponse<ReleaseEngine>> {
    return this.listOf<ReleaseEngine>('engines', productId);
  }
}
