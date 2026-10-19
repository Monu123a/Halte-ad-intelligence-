import prisma from "@/lib/prisma";

export interface StateGeoInfo {
  state: string;
  zone: "North" | "West" | "South" | "East" | "Central" | "North East";
  topDistricts: string[];
  recommendedProducts: string[];
  adStrategyTip: string;
  seasonalityNotes: string;
}

export const INDIAN_STATE_INTELLIGENCE: Record<string, StateGeoInfo> = {
  "Maharashtra": {
    state: "Maharashtra",
    zone: "West",
    topDistricts: ["Pune", "Mumbai", "Thane", "Nashik", "Nagpur", "Kolhapur", "Chhatrapati Sambhajinagar", "Satara", "Solapur", "Sangli"],
    recommendedProducts: ["Hose Reels", "Sprinklers", "Drip irrigation", "Glues", "Velcro Tapes", "Hand Tools"],
    adStrategyTip: "High villa/bungalow density in Pune, Nashik & Thane. Run Gardena premium watering systems + industrial DIY tape bundles for Mumbai workshops.",
    seasonalityNotes: "Peak garden growth post-monsoon through spring (Oct – Feb)."
  },
  "Uttar Pradesh": {
    state: "Uttar Pradesh",
    zone: "North",
    topDistricts: ["Lucknow", "Noida", "Greater Noida", "Ghaziabad", "Kanpur", "Agra", "Varanasi", "Meerut", "Prayagraj", "Bareilly", "Aligarh"],
    recommendedProducts: ["Tillers", "Brush Cutters", "Portable Sprayers", "Chainsaw", "Hand Tools", "Glues"],
    adStrategyTip: "Split campaigns into Urban NCR (Noida/Ghaziabad for Gardena urban gardening) vs Agricultural belt (Lucknow/Kanpur/Varanasi for BKR Tillers & Sprayers).",
    seasonalityNotes: "Major crop sowing and seasonal farm prep in Oct–Nov and Feb–March."
  },
  "Gujarat": {
    state: "Gujarat",
    zone: "West",
    topDistricts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar", "Jamnagar", "Junagadh", "Anand", "Mehsana"],
    recommendedProducts: ["Glues", "Velcro Tapes", "Drip irrigation", "Sprinklers", "Tillers", "Hand Tools"],
    adStrategyTip: "Massive commercial & industrial demand for Velcro/Gorilla waterproof tapes and adhesives in Surat & Ahmedabad. Drip irrigation converts strongly in Saurashtra belt.",
    seasonalityNotes: "Year-round manufacturing & commercial tape usage; irrigation peaks winter/summer."
  },
  "Delhi": {
    state: "Delhi",
    zone: "North",
    topDistricts: ["South Delhi", "West Delhi", "North Delhi", "East Delhi", "Dwarka", "Rohini", "Vasant Kunj", "Civil Lines"],
    recommendedProducts: ["Hose Reels", "Sprinklers", "Combisystem", "Hand Tools", "Glues", "Velcro Tapes"],
    adStrategyTip: "High-income terrace/balcony gardening market. Promote compact hose reels (City Gardening), automatic tap timers, and clean home-repair glues.",
    seasonalityNotes: "Winter flowers & garden setup peaks between October and February."
  },
  "Punjab": {
    state: "Punjab",
    zone: "North",
    topDistricts: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "SAS Nagar (Mohali)", "Hoshiarpur", "Pathankot", "Moga", "Sangrur"],
    recommendedProducts: ["Brush Cutters", "Tillers", "Chainsaw", "Fogging Machine", "Garden Machinery", "Hand Tools"],
    adStrategyTip: "Focus on heavy-duty reliability, fuel efficiency, and post-harvest crop field clearing. Highlight BKR machine durability in Punjabi/Hindi ad copies.",
    seasonalityNotes: "Intense machine clearing and seasonal farming operations post-paddy and pre-wheat harvest."
  },
  "Karnataka": {
    state: "Karnataka",
    zone: "South",
    topDistricts: ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Shivamogga", "Davanagere", "Udupi"],
    recommendedProducts: ["Hose Reels", "Sprinklers", "Drip irrigation", "Combisystem", "Garden Pruners", "Glues"],
    adStrategyTip: "Bengaluru is India's tech gardening capital. Ads for automated drip irrigation kits, smart watering, and ergonomic pruners yield high basket values.",
    seasonalityNotes: "Moderate climate year-round; steady terrace garden and coffee estate pruning demand."
  },
  "Kerala": {
    state: "Kerala",
    zone: "South",
    topDistricts: ["Ernakulam (Kochi)", "Thiruvananthapuram", "Thrissur", "Kozhikode", "Kottayam", "Palakkad", "Kannur", "Malappuram", "Kollam"],
    recommendedProducts: ["Brush Cutters", "Chainsaw", "Pole Pruners", "Hose Reels", "Portable Sprayers", "Waterproof Tape"],
    adStrategyTip: "High rainfall & lush vegetation demand powerful brush cutters, weed clearers, and tree pruners. Extremely low Cost Per Lead (avg ₹38). Target plantation owners.",
    seasonalityNotes: "Active vegetation growth; weed clearing and rubber/spice plantation maintenance."
  },
  "Haryana": {
    state: "Haryana",
    zone: "North",
    topDistricts: ["Gurugram", "Faridabad", "Karnal", "Panipat", "Hisar", "Ambala", "Sonipat", "Rohtak", "Yamunanagar", "Sirsa"],
    recommendedProducts: ["Tillers", "Brush Cutters", "Sprinklers", "Hose Reels", "Fogging Machine", "Hand Tools"],
    adStrategyTip: "Dual market: Gurugram/Faridabad high-end residential landscaping vs GT Road belt (Karnal, Panipat, Ambala) agricultural machinery demand.",
    seasonalityNotes: "Surge during pre-winter crop sowing and lawn renovation."
  },
  "Tamil Nadu": {
    state: "Tamil Nadu",
    zone: "South",
    topDistricts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Kanchipuram", "Thanjavur"],
    recommendedProducts: ["Drip irrigation", "Sprinklers", "Waterproof Tape", "Glues", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Water-conservation and drip automation campaigns perform best in Coimbatore and Chennai. Industrial tapes sell strongly in textile/auto belts (Tiruppur/Salem).",
    seasonalityNotes: "Northeast monsoon season (Oct–Dec) drives planting and garden maintenance."
  },
  "Himachal Pradesh": {
    state: "Himachal Pradesh",
    zone: "North",
    topDistricts: ["Shimla", "Kullu", "Mandi", "Solan", "Kangra (Dharamshala)", "Bilaspur", "Sirmaur", "Chamba", "Kinnaur"],
    recommendedProducts: ["Chainsaw", "Pole Pruners", "Brush Cutters", "Snow Chains", "Portable Sprayers"],
    adStrategyTip: "🏆 #1 Lowest CPL in India (₹26.6/lead). High orchard maintenance intent (apple/stone fruits in Shimla/Kullu). Push winter chainsaws, pruning tools & snow chains.",
    seasonalityNotes: "Heavy pruning season in winter (Nov–Feb); apple orchard seasonal spray cycles."
  },
  "Rajasthan": {
    state: "Rajasthan",
    zone: "North",
    topDistricts: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bhilwara", "Sikar", "Pali"],
    recommendedProducts: ["Drip irrigation", "Sprinklers", "Portable Sprayers", "Hand Tools", "Glues"],
    adStrategyTip: "Water-saving products are essential. Farmhouse and heritage properties in Jaipur & Udaipur respond very well to Gardena sprinklers and drip irrigation.",
    seasonalityNotes: "Irrigation equipment demand spikes during Rabi crop season and dry winter months."
  },
  "West Bengal": {
    state: "West Bengal",
    zone: "East",
    topDistricts: ["Kolkata", "Howrah", "North 24 Parganas", "Siliguri", "South 24 Parganas", "Asansol", "Durgapur", "Hooghly"],
    recommendedProducts: ["Brush Cutters", "Chainsaw", "Glues", "Velcro Tapes", "Sprinklers"],
    adStrategyTip: "Kolkata urban DIY market converts on adhesives & tapes. Tea garden belts (Siliguri/Darjeeling) convert on brush cutters and vegetation maintenance.",
    seasonalityNotes: "Post-monsoon clearing and industrial factory repairs."
  },
  "Chandigarh": {
    state: "Chandigarh",
    zone: "North",
    topDistricts: ["Chandigarh Sector Belt", "Panchkula", "Mohali (SAS Nagar)", "Zirakpur", "Kharar"],
    recommendedProducts: ["Hose Reels", "Lawn Mowers", "Sprinklers", "Combisystem", "Hand Tools"],
    adStrategyTip: "The highest per-capita residential garden ownership in North India. High willingness to pay for premium Gardena robotic/electric mowers and hose boxes.",
    seasonalityNotes: "Year-round garden pride; winter flower season is huge (Oct–March)."
  },
  "Madhya Pradesh": {
    state: "Madhya Pradesh",
    zone: "Central",
    topDistricts: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Ratlam", "Satna"],
    recommendedProducts: ["Tillers", "Portable Sprayers", "Drip irrigation", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Indore & Bhopal lead urban sales. Focus on multi-purpose power tillers and chemical sprayers in surrounding soy and wheat farming districts.",
    seasonalityNotes: "Kharif and Rabi seasonal crop cycles."
  },
  "Telangana": {
    state: "Telangana",
    zone: "South",
    topDistricts: ["Hyderabad", "Ranga Reddy", "Medchal–Malkajgiri", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    recommendedProducts: ["Drip irrigation", "Hose Reels", "Sprinklers", "Glues", "Velcro Tapes"],
    adStrategyTip: "Gated communities and villa layouts in Gachibowli, Kokapet, and Jubilee Hills are prime for Gardena automatic watering systems.",
    seasonalityNotes: "Dry climate demands efficient automated watering solutions."
  },
  "Andhra Pradesh": {
    state: "Andhra Pradesh",
    zone: "South",
    topDistricts: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Rajahmundry", "Kakinada", "Kurnool"],
    recommendedProducts: ["Drip irrigation", "Sprinklers", "Portable Sprayers", "Waterproof Tape"],
    adStrategyTip: "Aqua-farming and horticulture belts (Guntur/Vijayawada/Godavari) demand sprayers and waterproof sealants.",
    seasonalityNotes: "Agricultural cycles and coastal post-cyclone weatherproofing."
  },
  "Jammu and Kashmir": {
    state: "Jammu and Kashmir",
    zone: "North",
    topDistricts: ["Jammu", "Srinagar", "Udhampur", "Anantnag", "Baramulla", "Pulwama", "Sopore"],
    recommendedProducts: ["Chainsaw", "Pole Pruners", "Snow Chains", "Brush Cutters", "Portable Sprayers"],
    adStrategyTip: "Orchard pruning in Kashmir apple valleys and winter snow driving in Jammu-Srinagar highway corridor. Push snow chains and cold-weather chainsaws.",
    seasonalityNotes: "Winter orchard dormancy pruning (Nov–Feb); heavy snowfall preparation."
  },
  "Assam": {
    state: "Assam",
    zone: "North East",
    topDistricts: ["Guwahati (Kamrup Metro)", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
    recommendedProducts: ["Brush Cutters", "Chainsaw", "Portable Sprayers", "Waterproof Tape"],
    adStrategyTip: "High vegetation growth in tea gardens and rural homesteads. Focus on brush cutters, weed whackers, and roof waterproofing tape.",
    seasonalityNotes: "Monsoon weed surges and tea estate maintenance."
  },
  "Bihar": {
    state: "Bihar",
    zone: "East",
    topDistricts: ["Patna", "Muzaffarpur", "Gaya", "Bhagalpur", "Darbhanga", "Purnia", "Begusarai"],
    recommendedProducts: ["Tillers", "Portable Sprayers", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Focus on affordable power tillers and pest-spraying equipment for smallholder farmers.",
    seasonalityNotes: "Rabi & Kharif agricultural seasons."
  },
  "Odisha": {
    state: "Odisha",
    zone: "East",
    topDistricts: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur", "Balasore", "Berhampur"],
    recommendedProducts: ["Waterproof Tape", "Portable Sprayers", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Coastal moisture demands waterproof adhesives. Bhubaneswar residential market is expanding rapidly.",
    seasonalityNotes: "Monsoon and cyclone weatherproofing."
  },
  "Jharkhand": {
    state: "Jharkhand",
    zone: "East",
    topDistricts: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar"],
    recommendedProducts: ["Glues", "Velcro Tapes", "Hand Tools", "Brush Cutters"],
    adStrategyTip: "Industrial manufacturing hub in Jamshedpur/Dhanbad. Target workshops and industrial maintenance.",
    seasonalityNotes: "Year-round industrial demand."
  },
  "Chhattisgarh": {
    state: "Chhattisgarh",
    zone: "Central",
    topDistricts: ["Raipur", "Bhilai-Durg", "Bilaspur", "Korba", "Rajnandgaon"],
    recommendedProducts: ["Hand Tools", "Portable Sprayers", "Brush Cutters", "Glues"],
    adStrategyTip: "Raipur & Bhilai steel/industrial corridors. Agricultural demand in southern paddy belts.",
    seasonalityNotes: "Paddy crop harvesting and winter maintenance."
  },
  "Uttarakhand": {
    state: "Uttarakhand",
    zone: "North",
    topDistricts: ["Dehradun", "Haridwar", "Rishikesh", "Nainital", "Haldwani", "Udham Singh Nagar", "Roorkee"],
    recommendedProducts: ["Chainsaw", "Hose Reels", "Brush Cutters", "Snow Chains", "Garden Machinery"],
    adStrategyTip: "Resort/hotel gardens in Dehradun, Mussoorie & Nainital require lawn care. Hill terrain demands chainsaws and pruners.",
    seasonalityNotes: "Autumn tourist season prep and winter tree maintenance."
  },
  "Goa": {
    state: "Goa",
    zone: "West",
    topDistricts: ["North Goa (Panaji, Mapusa, Calangute)", "South Goa (Margao, Vasco)"],
    recommendedProducts: ["Lawn Mowers", "Hose Reels", "Sprinklers", "Waterproof Tape", "Glues"],
    adStrategyTip: "Villas, luxury resorts, boutique hotels and beachside properties. High demand for lawn mowers and coastal anti-corrosion glues/tapes.",
    seasonalityNotes: "Post-monsoon tourist season prep (Oct–April)."
  }
};

export interface AggregatedGeoRow {
  state: string;
  zone: string;
  spend: number;
  leads: number;
  cpl: number;
  cplRating: "Top Efficiency 🏆" | "High Volume & Efficient 🔥" | "Balanced ⚖️" | "Moderate / Selective 📊";
  cplColor: string;
  nationalSharePct: number;
  topDistricts: string[];
  recommendedProducts: string[];
  adStrategyTip: string;
  seasonalityNotes: string;
}

export interface GeoReportData {
  summary: {
    totalSpend: number;
    totalLeads: number;
    avgCpl: number;
    topStateByVolume: string;
    topStateByEfficiency: string;
    totalStatesActive: number;
  };
  zones: {
    zone: string;
    spend: number;
    leads: number;
    cpl: number;
    sharePct: number;
  }[];
  states: AggregatedGeoRow[];
}

export async function getGeographicalReport(): Promise<GeoReportData> {
  const metrics = await prisma.geoMetric.findMany();

  // Aggregate by state
  const stateMap: Record<string, { spend: number; leads: number }> = {};
  let totalSpend = 0;
  let totalLeads = 0;

  for (const m of metrics) {
    const s = m.region;
    if (!stateMap[s]) {
      stateMap[s] = { spend: 0, leads: 0 };
    }
    const spend = Number(m.spend);
    const leads = m.firstReplies + m.leads + m.conversations;

    stateMap[s].spend += spend;
    stateMap[s].leads += leads;
    totalSpend += spend;
    totalLeads += leads;
  }

  // Build state rows
  const states: AggregatedGeoRow[] = Object.entries(stateMap)
    .filter(([_, data]) => data.leads > 0 || data.spend > 1000)
    .map(([state, data]) => {
      const intel = INDIAN_STATE_INTELLIGENCE[state] || {
        state,
        zone: "North",
        topDistricts: ["Major District Centers"],
        recommendedProducts: ["Gardena & BKR Complete Kits"],
        adStrategyTip: "Test broad audience targeting with localized Hindi/English copy.",
        seasonalityNotes: "Standard seasonal demand."
      };

      const cpl = data.leads > 0 ? Math.round(data.spend / data.leads) : 0;
      const sharePct = totalLeads > 0 ? Math.round((data.leads / totalLeads) * 1000) / 10 : 0;

      let cplRating: AggregatedGeoRow["cplRating"] = "Balanced ⚖️";
      let cplColor = "text-sky-600 bg-sky-50 border-sky-200";

      if (cpl > 0 && cpl <= 40) {
        cplRating = "Top Efficiency 🏆";
        cplColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
      } else if (cpl > 40 && cpl <= 65) {
        cplRating = "High Volume & Efficient 🔥";
        cplColor = "text-indigo-700 bg-indigo-50 border-indigo-200";
      } else if (cpl > 65 && cpl <= 85) {
        cplRating = "Balanced ⚖️";
        cplColor = "text-amber-700 bg-amber-50 border-amber-200";
      } else {
        cplRating = "Moderate / Selective 📊";
        cplColor = "text-stone-700 bg-stone-100 border-stone-200";
      }

      return {
        state,
        zone: intel.zone,
        spend: Math.round(data.spend),
        leads: data.leads,
        cpl,
        cplRating,
        cplColor,
        nationalSharePct: sharePct,
        topDistricts: intel.topDistricts,
        recommendedProducts: intel.recommendedProducts,
        adStrategyTip: intel.adStrategyTip,
        seasonalityNotes: intel.seasonalityNotes
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // Group by Zone
  const zoneMap: Record<string, { spend: number; leads: number }> = {};
  for (const s of states) {
    if (!zoneMap[s.zone]) zoneMap[s.zone] = { spend: 0, leads: 0 };
    zoneMap[s.zone].spend += s.spend;
    zoneMap[s.zone].leads += s.leads;
  }

  const zones = Object.entries(zoneMap)
    .map(([zone, data]) => ({
      zone,
      spend: data.spend,
      leads: data.leads,
      cpl: data.leads > 0 ? Math.round(data.spend / data.leads) : 0,
      sharePct: totalLeads > 0 ? Math.round((data.leads / totalLeads) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.leads - a.leads);

  // Find top states
  const topStateByVolume = states[0]?.state || "N/A";
  const efficientStates = states.filter(s => s.leads >= 50 && s.cpl > 0).sort((a, b) => a.cpl - b.cpl);
  const topStateByEfficiency = efficientStates[0]?.state || "Himachal Pradesh";

  return {
    summary: {
      totalSpend: Math.round(totalSpend),
      totalLeads,
      avgCpl: totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0,
      topStateByVolume,
      topStateByEfficiency,
      totalStatesActive: states.length
    },
    zones,
    states
  };
}
