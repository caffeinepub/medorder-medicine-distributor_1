/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface Customer {
  'id' : bigint,
  'ntn' : string,
  'customerType' : CustomerType,
  'area' : string,
  'cnic' : string,
  'code' : string,
  'name' : string,
  'address' : string,
  'timestamp' : Time,
  'contactNo' : string,
  'groupName' : string,
}
export type CustomerType = { 'hospital' : null } |
  { 'doctor' : null } |
  { 'medicalStore' : null } |
  { 'pharmacy' : null };
export interface Distributor {
  'id' : bigint,
  'name' : string,
  'createdAt' : Time,
  'adminUsername' : string,
  'adminPassword' : string,
}
export interface DistributorStats {
  'orderCount' : bigint,
  'staffCount' : bigint,
  'medicineCount' : bigint,
  'pharmacyCount' : bigint,
}
export interface StaffRecord {
  'id' : bigint,
  'distributorId' : bigint,
  'username' : string,
  'password' : string,
  'role' : string,
  'displayName' : string,
}
export interface StaffLoginResult {
  'distributorId' : bigint,
  'role' : string,
  'displayName' : string,
  'staffId' : bigint,
}
export interface EstimatedOrder {
  'id' : bigint,
  'staffName' : string,
  'staffId' : string,
  'distributorId' : string,
  'pharmacyName' : string,
  'timestamp' : Time,
  'pharmacyId' : string,
  'items' : Array<EstimatedOrderItem>,
}
export interface EstimatedOrderItem {
  'distributionDiscount' : bigint,
  'companyDiscount' : bigint,
  'netRate' : bigint,
  'discountPercent' : bigint,
  'bonusQty' : bigint,
  'quantity' : number,
  'unitPrice' : bigint,
  'medicineId' : bigint,
  'medicineName' : string,
}
export interface Medicine {
  'id' : bigint,
  'packSize' : string,
  'name' : string,
  'description' : string,
  'company' : string,
  'strength' : string,
  'genericName' : string,
  'batchNo' : string,
  'price' : bigint,
  'medicineType' : string,
}
export interface MedicineItem {
  'distributionDiscount' : bigint,
  'companyDiscount' : bigint,
  'netRate' : bigint,
  'discountPercent' : bigint,
  'bonusQty' : bigint,
  'quantity' : number,
  'medicineId' : bigint,
}
export interface OrderRecord {
  'id' : bigint,
  'status' : OrderStatus,
  'staffCode' : string,
  'staffName' : string,
  'staffId' : Principal,
  'returnReason' : string,
  'pharmacyCode' : string,
  'notes' : string,
  'timestamp' : Time,
  'orderLines' : Array<MedicineItem>,
  'paymentReceived' : bigint,
  'pharmacyId' : bigint,
  'returnItems' : Array<ReturnItem>,
}
export type OrderStatus = { 'pending' : null } |
  { 'delivered' : null } |
  { 'confirmed' : null };
