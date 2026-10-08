import { AdPlatformConnector, DateRange, AdAccount, RawCampaign, RawAdSet, RawMetric } from "./types";

export class GoogleAdsConnector implements AdPlatformConnector {
  platformId = "google_ads";

  async connect(oauthCode: string) {
    // Stub: Exchange oauthCode for Google Ads refresh token
    return {
      accessToken: "stub_google_access_token",
      refreshToken: "stub_google_refresh_token",
      expiresAt: new Date(Date.now() + 3600 * 1000)
    };
  }

  async refreshToken(oldToken: string) {
    return {
      accessToken: "stub_google_new_access_token",
      expiresAt: new Date(Date.now() + 3600 * 1000)
    };
  }

  async fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
    // Stub: List accessible Google Ads Customer IDs
    return [{ id: "google_cust_123", name: "Google Ads Account 1" }];
  }

  async fetchCampaigns(accessToken: string, adAccountId: string): Promise<RawCampaign[]> {
    return [];
  }

  async fetchAdSets(accessToken: string, adAccountId: string): Promise<RawAdSet[]> {
    // In Google Ads, these are AdGroups
    return [];
  }

  async fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange): Promise<RawMetric[]> {
    return [];
  }

  async disconnect(connectionId: string) {
    // Stub
  }
}
