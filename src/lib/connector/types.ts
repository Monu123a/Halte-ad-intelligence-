export interface DateRange {
  start: Date;
  end: Date;
}

export interface AdAccount {
  id: string;
  name: string;
  metadata?: any;
}

export interface RawCampaign {
  id: string;
  name: string;
  objective: string;
  pageId?: string; // Extracted from creative/ad
  adNames?: string[];
  rawResponse?: any;
}

export interface RawAdSet {
  id: string;
  campaignId: string;
  name: string;
  rawResponse?: any;
}

export interface RawMetric {
  adSetId: string;
  date: Date;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  rawResponse: any;
}

export interface AdPlatformConnector {
  platformId: string; // "meta_ads" | "google_ads"
  
  connect(oauthCode: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date }>;
  
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>;
  
  fetchAdAccounts(accessToken: string): Promise<AdAccount[]>;
  
  fetchCampaigns(accessToken: string, adAccountId: string, metadata?: any): Promise<RawCampaign[]>;

  fetchAdSets(accessToken: string, adAccountId: string, metadata?: any): Promise<RawAdSet[]>;
  
  fetchDailyMetrics(accessToken: string, adAccountId: string, dateRange: DateRange, metadata?: any): Promise<RawMetric[]>;
  
  disconnect(connectionId: string): Promise<void>;
}
