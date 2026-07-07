export const formatNaira = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
};

export const generateReference = () =>
  "NB-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

// Banks now include Paystack bank codes (needed for Transfers API)
export const BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Zenith Bank", code: "057" },
  { name: "GTBank", code: "058" },
  { name: "First Bank", code: "011" },
  { name: "UBA", code: "033" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Union Bank", code: "032" },
  { name: "Sterling Bank", code: "232" },
  { name: "Polaris Bank", code: "076" },
  { name: "Wema Bank", code: "035" },
  { name: "Stanbic IBTC", code: "221" },
  { name: "FCMB", code: "214" },
  { name: "Ecobank", code: "050" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Providus Bank", code: "101" },
  { name: "Titan Trust Bank", code: "102" },
  { name: "Kuda Bank", code: "50211" },
  { name: "OPay", code: "999992" },
  { name: "Moniepoint", code: "50515" },
  { name: "PalmPay", code: "999991" },
  { name: "Carbon", code: "565" },
  { name: "VFD Microfinance Bank", code: "566" },
];

export const BILL_TYPES = [
  { id: "electricity", label: "Electricity", icon: "⚡", providers: ["EKEDC", "IKEDC", "AEDC", "PHEDC", "BEDC", "EEDC"] },
  { id: "water", label: "Water Bill", icon: "💧", providers: ["Lagos Water Corp", "FCT Water Board", "Rivers RUWASA"] },
  { id: "cable", label: "Cable TV", icon: "📺", providers: ["DSTV", "GOtv", "StarTimes"] },
  { id: "internet", label: "Internet", icon: "🌐", providers: ["Spectranet", "Smile", "ipNX", "MTN Broadband", "Airtel Broadband"] },
];

export const RECHARGE_NETWORKS = [
  { id: "mtn", label: "MTN", color: "#FFCC00" },
  { id: "airtel", label: "Airtel", color: "#FF0000" },
  { id: "glo", label: "Glo", color: "#00AA00" },
  { id: "9mobile", label: "9mobile", color: "#00AA88" },
];

export const RECHARGE_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export const SAVINGS_PLANS = [
  { id: "flexi", name: "Flexi Save", rate: "8%", duration: "Anytime", min: 1000,
    description: "Save anytime, withdraw anytime. Low rate but maximum flexibility." },
  { id: "target", name: "Target Save", rate: "12%", duration: "3-12 months", min: 5000,
    description: "Set a savings goal and watch your money grow with higher interest." },
  { id: "fixed", name: "Fixed Lock", rate: "18%", duration: "12 months", min: 50000,
    description: "Lock funds for 12 months and earn our highest interest rate." },
];
