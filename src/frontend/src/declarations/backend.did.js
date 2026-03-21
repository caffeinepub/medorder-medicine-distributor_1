/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

export const CustomerType = IDL.Variant({
  'hospital' : IDL.Null,
  'doctor' : IDL.Null,
  'medicalStore' : IDL.Null,
  'pharmacy' : IDL.Null,
});
export const EstimatedOrderItem = IDL.Record({
  'distributionDiscount' : IDL.Nat,
  'companyDiscount' : IDL.Nat,
  'netRate' : IDL.Nat,
  'discountPercent' : IDL.Nat,
  'bonusQty' : IDL.Nat,
  'quantity' : IDL.Float64,
  'unitPrice' : IDL.Nat,
  'medicineId' : IDL.Nat,
  'medicineName' : IDL.Text,
});
export const PakkaBillItem = IDL.Record({
  'companyDiscount' : IDL.Nat,
  'totalValue' : IDL.Float64,
  'netRate' : IDL.Nat,
  'quantity' : IDL.Float64,
  'medicineId' : IDL.Nat,
  'medicineName' : IDL.Text,
});
export const MedicineItem = IDL.Record({
  'distributionDiscount' : IDL.Nat,
  'companyDiscount' : IDL.Nat,
  'netRate' : IDL.Nat,
  'discountPercent' : IDL.Nat,
  'bonusQty' : IDL.Nat,
  'quantity' : IDL.Float64,
  'medicineId' : IDL.Nat,
});
export const OrderStatus = IDL.Variant({
  'pending' : IDL.Null,
  'delivered' : IDL.Null,
  'confirmed' : IDL.Null,
});
export const Principal = IDL.Principal;
export const Time = IDL.Int;
export const ReturnItem = IDL.Record({
  'medicineId' : IDL.Nat,
  'returnedQty' : IDL.Nat,
});
export const OrderRecord = IDL.Record({
  'id' : IDL.Nat,
  'status' : OrderStatus,
  'staffCode' : IDL.Text,
  'staffName' : IDL.Text,
  'staffId' : Principal,
  'returnReason' : IDL.Text,
  'pharmacyCode' : IDL.Text,
  'notes' : IDL.Text,
  'timestamp' : Time,
  'orderLines' : IDL.Vec(MedicineItem),
  'paymentReceived' : IDL.Nat,
  'pharmacyId' : IDL.Nat,
  'returnItems' : IDL.Vec(ReturnItem),
});
export const StaffLocation = IDL.Record({
  'lat' : IDL.Float64,
  'lng' : IDL.Float64,
  'username' : IDL.Text,
  'role' : IDL.Text,
  'updatedAt' : IDL.Text,
  'accuracy' : IDL.Float64,
});
export const Customer = IDL.Record({
  'id' : IDL.Nat,
  'ntn' : IDL.Text,
  'customerType' : CustomerType,
  'area' : IDL.Text,
  'cnic' : IDL.Text,
  'code' : IDL.Text,
  'name' : IDL.Text,
  'address' : IDL.Text,
  'timestamp' : Time,
  'contactNo' : IDL.Text,
  'groupName' : IDL.Text,
});
export const Distributor = IDL.Record({
  'id' : IDL.Nat,
  'name' : IDL.Text,
  'createdAt' : Time,
  'adminUsername' : IDL.Text,
  'adminPassword' : IDL.Text,
});
export const StaffRecord = IDL.Record({
  'id' : IDL.Nat,
  'distributorId' : IDL.Nat,
  'username' : IDL.Text,
  'password' : IDL.Text,
  'role' : IDL.Text,
  'displayName' : IDL.Text,
});
export const StaffLoginResult = IDL.Record({
  'distributorId' : IDL.Nat,
  'role' : IDL.Text,
  'displayName' : IDL.Text,
  'staffId' : IDL.Nat,
});
export const DistributorStats = IDL.Record({
  'orderCount' : IDL.Nat,
  'staffCount' : IDL.Nat,
  'medicineCount' : IDL.Nat,
  'pharmacyCount' : IDL.Nat,
});
export const EstimatedOrder = IDL.Record({
  'id' : IDL.Nat,
  'staffName' : IDL.Text,
  'staffId' : IDL.Text,
  'distributorId' : IDL.Text,
  'pharmacyName' : IDL.Text,
  'timestamp' : Time,
  'pharmacyId' : IDL.Text,
  'items' : IDL.Vec(EstimatedOrderItem),
});
export const Medicine = IDL.Record({
  'id' : IDL.Nat,
  'packSize' : IDL.Text,
  'name' : IDL.Text,
  'description' : IDL.Text,
  'company' : IDL.Text,
  'strength' : IDL.Text,
  'genericName' : IDL.Text,
  'batchNo' : IDL.Text,
  'price' : IDL.Nat,
  'medicineType' : IDL.Text,
});
export const PakkaBill = IDL.Record({
  'id' : IDL.Nat,
  'masterCustomerName' : IDL.Text,
  'masterCustomerId' : IDL.Text,
  'distributorId' : IDL.Text,
  'totalAmount' : IDL.Float64,
  'timestamp' : Time,
  'items' : IDL.Vec(PakkaBillItem),
});
export const PaymentRecord = IDL.Record({
  'id' : IDL.Nat,
  'staffName' : IDL.Text,
  'date' : IDL.Text,
  'orderId' : IDL.Nat,
  'pharmacyName' : IDL.Text,
  'timestamp' : Time,
  'amount' : IDL.Nat,
});
export const Pharmacy = IDL.Record({
  'id' : IDL.Nat,
  'ntn' : IDL.Text,
  'contact' : IDL.Text,
  'cnic' : IDL.Text,
  'code' : IDL.Text,
  'name' : IDL.Text,
  'location' : IDL.Text,
});
export const PurchaseRecord = IDL.Record({
  'id' : IDL.Nat,
  'packSize' : IDL.Text,
  'productName' : IDL.Text,
  'genericName' : IDL.Text,
  'timestamp' : Time,
  'companyName' : IDL.Text,
  'quantity' : IDL.Nat,
  'batchNo' : IDL.Text,
  'price' : IDL.Nat,
  'medicineType' : IDL.Text,
});

