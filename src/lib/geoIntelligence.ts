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
  // --- WEST ---
  "Maharashtra": {
    state: "Maharashtra",
    zone: "West",
    topDistricts: ["Pune", "Mumbai", "Thane", "Nashik", "Nagpur", "Kolhapur", "Chhatrapati Sambhajinagar", "Satara", "Solapur", "Sangli"],
    recommendedProducts: ["Hose Reels", "Sprinklers", "Drip irrigation", "Glues", "Velcro Tapes", "Hand Tools"],
    adStrategyTip: "High villa/bungalow density in Pune, Nashik & Thane. Run Gardena premium watering systems + industrial DIY tape bundles for Mumbai workshops.",
    seasonalityNotes: "Peak garden growth post-monsoon through spring (Oct – Feb)."
  },
  "Gujarat": {
    state: "Gujarat",
    zone: "West",
    topDistricts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar", "Jamnagar", "Junagadh", "Anand", "Mehsana"],
    recommendedProducts: ["Glues", "Velcro Tapes", "Drip irrigation", "Sprinklers", "Tillers", "Hand Tools"],
    adStrategyTip: "Massive commercial & industrial demand for Velcro/Gorilla waterproof tapes and adhesives in Surat & Ahmedabad. Drip irrigation converts strongly in Saurashtra belt.",
    seasonalityNotes: "Year-round manufacturing & commercial tape usage; irrigation peaks winter/summer."
  },
  "Goa": {
    state: "Goa",
    zone: "West",
    topDistricts: ["North Goa (Panaji, Mapusa, Calangute, Porvorim)", "South Goa (Margao, Vasco da Gama, Ponda)"],
    recommendedProducts: ["Lawn Mowers", "Hose Reels", "Sprinklers", "Waterproof Tape", "Glues"],
    adStrategyTip: "Villas, luxury resorts, boutique hotels and beachside properties. High demand for lawn mowers and coastal anti-corrosion glues/tapes.",
    seasonalityNotes: "Post-monsoon tourist season prep (Oct–April)."
  },
  "Dadra and Nagar Haveli": {
    state: "Dadra and Nagar Haveli",
    zone: "West",
    topDistricts: ["Silvassa", "Daman", "Diu"],
    recommendedProducts: ["Waterproof Tape", "Glues", "Velcro Tapes", "Hand Tools"],
    adStrategyTip: "Industrial manufacturing corridor. Target factory plant maintenance, electrical insulation, and repair workshops.",
    seasonalityNotes: "Year-round industrial operations."
  },

  // --- NORTH ---
  "Uttar Pradesh": {
    state: "Uttar Pradesh",
    zone: "North",
    topDistricts: ["Lucknow", "Noida", "Greater Noida", "Ghaziabad", "Kanpur", "Agra", "Varanasi", "Meerut", "Prayagraj", "Bareilly", "Aligarh"],
    recommendedProducts: ["Tillers", "Brush Cutters", "Portable Sprayers", "Chainsaw", "Hand Tools", "Glues"],
    adStrategyTip: "Split campaigns into Urban NCR (Noida/Ghaziabad for Gardena urban gardening) vs Agricultural belt (Lucknow/Kanpur/Varanasi for BKR Tillers & Sprayers).",
    seasonalityNotes: "Major crop sowing and seasonal farm prep in Oct–Nov and Feb–March."
  },
  "Delhi": {
    state: "Delhi",
    zone: "North",
    topDistricts: ["South Delhi", "West Delhi", "North Delhi", "East Delhi", "Dwarka", "Rohini", "Vasant Kunj", "Civil Lines", "Lutyens Zone"],
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
  "Haryana": {
    state: "Haryana",
    zone: "North",
    topDistricts: ["Gurugram", "Faridabad", "Karnal", "Panipat", "Hisar", "Ambala", "Sonipat", "Rohtak", "Yamunanagar", "Sirsa"],
    recommendedProducts: ["Tillers", "Brush Cutters", "Sprinklers", "Hose Reels", "Fogging Machine", "Hand Tools"],
    adStrategyTip: "Dual market: Gurugram/Faridabad high-end residential landscaping vs GT Road belt (Karnal, Panipat, Ambala) agricultural machinery demand.",
    seasonalityNotes: "Surge during pre-winter crop sowing and lawn renovation."
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
  "Chandigarh": {
    state: "Chandigarh",
    zone: "North",
    topDistricts: ["Chandigarh Sector Belt", "Panchkula", "Mohali (SAS Nagar)", "Zirakpur", "Kharar"],
    recommendedProducts: ["Hose Reels", "Lawn Mowers", "Sprinklers", "Combisystem", "Hand Tools"],
    adStrategyTip: "The highest per-capita residential garden ownership in North India. High willingness to pay for premium Gardena robotic/electric mowers and hose boxes.",
    seasonalityNotes: "Year-round garden pride; winter flower season is huge (Oct–March)."
  },
  "Jammu and Kashmir": {
    state: "Jammu and Kashmir",
    zone: "North",
    topDistricts: ["Jammu", "Srinagar", "Udhampur", "Anantnag", "Baramulla", "Pulwama", "Sopore", "Kathua"],
    recommendedProducts: ["Chainsaw", "Pole Pruners", "Snow Chains", "Brush Cutters", "Portable Sprayers"],
    adStrategyTip: "Orchard pruning in Kashmir apple valleys and winter snow driving in Jammu-Srinagar highway corridor. Push snow chains and cold-weather chainsaws.",
    seasonalityNotes: "Winter orchard dormancy pruning (Nov–Feb); heavy snowfall preparation."
  },
  "Uttarakhand": {
    state: "Uttarakhand",
    zone: "North",
    topDistricts: ["Dehradun", "Haridwar", "Rishikesh", "Nainital", "Haldwani", "Udham Singh Nagar", "Roorkee", "Almora"],
    recommendedProducts: ["Chainsaw", "Hose Reels", "Brush Cutters", "Snow Chains", "Garden Machinery"],
    adStrategyTip: "Resort/hotel gardens in Dehradun, Mussoorie & Nainital require lawn care. Hill terrain demands chainsaws and pruners.",
    seasonalityNotes: "Autumn tourist season prep and winter tree maintenance."
  },
  "Ladakh": {
    state: "Ladakh",
    zone: "North",
    topDistricts: ["Leh", "Kargil"],
    recommendedProducts: ["Snow Chains", "Chainsaw", "Heavy Duty Waterproof Tape", "Hand Tools"],
    adStrategyTip: "Extreme sub-zero climate. Heavy snow protection and vehicle snow chain traction are primary demand drivers.",
    seasonalityNotes: "Extreme winter freeze (Nov–March)."
  },

  // --- SOUTH ---
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
  "Tamil Nadu": {
    state: "Tamil Nadu",
    zone: "South",
    topDistricts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Kanchipuram", "Thanjavur"],
    recommendedProducts: ["Drip irrigation", "Sprinklers", "Waterproof Tape", "Glues", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Water-conservation and drip automation campaigns perform best in Coimbatore and Chennai. Industrial tapes sell strongly in textile/auto belts (Tiruppur/Salem).",
    seasonalityNotes: "Northeast monsoon season (Oct–Dec) drives planting and garden maintenance."
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
    topDistricts: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Rajahmundry", "Kakinada", "Kurnool", "Anantapur"],
    recommendedProducts: ["Drip irrigation", "Sprinklers", "Portable Sprayers", "Waterproof Tape"],
    adStrategyTip: "Aqua-farming and horticulture belts (Guntur/Vijayawada/Godavari) demand sprayers and waterproof sealants.",
    seasonalityNotes: "Agricultural cycles and coastal post-cyclone weatherproofing."
  },
  "Puducherry": {
    state: "Puducherry",
    zone: "South",
    topDistricts: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
    recommendedProducts: ["Hose Reels", "Sprinklers", "Garden Pruners", "Glues"],
    adStrategyTip: "Heritage French quarter villas, coastal guest houses and boutique hotels. Target aesthetic gardening tools.",
    seasonalityNotes: "Coastal tourism season (Nov–Feb)."
  },
  "Lakshadweep": {
    state: "Lakshadweep",
    zone: "South",
    topDistricts: ["Kavaratti", "Agatti", "Amini", "Andrott"],
    recommendedProducts: ["Waterproof Tape", "Heavy Duty Glues", "Hand Tools"],
    adStrategyTip: "Island maritime environment. Strong demand for heavy-duty marine waterproof tape and weather sealants.",
    seasonalityNotes: "Heavy maritime monsoon exposure."
  },

  // --- EAST ---
  "West Bengal": {
    state: "West Bengal",
    zone: "East",
    topDistricts: ["Kolkata", "Howrah", "North 24 Parganas", "Siliguri", "South 24 Parganas", "Asansol", "Durgapur", "Hooghly", "Darjeeling"],
    recommendedProducts: ["Brush Cutters", "Chainsaw", "Glues", "Velcro Tapes", "Sprinklers"],
    adStrategyTip: "Kolkata urban DIY market converts on adhesives & tapes. Tea garden belts (Siliguri/Darjeeling) convert on brush cutters and vegetation maintenance.",
    seasonalityNotes: "Post-monsoon clearing and industrial factory repairs."
  },
  "Bihar": {
    state: "Bihar",
    zone: "East",
    topDistricts: ["Patna", "Muzaffarpur", "Gaya", "Bhagalpur", "Darbhanga", "Purnia", "Begusarai", "Samastipur"],
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
  "Andaman and Nicobar Islands": {
    state: "Andaman and Nicobar Islands",
    zone: "East",
    topDistricts: ["South Andaman (Port Blair)", "North and Middle Andaman", "Nicobar"],
    recommendedProducts: ["Waterproof Tape", "Brush Cutters", "Chainsaw", "Glues"],
    adStrategyTip: "Tropical rainforest vegetation and coastal marine humidity. High conversion on heavy waterproof sealants and wood cutting tools.",
    seasonalityNotes: "Tropical monsoon maintenance."
  },

  // --- CENTRAL ---
  "Madhya Pradesh": {
    state: "Madhya Pradesh",
    zone: "Central",
    topDistricts: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Ratlam", "Satna", "Rewa"],
    recommendedProducts: ["Tillers", "Portable Sprayers", "Drip irrigation", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Indore & Bhopal lead urban sales. Focus on multi-purpose power tillers and chemical sprayers in surrounding soy and wheat farming districts.",
    seasonalityNotes: "Kharif and Rabi seasonal crop cycles."
  },
  "Chhattisgarh": {
    state: "Chhattisgarh",
    zone: "Central",
    topDistricts: ["Raipur", "Bhilai-Durg", "Bilaspur", "Korba", "Rajnandgaon", "Jagdalpur"],
    recommendedProducts: ["Hand Tools", "Portable Sprayers", "Brush Cutters", "Glues"],
    adStrategyTip: "Raipur & Bhilai steel/industrial corridors. Agricultural demand in southern paddy belts.",
    seasonalityNotes: "Paddy crop harvesting and winter maintenance."
  },

  // --- NORTH EAST ---
  "Assam": {
    state: "Assam",
    zone: "North East",
    topDistricts: ["Guwahati (Kamrup Metro)", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon"],
    recommendedProducts: ["Brush Cutters", "Chainsaw", "Portable Sprayers", "Waterproof Tape"],
    adStrategyTip: "High vegetation growth in tea gardens and rural homesteads. Focus on brush cutters, weed whackers, and roof waterproofing tape.",
    seasonalityNotes: "Monsoon weed surges and tea estate maintenance."
  },
  "Tripura": {
    state: "Tripura",
    zone: "North East",
    topDistricts: ["West Tripura (Agartala)", "Gomati", "South Tripura", "Dhalai"],
    recommendedProducts: ["Portable Sprayers", "Brush Cutters", "Waterproof Tape", "Hand Tools"],
    adStrategyTip: "Rubber plantations and agriculture around Agartala. Focus on spraying pumps and vegetation clearing.",
    seasonalityNotes: "Monsoon and post-monsoon farm care."
  },
  "Meghalaya": {
    state: "Meghalaya",
    zone: "North East",
    topDistricts: ["East Khasi Hills (Shillong)", "West Garo Hills (Tura)", "Ri-Bhoi"],
    recommendedProducts: ["Chainsaw", "Brush Cutters", "Waterproof Tape", "Hand Tools"],
    adStrategyTip: "World's highest rainfall region. Roof leak repair, waterproof sealants, and wood cutting chainsaws for hill terrain.",
    seasonalityNotes: "Extreme rainfall maintenance."
  },
  "Manipur": {
    state: "Manipur",
    zone: "North East",
    topDistricts: ["Imphal West", "Imphal East", "Thoubal", "Bishnupur", "Churachandpur"],
    recommendedProducts: ["Portable Sprayers", "Brush Cutters", "Hand Tools", "Glues"],
    adStrategyTip: "Horticulture and small-scale farming around Imphal valley.",
    seasonalityNotes: "Paddy and vegetable crop seasons."
  },
  "Nagaland": {
    state: "Nagaland",
    zone: "North East",
    topDistricts: ["Dimapur", "Kohima", "Mokokchung", "Chumoukedima"],
    recommendedProducts: ["Chainsaw", "Pole Pruners", "Brush Cutters", "Hand Tools"],
    adStrategyTip: "Heavy forestry, terrace farming and hillside wood cutting. High demand for durable gasoline chainsaws.",
    seasonalityNotes: "Autumn and winter wood collection."
  },
  "Mizoram": {
    state: "Mizoram",
    zone: "North East",
    topDistricts: ["Aizawl", "Lunglei", "Champhai", "Kolasib"],
    recommendedProducts: ["Chainsaw", "Brush Cutters", "Waterproof Tape"],
    adStrategyTip: "Hilly terrain forestry and bamboo craft. Focus on lightweight power tools and weatherproofing.",
    seasonalityNotes: "Jhum farming and seasonal terrace preparation."
  },
  "Arunachal Pradesh": {
    state: "Arunachal Pradesh",
    zone: "North East",
    topDistricts: ["Papum Pare (Itanagar)", "Changlang", "West Kameng", "Tawang", "East Siang"],
    recommendedProducts: ["Chainsaw", "Snow Chains", "Brush Cutters", "Waterproof Tape"],
    adStrategyTip: "High-altitude mountainous terrain and dense forest cover. Focus on heavy-duty chainsaws, winter snow chains, and emergency repair tapes.",
    seasonalityNotes: "Winter cold and forest management."
  },
  "Sikkim": {
    state: "Sikkim",
    zone: "North East",
    topDistricts: ["East Sikkim (Gangtok)", "South Sikkim (Namchi)", "West Sikkim (Gyalshing)", "North Sikkim (Mangan)"],
    recommendedProducts: ["Brush Cutters", "Hand Tools", "Sprinklers", "Chainsaw"],
    adStrategyTip: "India's 100% organic state. High demand for eco-friendly garden tools, manual sprayers, and horticulture pruners for cardamom and ginger farms.",
    seasonalityNotes: "Spring planting and winter orchard pruning."
  }
};

// Telecom circle 4-digit prefix mapping to Indian States
export const PHONE_PREFIX_TO_STATE: Record<string, string> = {
  // Gujarat
  "9016": "Gujarat", "9714": "Gujarat", "9825": "Gujarat", "9824": "Gujarat", "9879": "Gujarat", "9898": "Gujarat", "9904": "Gujarat", "9909": "Gujarat", "9913": "Gujarat", "9924": "Gujarat", "9925": "Gujarat", "9974": "Gujarat", "9978": "Gujarat", "9979": "Gujarat", "9998": "Gujarat", "9712": "Gujarat", "9723": "Gujarat", "9724": "Gujarat", "9725": "Gujarat", "9726": "Gujarat", "9727": "Gujarat", "9737": "Gujarat", "9601": "Gujarat", "9624": "Gujarat", "9638": "Gujarat", "9662": "Gujarat", "9687": "Gujarat", "9033": "Gujarat", "9081": "Gujarat", "9099": "Gujarat", "9104": "Gujarat", "9106": "Gujarat", "9157": "Gujarat", "9173": "Gujarat", "7016": "Gujarat", "7041": "Gujarat", "7043": "Gujarat", "7046": "Gujarat", "7048": "Gujarat", "7069": "Gujarat", "7096": "Gujarat", "7201": "Gujarat", "7202": "Gujarat", "7203": "Gujarat", "7211": "Gujarat", "7226": "Gujarat", "7227": "Gujarat", "7228": "Gujarat", "7283": "Gujarat", "7284": "Gujarat", "7285": "Gujarat", "7359": "Gujarat", "7383": "Gujarat", "7405": "Gujarat", "7433": "Gujarat", "7434": "Gujarat", "7435": "Gujarat", "7436": "Gujarat", "7567": "Gujarat", "7572": "Gujarat", "7573": "Gujarat", "7574": "Gujarat", "7575": "Gujarat", "7600": "Gujarat", "7621": "Gujarat", "7622": "Gujarat", "7623": "Gujarat", "7698": "Gujarat", "7801": "Gujarat", "7802": "Gujarat", "7817": "Gujarat", "7818": "Gujarat", "7819": "Gujarat", "7874": "Gujarat", "7878": "Gujarat",
  
  // Punjab
  "9914": "Punjab", "9872": "Punjab", "9814": "Punjab", "9417": "Punjab", "9876": "Punjab", "9815": "Punjab", "9878": "Punjab", "9888": "Punjab", "9915": "Punjab", "9988": "Punjab", "9779": "Punjab", "9780": "Punjab", "9781": "Punjab", "9463": "Punjab", "9464": "Punjab", "9465": "Punjab", "8146": "Punjab", "8283": "Punjab", "8284": "Punjab", "8288": "Punjab", "8427": "Punjab", "8437": "Punjab", "8558": "Punjab", "8872": "Punjab", "8968": "Punjab", "9023": "Punjab", "9041": "Punjab", "9056": "Punjab", "9501": "Punjab", "9592": "Punjab", "7009": "Punjab", "7087": "Punjab", "7508": "Punjab", "7528": "Punjab", "7696": "Punjab", "7814": "Punjab", "7837": "Punjab", "7888": "Punjab",

  // Haryana
  "9817": "Haryana", "9812": "Haryana", "9813": "Haryana", "9896": "Haryana", "9991": "Haryana", "9992": "Haryana", "9996": "Haryana", "9728": "Haryana", "9729": "Haryana", "9416": "Haryana", "9466": "Haryana", "9467": "Haryana", "9468": "Haryana", "8053": "Haryana", "8059": "Haryana", "8221": "Haryana", "8222": "Haryana", "8295": "Haryana", "8570": "Haryana", "8607": "Haryana", "8683": "Haryana", "8684": "Haryana", "8685": "Haryana", "8813": "Haryana", "8814": "Haryana", "8816": "Haryana", "8818": "Haryana", "8901": "Haryana", "8930": "Haryana", "8950": "Haryana", "9034": "Haryana", "9050": "Haryana", "9053": "Haryana", "9068": "Haryana", "9671": "Haryana", "7015": "Haryana", "7027": "Haryana", "7056": "Haryana", "7082": "Haryana", "7206": "Haryana", "7404": "Haryana", "7419": "Haryana", "7988": "Haryana",

  // Delhi NCR
  "9818": "Delhi", "9810": "Delhi", "9811": "Delhi", "9871": "Delhi", "9873": "Delhi", "9891": "Delhi", "9899": "Delhi", "9910": "Delhi", "9911": "Delhi", "9953": "Delhi", "9958": "Delhi", "9971": "Delhi", "9990": "Delhi", "9999": "Delhi", "9711": "Delhi", "9717": "Delhi", "9718": "Delhi", "9650": "Delhi", "9654": "Delhi", "9560": "Delhi", "9582": "Delhi", "9599": "Delhi", "8800": "Delhi", "8826": "Delhi", "8860": "Delhi", "8527": "Delhi", "8588": "Delhi", "8447": "Delhi", "8448": "Delhi", "8076": "Delhi", "7011": "Delhi", "7042": "Delhi", "7838": "Delhi", "7290": "Delhi", "7428": "Delhi", "7678": "Delhi",

  // Himachal Pradesh
  "9805": "Himachal Pradesh", "9816": "Himachal Pradesh", "9882": "Himachal Pradesh", "9418": "Himachal Pradesh", "9459": "Himachal Pradesh", "8219": "Himachal Pradesh", "8350": "Himachal Pradesh", "8351": "Himachal Pradesh", "8352": "Himachal Pradesh", "8580": "Himachal Pradesh", "8626": "Himachal Pradesh", "8627": "Himachal Pradesh", "8628": "Himachal Pradesh", "8629": "Himachal Pradesh", "8679": "Himachal Pradesh", "8894": "Himachal Pradesh", "8988": "Himachal Pradesh", "9015": "Himachal Pradesh", "7018": "Himachal Pradesh", "7807": "Himachal Pradesh", "7831": "Himachal Pradesh", "7832": "Himachal Pradesh", "7833": "Himachal Pradesh", "7876": "Himachal Pradesh",

  // Jammu & Kashmir
  "7889": "Jammu and Kashmir", "9419": "Jammu and Kashmir", "9469": "Jammu and Kashmir", "9622": "Jammu and Kashmir", "9796": "Jammu and Kashmir", "9797": "Jammu and Kashmir", "9858": "Jammu and Kashmir", "9906": "Jammu and Kashmir", "8491": "Jammu and Kashmir", "8492": "Jammu and Kashmir", "8493": "Jammu and Kashmir", "8713": "Jammu and Kashmir", "8715": "Jammu and Kashmir", "8716": "Jammu and Kashmir", "8717": "Jammu and Kashmir", "8803": "Jammu and Kashmir", "8825": "Jammu and Kashmir", "8899": "Jammu and Kashmir", "9018": "Jammu and Kashmir", "9055": "Jammu and Kashmir", "9070": "Jammu and Kashmir", "9086": "Jammu and Kashmir", "9103": "Jammu and Kashmir", "9149": "Jammu and Kashmir", "9596": "Jammu and Kashmir", "9682": "Jammu and Kashmir", "9697": "Jammu and Kashmir", "7006": "Jammu and Kashmir", "7051": "Jammu and Kashmir",

  // Karnataka
  "9148": "Karnataka", "9845": "Karnataka", "9844": "Karnataka", "9880": "Karnataka", "9886": "Karnataka", "9900": "Karnataka", "9901": "Karnataka", "9902": "Karnataka", "9916": "Karnataka", "9945": "Karnataka", "9972": "Karnataka", "9980": "Karnataka", "9986": "Karnataka", "9731": "Karnataka", "9738": "Karnataka", "9739": "Karnataka", "9740": "Karnataka", "9741": "Karnataka", "9742": "Karnataka", "9743": "Karnataka", "9611": "Karnataka", "9620": "Karnataka", "9632": "Karnataka", "9663": "Karnataka", "9686": "Karnataka", "9008": "Karnataka", "9019": "Karnataka", "9035": "Karnataka", "9036": "Karnataka", "9066": "Karnataka", "9071": "Karnataka", "9108": "Karnataka", "9110": "Karnataka", "9113": "Karnataka", "9141": "Karnataka", "9164": "Karnataka", "9241": "Karnataka", "9242": "Karnataka", "9243": "Karnataka", "9341": "Karnataka", "9342": "Karnataka", "9343": "Karnataka", "9353": "Karnataka", "9379": "Karnataka", "9380": "Karnataka", "9448": "Karnataka", "9449": "Karnataka", "9480": "Karnataka", "9481": "Karnataka", "9482": "Karnataka", "9483": "Karnataka", "9535": "Karnataka", "9538": "Karnataka", "9590": "Karnataka", "9591": "Karnataka", "7019": "Karnataka", "7022": "Karnataka", "7026": "Karnataka", "7090": "Karnataka", "7204": "Karnataka", "7259": "Karnataka", "7337": "Karnataka", "7338": "Karnataka", "7348": "Karnataka", "7349": "Karnataka", "7353": "Karnataka", "7406": "Karnataka", "7411": "Karnataka", "7483": "Karnataka", "7618": "Karnataka", "7619": "Karnataka", "7624": "Karnataka", "7625": "Karnataka", "7676": "Karnataka", "7760": "Karnataka", "7795": "Karnataka", "7829": "Karnataka", "7846": "Karnataka", "7847": "Karnataka", "7848": "Karnataka", "7849": "Karnataka", "7892": "Karnataka", "7899": "Karnataka",

  // Tamil Nadu
  "9840": "Tamil Nadu", "9841": "Tamil Nadu", "9842": "Tamil Nadu", "9843": "Tamil Nadu", "9865": "Tamil Nadu", "9884": "Tamil Nadu", "9894": "Tamil Nadu", "9940": "Tamil Nadu", "9941": "Tamil Nadu", "9942": "Tamil Nadu", "9943": "Tamil Nadu", "9944": "Tamil Nadu", "9952": "Tamil Nadu", "9962": "Tamil Nadu", "9965": "Tamil Nadu", "9994": "Tamil Nadu", "9710": "Tamil Nadu", "9750": "Tamil Nadu", "9751": "Tamil Nadu", "9786": "Tamil Nadu", "9787": "Tamil Nadu", "9788": "Tamil Nadu", "9789": "Tamil Nadu", "9790": "Tamil Nadu", "9791": "Tamil Nadu", "9600": "Tamil Nadu", "9626": "Tamil Nadu", "9629": "Tamil Nadu", "9655": "Tamil Nadu", "9677": "Tamil Nadu", "9003": "Tamil Nadu", "9025": "Tamil Nadu", "9042": "Tamil Nadu", "9043": "Tamil Nadu", "9047": "Tamil Nadu", "9080": "Tamil Nadu", "9087": "Tamil Nadu", "9092": "Tamil Nadu", "9094": "Tamil Nadu", "9150": "Tamil Nadu", "9159": "Tamil Nadu", "9171": "Tamil Nadu", "9176": "Tamil Nadu", "9442": "Tamil Nadu", "9443": "Tamil Nadu", "9444": "Tamil Nadu", "9445": "Tamil Nadu", "9486": "Tamil Nadu", "9487": "Tamil Nadu", "9488": "Tamil Nadu", "9489": "Tamil Nadu", "9500": "Tamil Nadu", "9514": "Tamil Nadu", "9524": "Tamil Nadu", "9543": "Tamil Nadu", "9566": "Tamil Nadu", "9585": "Tamil Nadu", "9597": "Tamil Nadu", "7010": "Tamil Nadu", "7092": "Tamil Nadu", "7094": "Tamil Nadu", "7200": "Tamil Nadu", "7299": "Tamil Nadu", "7305": "Tamil Nadu", "7358": "Tamil Nadu", "7373": "Tamil Nadu", "7395": "Tamil Nadu", "7397": "Tamil Nadu", "7401": "Tamil Nadu", "7402": "Tamil Nadu", "7418": "Tamil Nadu", "7449": "Tamil Nadu", "7530": "Tamil Nadu", "7538": "Tamil Nadu", "7539": "Tamil Nadu", "7540": "Tamil Nadu", "7548": "Tamil Nadu", "7550": "Tamil Nadu", "7598": "Tamil Nadu", "7601": "Tamil Nadu", "7603": "Tamil Nadu", "7604": "Tamil Nadu", "7639": "Tamil Nadu", "7667": "Tamil Nadu", "7695": "Tamil Nadu", "7708": "Tamil Nadu", "7806": "Tamil Nadu", "7810": "Tamil Nadu", "7811": "Tamil Nadu", "7812": "Tamil Nadu", "7824": "Tamil Nadu", "7825": "Tamil Nadu", "7826": "Tamil Nadu", "7845": "Tamil Nadu", "7867": "Tamil Nadu", "7868": "Tamil Nadu", "7871": "Tamil Nadu",

  // Andhra Pradesh & Telangana
  "7386": "Andhra Pradesh", "8019": "Andhra Pradesh", "9848": "Andhra Pradesh", "9849": "Andhra Pradesh", "9866": "Andhra Pradesh", "9885": "Andhra Pradesh", "9908": "Andhra Pradesh", "9912": "Andhra Pradesh", "9948": "Andhra Pradesh", "9949": "Andhra Pradesh", "9951": "Andhra Pradesh", "9959": "Andhra Pradesh", "9963": "Andhra Pradesh", "9966": "Andhra Pradesh", "9985": "Andhra Pradesh", "9989": "Andhra Pradesh", "9700": "Andhra Pradesh", "9701": "Andhra Pradesh", "9703": "Andhra Pradesh", "9704": "Andhra Pradesh", "9705": "Andhra Pradesh", "9603": "Andhra Pradesh", "9618": "Andhra Pradesh", "9640": "Andhra Pradesh", "9642": "Andhra Pradesh", "9652": "Andhra Pradesh", "9666": "Andhra Pradesh", "9676": "Andhra Pradesh", "9000": "Andhra Pradesh", "9010": "Andhra Pradesh", "9014": "Andhra Pradesh", "9030": "Andhra Pradesh", "9032": "Andhra Pradesh", "9052": "Andhra Pradesh", "9059": "Andhra Pradesh", "9063": "Andhra Pradesh", "9100": "Andhra Pradesh", "9121": "Andhra Pradesh", "9133": "Andhra Pradesh", "9154": "Andhra Pradesh", "9160": "Andhra Pradesh", "9177": "Andhra Pradesh", "9182": "Andhra Pradesh",

  // Maharashtra
  "9822": "Maharashtra", "9823": "Maharashtra", "9850": "Maharashtra", "9860": "Maharashtra", "9881": "Maharashtra", "9890": "Maharashtra", "9921": "Maharashtra", "9922": "Maharashtra", "9923": "Maharashtra", "9960": "Maharashtra", "9970": "Maharashtra", "9975": "Maharashtra", "9730": "Maharashtra", "9762": "Maharashtra", "9763": "Maharashtra", "9764": "Maharashtra", "9765": "Maharashtra", "9766": "Maharashtra", "9767": "Maharashtra", "9820": "Maharashtra", "9821": "Maharashtra", "9819": "Maharashtra", "9833": "Maharashtra", "9867": "Maharashtra", "9869": "Maharashtra", "9892": "Maharashtra", "9920": "Maharashtra", "9930": "Maharashtra", "9967": "Maharashtra", "9969": "Maharashtra", "9987": "Maharashtra", "9004": "Maharashtra", "9022": "Maharashtra", "9029": "Maharashtra", "9082": "Maharashtra", "9136": "Maharashtra", "9137": "Maharashtra", "9152": "Maharashtra", "9167": "Maharashtra", "9503": "Maharashtra", "9511": "Maharashtra", "9518": "Maharashtra", "9527": "Maharashtra", "9545": "Maharashtra", "9552": "Maharashtra", "7020": "Maharashtra", "7028": "Maharashtra", "7030": "Maharashtra", "7038": "Maharashtra", "7057": "Maharashtra", "7058": "Maharashtra", "7066": "Maharashtra", "7083": "Maharashtra", "7218": "Maharashtra", "7219": "Maharashtra", "7249": "Maharashtra", "7276": "Maharashtra", "7350": "Maharashtra", "7385": "Maharashtra", "7387": "Maharashtra", "7410": "Maharashtra", "7420": "Maharashtra", "7447": "Maharashtra", "7448": "Maharashtra", "7498": "Maharashtra", "7499": "Maharashtra", "7507": "Maharashtra", "7517": "Maharashtra", "7588": "Maharashtra", "7620": "Maharashtra", "7666": "Maharashtra", "7709": "Maharashtra", "7719": "Maharashtra", "7720": "Maharashtra", "7721": "Maharashtra", "7722": "Maharashtra", "7741": "Maharashtra", "7743": "Maharashtra", "7744": "Maharashtra", "7745": "Maharashtra", "7755": "Maharashtra", "7756": "Maharashtra", "7757": "Maharashtra", "7758": "Maharashtra", "7767": "Maharashtra", "7768": "Maharashtra", "7769": "Maharashtra", "7770": "Maharashtra", "7773": "Maharashtra", "7774": "Maharashtra", "7775": "Maharashtra", "7776": "Maharashtra",

  // UP
  "7500": "Uttar Pradesh", "8958": "Uttar Pradesh", "9837": "Uttar Pradesh", "9838": "Uttar Pradesh", "9839": "Uttar Pradesh", "9889": "Uttar Pradesh", "9897": "Uttar Pradesh", "9917": "Uttar Pradesh", "9918": "Uttar Pradesh", "9919": "Uttar Pradesh", "9927": "Uttar Pradesh", "9935": "Uttar Pradesh", "9936": "Uttar Pradesh", "9956": "Uttar Pradesh", "9997": "Uttar Pradesh", "9719": "Uttar Pradesh", "9720": "Uttar Pradesh", "9721": "Uttar Pradesh", "9756": "Uttar Pradesh", "9758": "Uttar Pradesh", "9759": "Uttar Pradesh", "9760": "Uttar Pradesh", "9761": "Uttar Pradesh", "9792": "Uttar Pradesh", "9793": "Uttar Pradesh", "9794": "Uttar Pradesh", "9795": "Uttar Pradesh", "9410": "Uttar Pradesh", "9411": "Uttar Pradesh", "9412": "Uttar Pradesh", "9415": "Uttar Pradesh", "9450": "Uttar Pradesh", "9451": "Uttar Pradesh", "9452": "Uttar Pradesh", "9453": "Uttar Pradesh", "9454": "Uttar Pradesh", "9455": "Uttar Pradesh", "9456": "Uttar Pradesh", "9457": "Uttar Pradesh", "9458": "Uttar Pradesh",

  // Kerala
  "9846": "Kerala", "9847": "Kerala", "9895": "Kerala", "9946": "Kerala", "9947": "Kerala", "9961": "Kerala", "9995": "Kerala", "9744": "Kerala", "9745": "Kerala", "9746": "Kerala", "9747": "Kerala", "9605": "Kerala", "9633": "Kerala", "9645": "Kerala", "9656": "Kerala", "9400": "Kerala", "9446": "Kerala", "9447": "Kerala", "9495": "Kerala", "9496": "Kerala", "9497": "Kerala", "9020": "Kerala", "9037": "Kerala", "9048": "Kerala", "9061": "Kerala", "9072": "Kerala", "9074": "Kerala", "9142": "Kerala", "9188": "Kerala", "9207": "Kerala", "9249": "Kerala", "9349": "Kerala", "9387": "Kerala", "9388": "Kerala", "9526": "Kerala", "9539": "Kerala", "9544": "Kerala", "9562": "Kerala", "9567": "Kerala", "7012": "Kerala", "7025": "Kerala", "7034": "Kerala", "7293": "Kerala", "7306": "Kerala", "7356": "Kerala", "7510": "Kerala", "7511": "Kerala", "7558": "Kerala", "7559": "Kerala", "7560": "Kerala", "7561": "Kerala", "7591": "Kerala", "7592": "Kerala", "7593": "Kerala", "7594": "Kerala", "7736": "Kerala", "7902": "Kerala", "7907": "Kerala", "7909": "Kerala", "7994": "Kerala"
};

export interface AggregatedGeoRow {
  state: string;
  zone: string;
  isIndianState: boolean;
  spend: number;
  leads: number;
  whatsAppLeads: number;
  totalInboundDemand: number;
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
    totalWhatsAppLeads: number;
    avgCpl: number;
    topStateByVolume: string;
    topStateByEfficiency: string;
    totalStatesActive: number;
    selectedTimeRange: string;
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

export async function getGeographicalReport(timeRange: "all" | "90d" | "30d" = "all"): Promise<GeoReportData> {
  let targetDate = new Date("2020-01-01T00:00:00.000Z");
  if (timeRange === "90d") {
    targetDate = new Date("2026-07-01T00:00:00.000Z");
  } else if (timeRange === "30d") {
    targetDate = new Date("2026-10-01T00:00:00.000Z");
  }

  // Fetch metrics matching date
  let metrics = await prisma.geoMetric.findMany({
    where: { date: targetDate }
  });

  // If no metrics for specific preset, fallback to all metrics
  if (metrics.length === 0) {
    metrics = await prisma.geoMetric.findMany({
      where: { date: new Date("2020-01-01T00:00:00.000Z") }
    });
    if (metrics.length === 0) {
      metrics = await prisma.geoMetric.findMany();
    }
  }

  // Fetch WhatsApp leads to compute direct attribution by state
  const allLeads = await prisma.lead.findMany({
    include: {
      adSet: {
        include: { campaign: true }
      }
    }
  });

  const whatsAppByState: Record<string, number> = {};
  let totalWhatsAppLeads = 0;

  for (const l of allLeads) {
    let resolvedState: string | null = null;

    // Check phone prefix
    const match = l.contactRef.match(/\+91([6-9]\d{3})/);
    if (match && PHONE_PREFIX_TO_STATE[match[1]]) {
      resolvedState = PHONE_PREFIX_TO_STATE[match[1]];
    }

    // Fallback to campaign region if unmapped
    if (!resolvedState && l.adSet?.campaign?.region) {
      const reg = l.adSet.campaign.region.toLowerCase();
      if (reg.includes("west")) resolvedState = "Maharashtra";
      else if (reg.includes("north")) resolvedState = "Punjab";
    }

    if (resolvedState) {
      whatsAppByState[resolvedState] = (whatsAppByState[resolvedState] || 0) + 1;
      totalWhatsAppLeads++;
    }
  }

  // Aggregate by state
  const stateMap: Record<string, { spend: number; leads: number }> = {};
  let totalSpend = 0;
  let totalMetaLeads = 0;

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
    totalMetaLeads += leads;
  }

  // Build state rows
  const states: AggregatedGeoRow[] = Object.entries(stateMap)
    .filter(([state, data]) => {
      // Exclude obvious foreign or test regions from primary view
      const isKnownIndian = !!INDIAN_STATE_INTELLIGENCE[state];
      return isKnownIndian || data.leads > 5;
    })
    .map(([state, data]) => {
      const isIndianState = !!INDIAN_STATE_INTELLIGENCE[state];
      const intel = INDIAN_STATE_INTELLIGENCE[state] || {
        state,
        zone: "North",
        topDistricts: ["Major District Centers"],
        recommendedProducts: ["Gardena & BKR Complete Kits"],
        adStrategyTip: "Test broad audience targeting with localized Hindi/English copy.",
        seasonalityNotes: "Standard seasonal demand."
      };

      const cpl = data.leads > 0 ? Math.round(data.spend / data.leads) : 0;
      const sharePct = totalMetaLeads > 0 ? Math.round((data.leads / totalMetaLeads) * 1000) / 10 : 0;
      const whatsAppCount = whatsAppByState[state] || 0;
      const totalInboundDemand = data.leads + whatsAppCount;

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
        isIndianState,
        spend: Math.round(data.spend),
        leads: data.leads,
        whatsAppLeads: whatsAppCount,
        totalInboundDemand,
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
  for (const s of states.filter(s => s.isIndianState)) {
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
      sharePct: totalMetaLeads > 0 ? Math.round((data.leads / totalMetaLeads) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.leads - a.leads);

  const topStateByVolume = states[0]?.state || "Maharashtra";
  const efficientStates = states.filter(s => s.leads >= 30 && s.cpl > 0).sort((a, b) => a.cpl - b.cpl);
  const topStateByEfficiency = efficientStates[0]?.state || "Himachal Pradesh";

  return {
    summary: {
      totalSpend: Math.round(totalSpend),
      totalLeads: totalMetaLeads,
      totalWhatsAppLeads,
      avgCpl: totalMetaLeads > 0 ? Math.round(totalSpend / totalMetaLeads) : 0,
      topStateByVolume,
      topStateByEfficiency,
      totalStatesActive: states.length,
      selectedTimeRange: timeRange
    },
    zones,
    states
  };
}
