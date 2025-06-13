import { lemonLawQualificationTool } from '../tools';
import fs from 'fs';

describe('lemonLawQualificationTool', () => {
  beforeAll(() => {
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, encoding: any) => {
      if (filePath.includes('lemon_rules.json')) {
        return JSON.stringify([
          {
            "manufacturers": [
              "Ford", "GM", "Chrysler", "Honda", "Mazda", "Mercedes Benz",
              "Mitsubishi", "Nissan", "Subaru", "Tata", "Tesla"
            ],
            "rules": [
              {
                "min_repair_orders": 1,
                "max_repair_orders": 2,
                "repair_type": "Any",
                "days_oos": 30,
                "vehicle_age_years": 2,
                "mileage": 24000
              },
              {
                "min_repair_orders": 3,
                "repair_type": "Any",
                "days_oos": "N/A",
                "within_mfr_warranty": true
              },
              {
                "min_repair_orders": 4,
                "repair_type": "Any",
                "days_oos": "N/A",
                "within_mfr_warranty": true
              }
            ]
          },
          {
            "manufacturers": [
              "Hyundai", "Kia", "Toyota", "Volkswagen"
            ],
            "rules": [
              {
                "min_repair_orders": 1,
                "max_repair_orders": 2,
                "repair_type": [
                  "Engine", "Transmission", "Safety Concern"
                ],
                "days_oos": 30,
                "vehicle_age_years": 2,
                "mileage": 24000
              },
              {
                "min_repair_orders": 3,
                "max_repair_orders": 3,
                "repair_type": [
                  "Engine", "Transmission", "Safety Concern"
                ],
                "days_oos": "N/A",
                "within_mfr_warranty": true
              },
              {
                "min_repair_orders": 4,
                "repair_type": "Any",
                "days_oos": "N/A",
                "within_mfr_warranty": true
              }
            ]
          }
        ]);
      }
      return '';
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return qualified for a Ford with 2 repairs, 35 days OOS, 2024, 15k miles', async () => {
    const result = await lemonLawQualificationTool.invoke({
      manufacturer: "Ford",
      repairOrders: 2,
      repairType: "Any",
      daysOOS: 35,
      vehicleAgeYears: 0,
      mileage: 15000,
      withinMfrWarranty: false
    });
    expect(result.qualified).toBe(true);
    expect(result.reason).toBe("Qualified for lemon law.");
  });

  it('should return not qualified for a Kia with 3 repairs, electric issues, 2022, 70k miles', async () => {
    const result = await lemonLawQualificationTool.invoke({
      manufacturer: "Kia",
      repairOrders: 3,
      repairType: "Electric",
      daysOOS: 0,
      vehicleAgeYears: 2,
      mileage: 70000,
      withinMfrWarranty: false
    });
    expect(result.qualified).toBe(false);
    expect(result.reason).toBe("Not qualified for lemon law.");
  });

  it('should return qualified for a Nissan with 4 repairs, all under warranty', async () => {
    const result = await lemonLawQualificationTool.invoke({
      manufacturer: "Nissan",
      repairOrders: 4,
      repairType: "Any",
      daysOOS: 0,
      vehicleAgeYears: 1,
      mileage: 10000,
      withinMfrWarranty: true
    });
    expect(result.qualified).toBe(true);
    expect(result.reason).toBe("Qualified for lemon law.");
  });
}); 