export const idlService = IDL.Service({
  // Legacy functions
  'addCustomer' : IDL.Func([IDL.Text, CustomerType, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'addDistributor' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'addEstimatedOrder' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Vec(EstimatedOrderItem), IDL.Text], [IDL.Nat], []),
  'addMedicine' : IDL.Func([IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'addPakkaBill' : IDL.Func([IDL.Text, IDL.Text, IDL.Vec(PakkaBillItem), IDL.Float64, IDL.Text], [IDL.Nat], []),
  'addPaymentRecord' : IDL.Func([IDL.Text, IDL.Nat, IDL.Nat, IDL.Text, IDL.Text], [IDL.Nat], []),
  'addPharmacy' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'addPurchase' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Nat, IDL.Nat, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'adjustInventoryStock' : IDL.Func([IDL.Nat, IDL.Int], [IDL.Bool], []),
  'changeSuperAdminPassword' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
  'createOrder' : IDL.Func([IDL.Nat, IDL.Vec(MedicineItem), IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'deleteCustomer' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'deleteDistributor' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'deleteEstimatedOrders' : IDL.Func([IDL.Vec(IDL.Nat)], [], []),
  'deleteMedicine' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'deletePakkaBill' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'deletePaymentRecord' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'deletePharmacy' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'deletePurchase' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'getActiveOrders' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
  'getAllStaffLocations' : IDL.Func([], [IDL.Vec(StaffLocation)], ['query']),
  'getAllStaffOrders' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
  'getCustomers' : IDL.Func([], [IDL.Vec(Customer)], ['query']),
  'getDistributorById' : IDL.Func([IDL.Nat], [IDL.Opt(Distributor)], ['query']),
  'getDistributors' : IDL.Func([], [IDL.Vec(Distributor)], ['query']),
  'getEstimatedOrders' : IDL.Func([], [IDL.Vec(EstimatedOrder)], ['query']),
  'getHistoryOrders' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
  'getInventoryStock' : IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Int))], ['query']),
  'getMedicines' : IDL.Func([], [IDL.Vec(Medicine)], ['query']),
  'getOrder' : IDL.Func([IDL.Nat], [IDL.Opt(OrderRecord)], ['query']),
  'getPakkaBills' : IDL.Func([], [IDL.Vec(PakkaBill)], ['query']),
  'getPaymentRecords' : IDL.Func([], [IDL.Vec(PaymentRecord)], ['query']),
  'getPharmacies' : IDL.Func([], [IDL.Vec(Pharmacy)], ['query']),
  'getPurchases' : IDL.Func([], [IDL.Vec(PurchaseRecord)], ['query']),
  'getStaffOrders' : IDL.Func([Principal], [IDL.Vec(OrderRecord)], ['query']),
  'registerStaff' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
  'setInventoryStock' : IDL.Func([IDL.Nat, IDL.Int], [IDL.Bool], []),
  'updateDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
  'updateMedicine' : IDL.Func([IDL.Nat, IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
  'updateOrderLines' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(MedicineItem), IDL.Text], [IDL.Bool], []),
  'updateOrderPaymentAndReturn' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(ReturnItem), IDL.Text], [IDL.Bool], []),
  'updateOrderStatus' : IDL.Func([IDL.Nat, OrderStatus], [IDL.Bool], []),
  'updatePharmacy' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
  'updateStaffLocation' : IDL.Func([IDL.Text, IDL.Text, IDL.Float64, IDL.Float64, IDL.Float64, IDL.Text], [IDL.Bool], []),
  'verifyDistributorLogin' : IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(IDL.Nat)], ['query']),
  'verifyPassword' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], ['query']),
  'verifySuperAdmin' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
  // Multi-tenant Phase 2/3 functions
  'addStaffForDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'getStaffByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(StaffRecord)], ['query']),
  'deleteStaffRecord' : IDL.Func([IDL.Nat], [IDL.Bool], []),
  'updateStaffRecordPassword' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
  'verifyStaffLoginForDistributor' : IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(StaffLoginResult)], ['query']),
  'addPharmacyForDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'getPharmaciesByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(Pharmacy)], ['query']),
  'addMedicineForDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'getMedicinesByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(Medicine)], ['query']),
  'addCustomerForDistributor' : IDL.Func([IDL.Nat, IDL.Text, CustomerType, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'getCustomersByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(Customer)], ['query']),
  'createOrderForDistributor' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(MedicineItem), IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
  'getActiveOrdersByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(OrderRecord)], ['query']),
  'getHistoryOrdersByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(OrderRecord)], ['query']),
  'getOrdersByStaffName' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Vec(OrderRecord)], ['query']),
  'getDistributorStats' : IDL.Func([IDL.Nat], [DistributorStats], ['query']),
  'getAllOrdersForSuperAdmin' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const CustomerType = IDL.Variant({
    'hospital' : IDL.Null,
    'doctor' : IDL.Null,
    'medicalStore' : IDL.Null,
    'pharmacy' : IDL.Null,
  });
  const EstimatedOrderItem = IDL.Record({
    'distributionDiscount' : IDL.Nat,
    'companyDiscount' : IDL.Nat,
    'netRate' : IDL.Nat,
    'discountPercent' : IDL.Nat,
    'bonusQty' : IDL.Nat,
    'quantity' : IDL.Float64,
    'unitPrice' : IDL.Nat,
    'medicineId' : IDL.Nat,
    'medicineName' : IDL.Text,
  });
  const PakkaBillItem = IDL.Record({
    'companyDiscount' : IDL.Nat,
    'totalValue' : IDL.Float64,
    'netRate' : IDL.Nat,
    'quantity' : IDL.Float64,
    'medicineId' : IDL.Nat,
    'medicineName' : IDL.Text,
  });
  const MedicineItem = IDL.Record({
    'distributionDiscount' : IDL.Nat,
    'companyDiscount' : IDL.Nat,
    'netRate' : IDL.Nat,
    'discountPercent' : IDL.Nat,
    'bonusQty' : IDL.Nat,
    'quantity' : IDL.Float64,
    'medicineId' : IDL.Nat,
  });
  const OrderStatus = IDL.Variant({
    'pending' : IDL.Null,
    'delivered' : IDL.Null,
    'confirmed' : IDL.Null,
  });
  const Principal = IDL.Principal;
  const Time = IDL.Int;
  const ReturnItem = IDL.Record({
    'medicineId' : IDL.Nat,
    'returnedQty' : IDL.Nat,
  });
  const OrderRecord = IDL.Record({
    'id' : IDL.Nat,
    'status' : OrderStatus,
    'staffCode' : IDL.Text,
    'staffName' : IDL.Text,
    'staffId' : Principal,
    'returnReason' : IDL.Text,
    'pharmacyCode' : IDL.Text,
    'notes' : IDL.Text,
    'timestamp' : Time,
    'orderLines' : IDL.Vec(MedicineItem),
    'paymentReceived' : IDL.Nat,
    'pharmacyId' : IDL.Nat,
    'returnItems' : IDL.Vec(ReturnItem),
  });
  const StaffLocation = IDL.Record({
    'lat' : IDL.Float64,
    'lng' : IDL.Float64,
    'username' : IDL.Text,
    'role' : IDL.Text,
    'updatedAt' : IDL.Text,
    'accuracy' : IDL.Float64,
  });
  const Customer = IDL.Record({
    'id' : IDL.Nat,
    'ntn' : IDL.Text,
    'customerType' : CustomerType,
    'area' : IDL.Text,
    'cnic' : IDL.Text,
    'code' : IDL.Text,
    'name' : IDL.Text,
    'address' : IDL.Text,
    'timestamp' : Time,
    'contactNo' : IDL.Text,
    'groupName' : IDL.Text,
  });
  const Distributor = IDL.Record({
    'id' : IDL.Nat,
    'name' : IDL.Text,
    'createdAt' : Time,
    'adminUsername' : IDL.Text,
    'adminPassword' : IDL.Text,
  });
  const StaffRecord = IDL.Record({
    'id' : IDL.Nat,
    'distributorId' : IDL.Nat,
    'username' : IDL.Text,
    'password' : IDL.Text,
    'role' : IDL.Text,
    'displayName' : IDL.Text,
  });
  const StaffLoginResult = IDL.Record({
    'distributorId' : IDL.Nat,
    'role' : IDL.Text,
    'displayName' : IDL.Text,
    'staffId' : IDL.Nat,
  });
  const DistributorStats = IDL.Record({
    'orderCount' : IDL.Nat,
    'staffCount' : IDL.Nat,
    'medicineCount' : IDL.Nat,
    'pharmacyCount' : IDL.Nat,
  });
  const EstimatedOrder = IDL.Record({
    'id' : IDL.Nat,
    'staffName' : IDL.Text,
    'staffId' : IDL.Text,
    'distributorId' : IDL.Text,
    'pharmacyName' : IDL.Text,
    'timestamp' : Time,
    'pharmacyId' : IDL.Text,
    'items' : IDL.Vec(EstimatedOrderItem),
  });
  const Medicine = IDL.Record({
    'id' : IDL.Nat,
    'packSize' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'company' : IDL.Text,
    'strength' : IDL.Text,
    'genericName' : IDL.Text,
    'batchNo' : IDL.Text,
    'price' : IDL.Nat,
    'medicineType' : IDL.Text,
  });
  const PakkaBill = IDL.Record({
    'id' : IDL.Nat,
    'masterCustomerName' : IDL.Text,
    'masterCustomerId' : IDL.Text,
    'distributorId' : IDL.Text,
    'totalAmount' : IDL.Float64,
    'timestamp' : Time,
    'items' : IDL.Vec(PakkaBillItem),
  });
  const PaymentRecord = IDL.Record({
    'id' : IDL.Nat,
    'staffName' : IDL.Text,
    'date' : IDL.Text,
    'orderId' : IDL.Nat,
    'pharmacyName' : IDL.Text,
    'timestamp' : Time,
    'amount' : IDL.Nat,
  });
  const Pharmacy = IDL.Record({
    'id' : IDL.Nat,
    'ntn' : IDL.Text,
    'contact' : IDL.Text,
    'cnic' : IDL.Text,
    'code' : IDL.Text,
    'name' : IDL.Text,
    'location' : IDL.Text,
  });
  const PurchaseRecord = IDL.Record({
    'id' : IDL.Nat,
    'packSize' : IDL.Text,
    'productName' : IDL.Text,
    'genericName' : IDL.Text,
    'timestamp' : Time,
    'companyName' : IDL.Text,
    'quantity' : IDL.Nat,
    'batchNo' : IDL.Text,
    'price' : IDL.Nat,
    'medicineType' : IDL.Text,
  });

  return IDL.Service({
    'addCustomer' : IDL.Func([IDL.Text, CustomerType, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'addDistributor' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'addEstimatedOrder' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Vec(EstimatedOrderItem), IDL.Text], [IDL.Nat], []),
    'addMedicine' : IDL.Func([IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'addPakkaBill' : IDL.Func([IDL.Text, IDL.Text, IDL.Vec(PakkaBillItem), IDL.Float64, IDL.Text], [IDL.Nat], []),
    'addPaymentRecord' : IDL.Func([IDL.Text, IDL.Nat, IDL.Nat, IDL.Text, IDL.Text], [IDL.Nat], []),
    'addPharmacy' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'addPurchase' : IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Nat, IDL.Nat, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'adjustInventoryStock' : IDL.Func([IDL.Nat, IDL.Int], [IDL.Bool], []),
    'changeSuperAdminPassword' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'createOrder' : IDL.Func([IDL.Nat, IDL.Vec(MedicineItem), IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'deleteCustomer' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deleteDistributor' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deleteEstimatedOrders' : IDL.Func([IDL.Vec(IDL.Nat)], [], []),
    'deleteMedicine' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deletePakkaBill' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deletePaymentRecord' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deletePharmacy' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'deletePurchase' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'getActiveOrders' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
    'getAllStaffLocations' : IDL.Func([], [IDL.Vec(StaffLocation)], ['query']),
    'getAllStaffOrders' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
    'getCustomers' : IDL.Func([], [IDL.Vec(Customer)], ['query']),
    'getDistributorById' : IDL.Func([IDL.Nat], [IDL.Opt(Distributor)], ['query']),
    'getDistributors' : IDL.Func([], [IDL.Vec(Distributor)], ['query']),
    'getEstimatedOrders' : IDL.Func([], [IDL.Vec(EstimatedOrder)], ['query']),
    'getHistoryOrders' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
    'getInventoryStock' : IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Int))], ['query']),
    'getMedicines' : IDL.Func([], [IDL.Vec(Medicine)], ['query']),
    'getOrder' : IDL.Func([IDL.Nat], [IDL.Opt(OrderRecord)], ['query']),
    'getPakkaBills' : IDL.Func([], [IDL.Vec(PakkaBill)], ['query']),
    'getPaymentRecords' : IDL.Func([], [IDL.Vec(PaymentRecord)], ['query']),
    'getPharmacies' : IDL.Func([], [IDL.Vec(Pharmacy)], ['query']),
    'getPurchases' : IDL.Func([], [IDL.Vec(PurchaseRecord)], ['query']),
    'getStaffOrders' : IDL.Func([Principal], [IDL.Vec(OrderRecord)], ['query']),
    'registerStaff' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'setInventoryStock' : IDL.Func([IDL.Nat, IDL.Int], [IDL.Bool], []),
    'updateDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
    'updateMedicine' : IDL.Func([IDL.Nat, IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
    'updateOrderLines' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(MedicineItem), IDL.Text], [IDL.Bool], []),
    'updateOrderPaymentAndReturn' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(ReturnItem), IDL.Text], [IDL.Bool], []),
    'updateOrderStatus' : IDL.Func([IDL.Nat, OrderStatus], [IDL.Bool], []),
    'updatePharmacy' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Bool], []),
    'updateStaffLocation' : IDL.Func([IDL.Text, IDL.Text, IDL.Float64, IDL.Float64, IDL.Float64, IDL.Text], [IDL.Bool], []),
    'verifyDistributorLogin' : IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(IDL.Nat)], ['query']),
    'verifyPassword' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], ['query']),
    'verifySuperAdmin' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    // Multi-tenant Phase 2/3 functions
    'addStaffForDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'getStaffByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(StaffRecord)], ['query']),
    'deleteStaffRecord' : IDL.Func([IDL.Nat], [IDL.Bool], []),
    'updateStaffRecordPassword' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Bool], []),
    'verifyStaffLoginForDistributor' : IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(StaffLoginResult)], ['query']),
    'addPharmacyForDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'getPharmaciesByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(Pharmacy)], ['query']),
    'addMedicineForDistributor' : IDL.Func([IDL.Nat, IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'getMedicinesByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(Medicine)], ['query']),
    'addCustomerForDistributor' : IDL.Func([IDL.Nat, IDL.Text, CustomerType, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'getCustomersByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(Customer)], ['query']),
    'createOrderForDistributor' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Vec(MedicineItem), IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'getActiveOrdersByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(OrderRecord)], ['query']),
    'getHistoryOrdersByDistributor' : IDL.Func([IDL.Nat], [IDL.Vec(OrderRecord)], ['query']),
    'getOrdersByStaffName' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Vec(OrderRecord)], ['query']),
    'getDistributorStats' : IDL.Func([IDL.Nat], [DistributorStats], ['query']),
    'getAllOrdersForSuperAdmin' : IDL.Func([], [IDL.Vec(OrderRecord)], ['query']),
  });
};

export const init = ({ IDL }) => { return []; };