export interface PakkaBill {
  'id' : bigint,
  'masterCustomerName' : string,
  'masterCustomerId' : string,
  'distributorId' : string,
  'totalAmount' : number,
  'timestamp' : Time,
  'items' : Array<PakkaBillItem>,
}
export interface PakkaBillItem {
  'companyDiscount' : bigint,
  'totalValue' : number,
  'netRate' : bigint,
  'quantity' : number,
  'medicineId' : bigint,
  'medicineName' : string,
}
export interface PaymentRecord {
  'id' : bigint,
  'staffName' : string,
  'date' : string,
  'orderId' : bigint,
  'pharmacyName' : string,
  'timestamp' : Time,
  'amount' : bigint,
}
export interface Pharmacy {
  'id' : bigint,
  'ntn' : string,
  'contact' : string,
  'cnic' : string,
  'code' : string,
  'name' : string,
  'location' : string,
}
export type Principal = Principal;
export interface PurchaseRecord {
  'id' : bigint,
  'packSize' : string,
  'productName' : string,
  'genericName' : string,
  'timestamp' : Time,
  'companyName' : string,
  'quantity' : bigint,
  'batchNo' : string,
  'price' : bigint,
  'medicineType' : string,
}
export interface ReturnItem { 'medicineId' : bigint, 'returnedQty' : bigint }
export interface StaffLocation {
  'lat' : number,
  'lng' : number,
  'username' : string,
  'role' : string,
  'updatedAt' : string,
  'accuracy' : number,
}
export type Time = bigint;
export interface _SERVICE {
  // Legacy functions
  'addCustomer' : ActorMethod<[string, CustomerType, string, string, string, string, string, string, string], bigint>,
  'addDistributor' : ActorMethod<[string, string, string], bigint>,
  'addEstimatedOrder' : ActorMethod<[string, string, string, string, Array<EstimatedOrderItem>, string], bigint>,
  'addMedicine' : ActorMethod<[string, bigint, string, string, string, string, string, string, string], bigint>,
  'addPakkaBill' : ActorMethod<[string, string, Array<PakkaBillItem>, number, string], bigint>,
  'addPaymentRecord' : ActorMethod<[string, bigint, bigint, string, string], bigint>,
  'addPharmacy' : ActorMethod<[string, string, string, string, string, string], bigint>,
  'addPurchase' : ActorMethod<[string, string, string, bigint, bigint, string, string, string], bigint>,
  'adjustInventoryStock' : ActorMethod<[bigint, bigint], boolean>,
  'changeSuperAdminPassword' : ActorMethod<[string, string], boolean>,
  'createOrder' : ActorMethod<[bigint, Array<MedicineItem>, string, string, string], bigint>,
  'deleteCustomer' : ActorMethod<[bigint], boolean>,
  'deleteDistributor' : ActorMethod<[bigint], boolean>,
  'deleteEstimatedOrders' : ActorMethod<[Array<bigint>], undefined>,
  'deleteMedicine' : ActorMethod<[bigint], boolean>,
  'deletePakkaBill' : ActorMethod<[bigint], boolean>,
  'deletePaymentRecord' : ActorMethod<[bigint], boolean>,
  'deletePharmacy' : ActorMethod<[bigint], boolean>,
  'deletePurchase' : ActorMethod<[bigint], boolean>,
  'getActiveOrders' : ActorMethod<[], Array<OrderRecord>>,
  'getAllStaffLocations' : ActorMethod<[], Array<StaffLocation>>,
  'getAllStaffOrders' : ActorMethod<[], Array<OrderRecord>>,
  'getCustomers' : ActorMethod<[], Array<Customer>>,
  'getDistributorById' : ActorMethod<[bigint], [] | [Distributor]>,
  'getDistributors' : ActorMethod<[], Array<Distributor>>,
  'getEstimatedOrders' : ActorMethod<[], Array<EstimatedOrder>>,
  'getHistoryOrders' : ActorMethod<[], Array<OrderRecord>>,
  'getInventoryStock' : ActorMethod<[], Array<[bigint, bigint]>>,
  'getMedicines' : ActorMethod<[], Array<Medicine>>,
  'getOrder' : ActorMethod<[bigint], [] | [OrderRecord]>,
  'getPakkaBills' : ActorMethod<[], Array<PakkaBill>>,
  'getPaymentRecords' : ActorMethod<[], Array<PaymentRecord>>,
  'getPharmacies' : ActorMethod<[], Array<Pharmacy>>,
  'getPurchases' : ActorMethod<[], Array<PurchaseRecord>>,
  'getStaffOrders' : ActorMethod<[Principal], Array<OrderRecord>>,
  'registerStaff' : ActorMethod<[string, string], boolean>,
  'setInventoryStock' : ActorMethod<[bigint, bigint], boolean>,
  'updateDistributor' : ActorMethod<[bigint, string, string, string], boolean>,
  'updateMedicine' : ActorMethod<[bigint, string, bigint, string, string, string, string, string, string, string], boolean>,
  'updateOrderLines' : ActorMethod<[bigint, bigint, Array<MedicineItem>, string], boolean>,
  'updateOrderPaymentAndReturn' : ActorMethod<[bigint, bigint, Array<ReturnItem>, string], boolean>,
  'updateOrderStatus' : ActorMethod<[bigint, OrderStatus], boolean>,
  'updatePharmacy' : ActorMethod<[bigint, string, string, string, string, string, string], boolean>,
  'updateStaffLocation' : ActorMethod<[string, string, number, number, number, string], boolean>,
  'verifyDistributorLogin' : ActorMethod<[string, string], [] | [bigint]>,
  'verifyPassword' : ActorMethod<[string, string], boolean>,
  'verifySuperAdmin' : ActorMethod<[string], boolean>,
  // Multi-tenant Phase 2/3 functions
  'addStaffForDistributor' : ActorMethod<[bigint, string, string, string, string], bigint>,
  'getStaffByDistributor' : ActorMethod<[bigint], Array<StaffRecord>>,
  'deleteStaffRecord' : ActorMethod<[bigint], boolean>,
  'updateStaffRecordPassword' : ActorMethod<[bigint, string], boolean>,
  'verifyStaffLoginForDistributor' : ActorMethod<[string, string], [] | [StaffLoginResult]>,
  'addPharmacyForDistributor' : ActorMethod<[bigint, string, string, string, string, string, string], bigint>,
  'getPharmaciesByDistributor' : ActorMethod<[bigint], Array<Pharmacy>>,
  'addMedicineForDistributor' : ActorMethod<[bigint, string, bigint, string, string, string, string, string, string, string], bigint>,
  'getMedicinesByDistributor' : ActorMethod<[bigint], Array<Medicine>>,
  'addCustomerForDistributor' : ActorMethod<[bigint, string, CustomerType, string, string, string, string, string, string, string], bigint>,
  'getCustomersByDistributor' : ActorMethod<[bigint], Array<Customer>>,
  'createOrderForDistributor' : ActorMethod<[bigint, bigint, Array<MedicineItem>, string, string, string], bigint>,
  'getActiveOrdersByDistributor' : ActorMethod<[bigint], Array<OrderRecord>>,
  'getHistoryOrdersByDistributor' : ActorMethod<[bigint], Array<OrderRecord>>,
  'getOrdersByStaffName' : ActorMethod<[bigint, string], Array<OrderRecord>>,
  'getDistributorStats' : ActorMethod<[bigint], DistributorStats>,
  'getAllOrdersForSuperAdmin' : ActorMethod<[], Array<OrderRecord>>,
  'clearOrdersForDistributor' : ActorMethod<[bigint], bigint>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
