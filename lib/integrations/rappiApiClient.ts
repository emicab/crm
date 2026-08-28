export interface RappiConfig {
  apiKey: string;
  storeId: string;
}

/**
 * Cliente de integración para Rappi Integrations API
 */
export class RappiApiClient {
  private config: RappiConfig;
  private baseUrl = "https://microservices.rappi.com/api/v2/restaurants-integrations";

  constructor(config: RappiConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    return {
      "x-api-key": this.config.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Aceptar orden en Rappi con tiempo estimado de preparación
   */
  async acceptOrder(orderId: string, prepTimeMinutes: number = 20) {
    const url = `${this.baseUrl}/orders/${orderId}/accept`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ cooking_time: prepTimeMinutes }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Error al aceptar pedido en Rappi (${response.status}): ${err.message || response.statusText}`);
    }

    return response.json().catch(() => ({ success: true }));
  }

  /**
   * Rechazar orden en Rappi con motivo
   */
  async rejectOrder(orderId: string, reason: string = "STORE_BUSY") {
    const url = `${this.baseUrl}/orders/${orderId}/reject`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Error al rechazar pedido en Rappi (${response.status}): ${err.message || response.statusText}`);
    }

    return response.json().catch(() => ({ success: true }));
  }

  /**
   * Cambiar estado de la tienda en Rappi (Abierto, Ocupado, Cerrado)
   */
  async updateStoreStatus(status: "OPEN" | "BUSY" | "CLOSED") {
    const url = `${this.baseUrl}/stores/${this.config.storeId}/status`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        is_open: status !== "CLOSED",
        is_busy: status === "BUSY",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Error al cambiar estado de tienda en Rappi (${response.status}): ${err.message || response.statusText}`);
    }

    return response.json().catch(() => ({ success: true, status }));
  }
}
