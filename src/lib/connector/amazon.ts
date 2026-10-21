import { AdPlatformConnector, DateRange, AdAccount, RawCampaign, RawAdSet, RawMetric } from "./types";

export class AmazonAdsConnector implements AdPlatformConnector {
  platformId = "amazon_ads";
  private clientId = (process.env.AMAZON_CLIENT_ID || "").replace(/['"]/g, "").trim();
  private clientSecret = (process.env.AMAZON_CLIENT_SECRET || "").replace(/['"]/g, "").trim();
  private redirectUri: string;

  constructor(customRedirectUri?: string) {
    const envUri = (process.env.AMAZON_REDIRECT_URI || "").trim();
    if (customRedirectUri && !customRedirectUri.includes("localhost")) {
      this.redirectUri = customRedirectUri;
    } else if (envUri && !envUri.includes("localhost")) {
      this.redirectUri = envUri;
    } else {
      this.redirectUri = customRedirectUri || envUri || "https://halte-ad-intelligence.vercel.app/api/auth/amazon/callback";
    }
  }

  getAuthUrl(state: string) {
    return `https://apac.account.amazon.com/ap/oa?client_id=${this.clientId}&scope=advertising::campaign_management&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}`;
  }

  async connect(oauthCode: string) {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: oauthCode,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri
    });

    const res = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString()
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Amazon Token Error:", txt);
      throw new Error("Failed to get Amazon access token");
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000))
    };
  }

  async refreshToken(oldToken: string) {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: oldToken,
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    const res = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString()
    });

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000))
    };
  }

  async fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
    // Amazon calls these "Profiles"
    const endpoints = [
      "https://advertising-api-fe.amazon.com/v2/profiles",
      "https://advertising-api-eu.amazon.com/v2/profiles",
      "https://advertising-api.amazon.com/v2/profiles"
    ];

    let allProfiles: any[] = [];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Amazon-Advertising-API-ClientId": this.clientId
          }
        });
        if (res.ok) {
          const profiles = await res.json();
          if (Array.isArray(profiles)) {
            allProfiles.push(...profiles);
          }
        }
      } catch (err) {
        console.warn("Failed fetching profiles from " + url, err);
      }
    }

    // Deduplicate profiles by profileId
    const seen = new Set();
    const unique = allProfiles.filter(p => {
      if (seen.has(p.profileId)) return false;
      seen.add(p.profileId);
      return true;
    });

    return unique.map((p: any) => ({
      id: p.profileId.toString(),
      name: p.accountInfo?.name || `Amazon Profile ${p.profileId}`,
      metadata: { countryCode: p.countryCode, timezone: p.timezone }
    }));
  }

  async fetchCampaigns(accessToken: string, adAccountId: string): Promise<RawCampaign[]> {
    return [];
  }

  async fetchAdSets(accessToken: string, adAccountId: string): Promise<RawAdSet[]> {
    return [];
  }

  async fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange): Promise<RawMetric[]> {
    return [];
  }

  async disconnect(connectionId: string) {}
}
