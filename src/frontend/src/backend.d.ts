import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Pharmacy {
    id: bigint;
    contact: string;
    name: string;
    location: string;
}
export interface OrderRecord {
    id: bigint;
    status: OrderStatus;
    staffCode: string;
    staffName: string;
    staffId: Principal;
    returnReason: string;
    pharmacyCode: string;
    notes: string;
    timestamp: Time;
    orderLines: Array<MedicineItem>;
    paymentReceived: bigint;
    pharmacyId: bigint;
    returnItems: Array<ReturnItem>;
}
export interface PurchaseRecord {
    id: bigint;
    packSize: string;
    productName: string;
    genericName: string;
    timestamp: Time;
    companyName: string;
    quantity: bigint;
    batchNo: string;
    price: bigint;
}
export interface Medicine {
    id: bigint;
    packSize: string;
    name: string;
    description: string;
    company: string;
    strength: string;
    price: bigint;
}
export interface MedicineItem {
    discountPercent: bigint;
    bonusQty: bigint;
    quantity: bigint;
    medicineId: bigint;
}
export interface ReturnItem {
    medicineId: bigint;
    returnedQty: bigint;
}
export enum OrderStatus {
    pending = "pending",
    delivered = "delivered",
    confirmed = "confirmed"
}
export interface backendInterface {
    addMedicine(name: string, price: bigint, description: string, company: string, strength: string, packSize: string): Promise<bigint>;
    addPharmacy(name: string, contact: string, location: string): Promise<bigint>;
    addPurchase(productName: string, genericName: string, batchNo: string, quantity: bigint, price: bigint, packSize: string, companyName: string): Promise<bigint>;
    createOrder(pharmacyId: bigint, orderLines: Array<MedicineItem>, staffName: string, staffCode: string): Promise<bigint>;
    deleteMedicine(id: bigint): Promise<boolean>;
    deletePharmacy(id: bigint): Promise<boolean>;
    deletePurchase(id: bigint): Promise<boolean>;
    getActiveOrders(): Promise<Array<OrderRecord>>;
    getAllStaffOrders(): Promise<Array<OrderRecord>>;
    getHistoryOrders(): Promise<Array<OrderRecord>>;
    getMedicines(): Promise<Array<Medicine>>;
    getOrder(orderId: bigint): Promise<OrderRecord | null>;
    getPharmacies(): Promise<Array<Pharmacy>>;
    getPurchases(): Promise<Array<PurchaseRecord>>;
    getStaffOrders(staffId: Principal): Promise<Array<OrderRecord>>;
    registerStaff(name: string, password: string): Promise<boolean>;
    updateOrderPaymentAndReturn(orderId: bigint, paymentReceived: bigint, returnItems: Array<ReturnItem>, returnReason: string, pharmacyCode: string): Promise<boolean>;
    updateOrderStatus(orderId: bigint, newStatus: OrderStatus): Promise<boolean>;
}
