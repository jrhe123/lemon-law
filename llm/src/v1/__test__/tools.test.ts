import { lemonLawQualificationTool } from '../tools';

describe('lemonLawQualificationTool', () => {

  it('should return qualified for a Ford with 2 repairs, 35 days OOS, 2024, 15k miles', async () => {
    const resultStr = await lemonLawQualificationTool.invoke({
      manufacturer: "Ford",
      repairOrders: 2,
      repairType: "Any",
      daysOOS: 35,
      vehicleAgeYears: 1,
      mileage: 15000,
      withinMfrWarranty: false
    });
    const result = JSON.parse(resultStr);
    expect(result.qualified).toBe(true);
    expect(result.reason).toBe("Qualified for lemon law.");
  });

  it('should return not qualified for a Kia with 3 repairs, electric issues, 2022, 70k miles', async () => {
    const resultStr = await lemonLawQualificationTool.invoke({
      manufacturer: "Kia",
      repairOrders: 3,
      repairType: "Electric",
      daysOOS: 0,
      vehicleAgeYears: 3,
      mileage: 70000,
      withinMfrWarranty: false
    });
    const result = JSON.parse(resultStr);
    expect(result.qualified).toBe(false);
    expect(result.reason).toBe("Not qualified for lemon law.");
  });

  it('should return qualified for a Nissan with 4 repairs, all under warranty', async () => {
    const resultStr = await lemonLawQualificationTool.invoke({
      manufacturer: "Nissan",
      repairOrders: 4,
      repairType: "Any",
      daysOOS: 0,
      vehicleAgeYears: 1,
      mileage: 10000,
      withinMfrWarranty: true
    });
    const result = JSON.parse(resultStr);
    expect(result.qualified).toBe(true);
    expect(result.reason).toBe("Qualified for lemon law.");
  });
}); 