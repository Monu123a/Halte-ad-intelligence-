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

  private getBaseUrl(countryCode?: string): string {
    if (countryCode && ["UK", "GB", "DE", "FR", "IT", "ES", "NL", "AE", "SA", "SE", "PL", "EG", "TR"].includes(countryCode.toUpperCase())) {
      return "https://advertising-api-eu.amazon.com";
    }
    if (countryCode && ["US", "CA", "MX", "BR"].includes(countryCode.toUpperCase())) {
      return "https://advertising-api.amazon.com";
    }
    // Default to APAC / Far East (India IN, JP, AU, SG)
    return "https://advertising-api-fe.amazon.com";
  }

  async fetchCampaigns(accessToken: string, adAccountId: string, metadata?: any): Promise<RawCampaign[]> {
    const baseUrl = this.getBaseUrl(metadata?.countryCode);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Amazon-Advertising-API-ClientId": this.clientId,
      "Amazon-Advertising-API-Scope": adAccountId,
      "Content-Type": "application/json"
    };

    const campaigns: RawCampaign[] = [];

    // 1. Sponsored Products (SP)
    try {
      const res = await fetch(`${baseUrl}/v2/sp/campaigns`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const c of data) {
            campaigns.push({
              id: c.campaignId.toString(),
              name: c.name,
              objective: "Sponsored Products",
              rawResponse: c
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch Amazon SP campaigns:", e.message);
    }

    // 2. Sponsored Brands (SB / HSA)
    try {
      const res = await fetch(`${baseUrl}/v2/hsa/campaigns`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const c of data) {
            campaigns.push({
              id: c.campaignId.toString(),
              name: c.name,
              objective: "Sponsored Brands",
              rawResponse: c
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch Amazon SB campaigns:", e.message);
    }

    // 3. Sponsored Display (SD)
    try {
      const res = await fetch(`${baseUrl}/sd/campaigns`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const c of data) {
            campaigns.push({
              id: c.campaignId.toString(),
              name: c.name,
              objective: "Sponsored Display",
              rawResponse: c
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch Amazon SD campaigns:", e.message);
    }

    return campaigns;
  }

  async fetchAdSets(accessToken: string, adAccountId: string, metadata?: any): Promise<RawAdSet[]> {
    const baseUrl = this.getBaseUrl(metadata?.countryCode);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Amazon-Advertising-API-ClientId": this.clientId,
      "Amazon-Advertising-API-Scope": adAccountId,
      "Content-Type": "application/json"
    };

    const adSets: RawAdSet[] = [];

    // 1. Sponsored Products Ad Groups
    try {
      const res = await fetch(`${baseUrl}/v2/sp/adGroups`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const a of data) {
            adSets.push({
              id: a.adGroupId.toString(),
              campaignId: a.campaignId.toString(),
              name: a.name,
              rawResponse: a
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch Amazon SP ad groups:", e.message);
    }

    // 2. Sponsored Display Ad Groups
    try {
      const res = await fetch(`${baseUrl}/sd/adGroups`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const a of data) {
            adSets.push({
              id: a.adGroupId.toString(),
              campaignId: a.campaignId.toString(),
              name: a.name,
              rawResponse: a
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not fetch Amazon SD ad groups:", e.message);
    }

    return adSets;
  }

  async fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange, metadata?: any): Promise<RawMetric[]> {
    const baseUrl = this.getBaseUrl(metadata?.countryCode);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Amazon-Advertising-API-ClientId": this.clientId,
      "Amazon-Advertising-API-Scope": adAccountId,
      "Content-Type": "application/json"
    };

    const metrics: RawMetric[] = [];
    const dateStr = dateRange.end.toISOString().split("T")[0].replace(/-/g, "");

    try {
      const reportRes = await fetch(`${baseUrl}/v2/sp/campaigns/report`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          recordType: "campaigns",
          reportDate: dateStr,
          metrics: "cost,impressions,clicks,attributedConversions14d"
        })
      });
      if (reportRes.ok) {
        const reportInfo = await reportRes.json();
        if (reportInfo.status === "SUCCESS" && reportInfo.location) {
          const dlRes = await fetch(reportInfo.location);
          if (dlRes.ok) {
            const reportData = await dlRes.json();
            if (Array.isArray(reportData)) {
              for (const r of reportData) {
                metrics.push({
                  adSetId: `amz_camp_${r.campaignId}`,
                  date: new Date(dateRange.end),
                  spend: Number(r.cost || 0),
                  impressions: Number(r.impressions || 0),
                  clicks: Number(r.clicks || 0),
                  conversions: Number(r.attributedConversions14d || 0),
                  rawResponse: r
                });
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not request Amazon SP report:", e.message);
    }

    return metrics;
  }

  async disconnect(connectionId: string) {}
}
