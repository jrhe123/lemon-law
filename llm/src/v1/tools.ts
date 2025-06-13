import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";

// brand normalization map
const brandMap: Record<string, string> = {
  "benz": "Mercedes Benz",
  "mercedes": "Mercedes Benz",
  "mercedes benz": "Mercedes Benz",
  "mercedes-benz": "Mercedes Benz",
  "mb": "Mercedes Benz",
  "gm": "GM",
  "general motors": "GM",
  "vw": "Volkswagen",
  "kia": "Kia",
  "ford": "Ford",
  "chrysler": "Chrysler",
  "honda": "Honda",
  "mazda": "Mazda",
  "mitsubishi": "Mitsubishi",
  "nissan": "Nissan",
  "subaru": "Subaru",
  "tata": "Tata",
  "tesla": "Tesla",
  "hyundai": "Hyundai",
  "toyota": "Toyota",
  "volkswagen": "Volkswagen"
};

// standard brand names list
const allStandardBrands = [
  "Ford", "GM", "Chrysler", "Honda", "Mazda", "Mercedes Benz",
  "Mitsubishi", "Nissan", "Subaru", "Tata", "Tesla",
  "Hyundai", "Kia", "Toyota", "Volkswagen"
];

// brand normalization method
export function normalizeBrand(userInput: string): string {
  const inputClean = userInput.trim().toLowerCase();
  if (brandMap[inputClean]) {
    return brandMap[inputClean];
  }
  // fallback: iterate through all standard brand names, do contains check
  for (const brand of allStandardBrands) {
    if (brand.toLowerCase().includes(inputClean)) {
      return brand;
    }
  }
  return userInput;
}


// determine if the user's vehicle information qualifies for lemon law
export const lemonLawQualificationTool = tool(
  async ({
    manufacturer,
    repairOrders,
    repairType,
    daysOOS,
    vehicleAgeYears,
    mileage,
    withinMfrWarranty
  }: {
    manufacturer: string,
    repairOrders: number,
    repairType: string,
    daysOOS: number,
    vehicleAgeYears: number,
    mileage: number,
    withinMfrWarranty: boolean
  }) => {
    const rulesPath = path.resolve(__dirname, "../lemon_rules.json");
    const rulesData = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
    const brand = normalizeBrand(manufacturer);
    const group = rulesData.find((g: any) =>
      g.manufacturers.map((m: string) => m.toLowerCase()).includes(brand.toLowerCase())
    );
    if (!group) {
      return { qualified: false, reason: `No lemon law rules found for manufacturer: ${brand}.` };
    }
    for (const rule of group.rules) {
      if (rule.min_repair_orders && repairOrders < rule.min_repair_orders) continue;
      if (rule.max_repair_orders && repairOrders > rule.max_repair_orders) continue;
      if (Array.isArray(rule.repair_type)) {
        if (!rule.repair_type.map((t: string) => t.toLowerCase()).includes(repairType.toLowerCase())) continue;
      } else if (rule.repair_type !== "Any" && rule.repair_type.toLowerCase() !== repairType.toLowerCase()) {
        continue;
      }
      if (rule.days_oos && rule.days_oos !== "N/A" && daysOOS < rule.days_oos) continue;
      if (rule.vehicle_age_years && vehicleAgeYears > rule.vehicle_age_years) continue;
      if (rule.mileage && mileage > rule.mileage) continue;
      if (rule.within_mfr_warranty && !withinMfrWarranty) continue;
      return { qualified: true, reason: "Qualified for lemon law." };
    }
    return { qualified: false, reason: "Not qualified for lemon law." };
  },
  {
    name: "lemonLawQualification",
    description: "Determine if the user's vehicle information qualifies for lemon law.",
    schema: z.object({
      manufacturer: z.string().describe("Vehicle manufacturer"),
      repairOrders: z.number().describe("Number of repair orders"),
      repairType: z.string().describe("Type of repair"),
      daysOOS: z.number().describe("Total days out of service"),
      vehicleAgeYears: z.number().describe("Vehicle age in years"),
      mileage: z.number().describe("Vehicle mileage"),
      withinMfrWarranty: z.boolean().describe("Within manufacturer warranty period")
    })
  }
);

