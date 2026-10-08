import { AdPlatformConnector, DateRange, AdAccount, RawCampaign, RawAdSet, RawMetric } from "./types";

export class MetaAdsConnector implements AdPlatformConnector {
  platformId = "meta_ads";
  private appId = process.env.META_APP_ID || "";
  private appSecret = process.env.META_APP_SECRET || "";
  private redirectUri = process.env.META_REDIRECT_URI || "http://localhost:3000/api/auth/meta/callback";

  getAuthUrl(state: string) {
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}&scope=ads_management,ads_read,read_insights`;
  }

  async connect(oauthCode: string) {
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&client_secret=${this.appSecret}&code=${oauthCode}`);
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    const longTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${tokenData.access_token}`);
    const longTokenData = await longTokenRes.json();
    if (longTokenData.error) throw new Error(longTokenData.error.message);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    return {
      accessToken: longTokenData.access_token,
      expiresAt
    };
  }

  async refreshToken(oldToken: string) {
    const longTokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${oldToken}`);
    const longTokenData = await longTokenRes.json();
    if (longTokenData.error) throw new Error(longTokenData.error.message);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    return {
      accessToken: longTokenData.access_token,
      expiresAt
    };
  }

  async fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${accessToken}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    return data.data.map((acc: any) => ({
      id: acc.id,
      name: acc.name || acc.id
    }));
  }

  private async fetchAllPages(initialUrl: string): Promise<any[]> {
    let url = initialUrl;
    let allData: any[] = [];
    while (url) {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      
      if (json.data && Array.isArray(json.data)) {
        allData = allData.concat(json.data);
      }
      
      url = json.paging?.next || null;
    }
    return allData;
  }

  async fetchCampaigns(accessToken: string, adAccountId: string): Promise<RawCampaign[]> {
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=id,name,objective,ads{creative{effective_object_story_id,object_story_spec,object_id,instagram_actor_id,instagram_permalink_url}}&limit=100&access_token=${accessToken}`;
    const data = await this.fetchAllPages(url);

    return data.map((c: any) => {
      let pageId = undefined;
      const firstAd = c.ads?.data?.[0];
      if (firstAd?.creative?.object_story_spec?.page_id) {
        pageId = firstAd.creative.object_story_spec.page_id;
      } else if (firstAd?.creative?.effective_object_story_id) {
        pageId = firstAd.creative.effective_object_story_id.split('_')[0];
      }
      return {
        id: c.id,
        name: c.name,
        objective: c.objective,
        pageId,
        rawResponse: c // Passed for mapping later
      };
    });
  }

  async fetchAdSets(accessToken: string, adAccountId: string): Promise<RawAdSet[]> {
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/adsets?fields=id,name,campaign_id,targeting,optimization_goal,destination_type&limit=100&access_token=${accessToken}`;
    const data = await this.fetchAllPages(url);

    return data.map((a: any) => ({
      id: a.id,
      name: a.name,
      campaignId: a.campaign_id,
      rawResponse: a // Passed for extracting targeting
    }));
  }

  async fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange): Promise<RawMetric[]> {
    const since = dateRange.start.toISOString().split("T")[0];
    const until = dateRange.end.toISOString().split("T")[0];
    
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?level=adset&time_range={'since':'${since}','until':'${until}'}&time_increment=1&fields=adset_id,spend,impressions,clicks&limit=100&access_token=${accessToken}`;
    const data = await this.fetchAllPages(url);

    return data.map((m: any) => ({
      adSetId: m.adset_id,
      date: new Date(m.date_start),
      spend: parseFloat(m.spend || "0"),
      impressions: parseInt(m.impressions || "0", 10),
      clicks: parseInt(m.clicks || "0", 10),
      rawResponse: m
    }));
  }

  async disconnect(connectionId: string) {
    // In Meta, revoke permission.
  }
}
