export interface OutboundProvider {
  testConnection(config: IntegrationConfig): Promise<string | null>;
  executeAction(
    actionKey: string,
    input: Record<string, unknown>,
    config: IntegrationConfig,
  ): Promise<string>;
}

export type IntegrationConfig = {
  accessToken?: string;
  webhookSecret?: string;
  additionalConfig?: Record<string, string>;
};
