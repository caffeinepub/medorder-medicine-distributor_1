import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Medicine {
    id: bigint;
    packSize: string;
    name: string;
    description: string;
    company: string;
    strength: string;
    price: bigint;
}
export interface Pharmacy {
    id: bigint;
    contact: string;
    name: string;
    location: string;
}
export type Time = bigint;
export interface OrderRecord {
    id: bigint;
    status: OrderStatus;
    staffId: Principal;
    timestamp: Time;
    orderLines: Array<MedicineItem>;
    pharmacyId: bigint;
}
export interface MedicineItem {
    quantity: bigint;
    medicineId: bigint;
}
export enum OrderStatus {
    pending = "pending",
    delivered = "delivered",
    confirmed = "confirmed"
}
export interface backendInterface {
    addMedicine(name: string, price: bigint, description: string, company: string, strength: string, packSize: string): Promise<bigint>;
    addPharmacy(name: string, contact: string, location: string): Promise<bigint>;
    createOrder(pharmacyId: bigint, orderLines: Array<MedicineItem>): Promise<bigint>;
    deleteMedicine(id: bigint): Promise<void>;
    deletePharmacy(id: bigint): Promise<void>;
    getAllOrdersByStatus(): Promise<Array<OrderRecord>>;
    getAllStaffOrders(): Promise<Array<OrderRecord>>;
    getMedicines(): Promise<Array<Medicine>>;
    getOrder(orderId: bigint): Promise<OrderRecord>;
    getPharmacies(): Promise<Array<Pharmacy>>;
    getStaffOrders(staffId: Principal): Promise<Array<OrderRecord>>;
    registerStaff(name: string, password: string): Promise<void>;
    updateOrderStatus(orderId: bigint, newStatus: OrderStatus): Promise<void>;
}
