import { AdPlatformConnector, DateRange, AdAccount, RawCampaign, RawAdSet, RawMetric } from "./types";

export class AmazonAdsConnector implements AdPlatformConnector {
  platformId = "amazon_ads";

  async connect(oauthCode: string) {
    // Stub: Exchange oauthCode for Amazon Ads refresh token
    return {
      accessToken: "stub_amazon_access_token",
      refreshToken: "stub_amazon_refresh_token",
      expiresAt: new Date(Date.now() + 3600 * 1000)
    };
  }

  async refreshToken(oldToken: string) {
    return {
      accessToken: "stub_amazon_new_access_token",
      expiresAt: new Date(Date.now() + 3600 * 1000)
    };
  }

  async fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
    // Stub: List Amazon Profiles
    return [{ id: "amazon_profile_123", name: "Amazon Ads Profile 1" }];
  }

  async fetchCampaigns(accessToken: string, adAccountId: string): Promise<RawCampaign[]> {
    return [];
  }

  async fetchAdSets(accessToken: string, adAccountId: string): Promise<RawAdSet[]> {
    // In Amazon Ads, these are Ad Groups
    return [];
  }

  async fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange): Promise<RawMetric[]> {
    // Note: Amazon Ads API handles reporting asynchronously.
    // 1. Request report generation
    // 2. Poll for completion
    // 3. Download and parse gzip file
    // For this stub, we return an empty array. The actual worker for Amazon will need
    // to handle this async flow via a BullMQ state machine (e.g. queue a "check-report" job).
    return [];
  }

  async disconnect(connectionId: string) {
    // Stub
  }
}
