import { AdPlatformConnector, DateRange, AdAccount, RawCampaign, RawAdSet, RawMetric } from "./types";

export class GoogleAdsConnector implements AdPlatformConnector {
  platformId = "google_ads";
  private clientId = process.env.GOOGLE_CLIENT_ID || "";
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  private developerToken = process.env.GOOGLE_DEVELOPER_TOKEN || "";
  private redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  getAuthUrl(state: string) {
    const scope = encodeURIComponent("https://www.googleapis.com/auth/adwords");
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
  }

  async connect(oauthCode: string) {
    const params = new URLSearchParams({
      code: oauthCode,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    
    if (!res.ok) {
      const txt = await res.text();
      console.error("Google API Error on " + res.url, res.status, txt.substring(0,1000));
      throw new Error("Google API Error: " + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Crucial
      expiresAt: new Date(Date.now() + (data.expires_in * 1000))
    };
  }

  async refreshToken(oldRefreshToken: string) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: oldRefreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    
    if (!res.ok) {
      const txt = await res.text();
      console.error("Google API Error on " + res.url, res.status, txt.substring(0,1000));
      throw new Error("Google API Error: " + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000))
    };
  }

  private async executeSearch(accessToken: string, customerId: string, query: string, loginCustomerId?: string) {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": this.developerToken,
      "Content-Type": "application/json"
    };
    
    if (loginCustomerId) {
      headers["login-customer-id"] = loginCustomerId;
    }

    // Convert CID to plain number string without dashes
    const cleanCid = customerId.replace(/-/g, '');
    
    const res = await fetch(`https://googleads.googleapis.com/v25/customers/${cleanCid}/googleAds:search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Google API Error on " + res.url, res.status, txt.substring(0,1000));
      throw new Error("Google API Error: " + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    
    return data.results || [];
  }

  async fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
    // 1. First get the accessible customers
    const res = await fetch("https://googleads.googleapis.com/v25/customers:listAccessibleCustomers", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": this.developerToken
      }
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Google API Error on " + res.url, res.status, txt.substring(0,1000));
      throw new Error("Google API Error: " + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    const resourceNames = data.resourceNames || [];
    const accounts: AdAccount[] = [];

    // 2. Query each accessible customer to see if it's an MCC or Client
    for (const resName of resourceNames) {
      const cid = resName.split('/')[1];
      try {
        const query = `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1`;
        const results = await this.executeSearch(accessToken, cid, query);
        if (results.length > 0) {
          const cust = results[0].customer;
          if (!cust.manager) {
            accounts.push({
              id: cid,
              name: cust.descriptive_name || `Google Ads ${cid}`,
              metadata: { loginCustomerId: cid }
            });
          } else {
            // It's a manager account. We could fetch its children here, but per requirements we just skip MCCs or map them.
            // For simplicity, we just list direct client accounts. If they want sub-accounts, we'd query customer_client.
            const queryClients = `SELECT customer_client.id, customer_client.descriptive_name FROM customer_client WHERE customer_client.manager = false`;
            const clients = await this.executeSearch(accessToken, cid, queryClients, cid);
            for (const c of clients) {
               accounts.push({
                 id: c.customerClient.id,
                 name: c.customerClient.descriptiveName || `Google Ads ${c.customerClient.id}`,
                 metadata: { loginCustomerId: cid } // We pass the MCC id as loginCustomerId
               });
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch customer ${cid}`, e);
      }
    }
    
    // Dedup accounts
    const unique = new Map(accounts.map(a => [a.id, a]));
    return Array.from(unique.values());
  }

  async fetchCampaigns(accessToken: string, adAccountId: string, metadata?: any): Promise<RawCampaign[]> {
    const loginCid = metadata?.loginCustomerId;
    const query = `SELECT campaign.id, campaign.name, campaign.advertising_channel_type FROM campaign`;
    const results = await this.executeSearch(accessToken, adAccountId, query, loginCid);
    
    return results.map((r: any) => ({
      id: r.campaign.id.toString(),
      name: r.campaign.name,
      objective: r.campaign.advertisingChannelType,
      rawResponse: r.campaign
    }));
  }

  async fetchAdSets(accessToken: string, adAccountId: string, metadata?: any): Promise<RawAdSet[]> {
    const loginCid = metadata?.loginCustomerId;
    const query = `SELECT ad_group.id, ad_group.name, ad_group.campaign FROM ad_group`;
    const results = await this.executeSearch(accessToken, adAccountId, query, loginCid);
    
    return results.map((r: any) => {
      // campaign string is like "customers/123/campaigns/456"
      const campIdStr = r.adGroup.campaign.split('/').pop();
      return {
        id: r.adGroup.id.toString(),
        campaignId: campIdStr,
        name: r.adGroup.name,
        rawResponse: r.adGroup
      };
    });
  }

  async fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange, metadata?: any): Promise<RawMetric[]> {
    const loginCid = metadata?.loginCustomerId;
    const start = dateRange.start.toISOString().split('T')[0];
    const end = dateRange.end.toISOString().split('T')[0];
    
    const query = `
      SELECT segments.date, ad_group.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions 
      FROM ad_group 
      WHERE segments.date >= '${start}' AND segments.date <= '${end}'
    `;
    const results = await this.executeSearch(accessToken, adAccountId, query, loginCid);
    
    return results.map((r: any) => ({
      adSetId: r.adGroup.id.toString(),
      date: new Date(r.segments.date),
      spend: (r.metrics.costMicros || 0) / 1000000,
      impressions: r.metrics.impressions || 0,
      clicks: r.metrics.clicks || 0,
      conversions: r.metrics.conversions || 0,
      rawResponse: r.metrics
    }));
  }

  async disconnect(connectionId: string) {
    // Optional revoke
  }
}
