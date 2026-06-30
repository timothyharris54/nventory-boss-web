import { apiFetch } from '../../lib/api/client';
import type {
  CreateEcommerceConnectionRequest,
  EcommerceConnection,
  EcommerceConnectionTestResponse,
  UpdateEcommerceConnectionRequest,
} from './ecommerce-connection-types';

const ecommerceConnectionsPath = '/ecommerce/connections';

export function getEcommerceConnections(): Promise<EcommerceConnection[]> {
  return apiFetch<EcommerceConnection[]>(ecommerceConnectionsPath);
}

export function createEcommerceConnection(
  body: CreateEcommerceConnectionRequest,
): Promise<EcommerceConnection> {
  return apiFetch<EcommerceConnection>(ecommerceConnectionsPath, {
    method: 'POST',
    body,
  });
}

export function updateEcommerceConnection(
  connectionId: string,
  body: UpdateEcommerceConnectionRequest,
): Promise<EcommerceConnection> {
  return apiFetch<EcommerceConnection>(
    `${ecommerceConnectionsPath}/${connectionId}`,
    {
      method: 'PATCH',
      body,
    },
  );
}

export function testWoocommerceConnection(): Promise<EcommerceConnectionTestResponse> {
  return apiFetch<EcommerceConnectionTestResponse>(
    '/ecommerce/woocommerce/test-connection',
    {
      method: 'POST',
    },
  );
}
