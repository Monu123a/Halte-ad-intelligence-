import { AdPlatformConnector } from "./types";
import { MetaAdsConnector } from "./meta";
import { GoogleAdsConnector } from "./google";
import { AmazonAdsConnector } from "./amazon";

export function getConnector(platform: "META" | "GOOGLE" | "AMAZON"): AdPlatformConnector {
  switch (platform) {
    case "META":
      return new MetaAdsConnector();
    case "GOOGLE":
      return new GoogleAdsConnector();
    case "AMAZON":
      return new AmazonAdsConnector();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
