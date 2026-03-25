import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface StaffLocation {
    lat: number;
    lng: number;
    username: string;
    role: string;
    updatedAt: string;
    accuracy: number;
}
export type Time = bigint;
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
export interface PaymentRecord {
    id: bigint;
    staffName: string;
    date: string;
    orderId: bigint;
    pharmacyName: string;
    timestamp: Time;
    amount: bigint;
}
export interface Distributor {
    id: bigint;
    name: string;
    createdAt: Time;
    adminUsername: string;
    adminPassword: string;
}
export type Principal = Principal;
export interface MedicineItem {
    distributionDiscount: bigint;
    companyDiscount: bigint;
    netRate: bigint;
    discountPercent: bigint;
    bonusQty: bigint;
    quantity: number;
    medicineId: bigint;
}
export interface Customer {
    id: bigint;
    ntn: string;
    customerType: CustomerType;
    area: string;
    cnic: string;
    code: string;
    name: string;
    address: string;
    timestamp: Time;
    contactNo: string;
    dealerCode: string;
    groupName: string;
}
export interface ReturnItem {
    medicineId: bigint;
    returnedQty: bigint;
}
export interface StaffRecord {
    id: bigint;
    username: string;
    displayName: string;
    password: string;
    role: string;
    distributorId: bigint;
}
export interface PakkaBillItem {
    companyDiscount: bigint;
    totalValue: number;
    netRate: bigint;
    quantity: number;
    medicineId: bigint;
    medicineName: string;
}
export interface Pharmacy {
    id: bigint;
    ntn: string;
    contact: string;
    cnic: string;
    code: string;
    name: string;
    location: string;
}
export interface PurchaseRecord {
    id: bigint;
    packSize: string;
    productName: string;
    invoiceNumber?: string;
    genericName: string;
    timestamp: Time;
    companyName: string;
    quantity: bigint;
    batchNo: string;
    price: bigint;
    medicineType: string;
}
export interface MedicineGroup {
    id: bigint;
    name: string;
    distributorId: bigint;
}
export interface Medicine {
    id: bigint;
    packSize: string;
    name: string;
    productCode: string;
    description: string;
    company: string;
    groupId: bigint;
    strength: string;
    genericName: string;
    batchNo: string;
    price: bigint;
    medicineType: string;
}
export interface EstimatedOrderItem {
    distributionDiscount: bigint;
    companyDiscount: bigint;
    netRate: bigint;
    discountPercent: bigint;
    bonusQty: bigint;
    quantity: number;
    unitPrice: bigint;
    medicineId: bigint;
    medicineName: string;
}
export interface PakkaBill {
    id: bigint;
    masterCustomerName: string;
    masterCustomerId: string;
    distributorId: string;
    totalAmount: number;
    timestamp: Time;
    items: Array<PakkaBillItem>;
}
export interface EstimatedOrder {
    id: bigint;
    staffName: string;
    staffId: string;
    distributorId: string;
    pharmacyName: string;
    timestamp: Time;
    pharmacyId: string;
    items: Array<EstimatedOrderItem>;
}
export enum CustomerType {
    hospital = "hospital",
    doctor = "doctor",
    medicalStore = "medicalStore",
    pharmacy = "pharmacy"
}
export enum OrderStatus {
    pending = "pending",
    delivered = "delivered",
    confirmed = "confirmed"
}
export interface backendInterface {
    addCustomer(name: string, customerType: CustomerType, address: string, area: string, contactNo: string, groupName: string, code: string, ntn: string, cnic: string, dealerCode: string): Promise<bigint>;
    addCustomerForDistributor(distId: bigint, name: string, customerType: CustomerType, address: string, area: string, contactNo: string, groupName: string, code: string, ntn: string, cnic: string, dealerCode: string): Promise<bigint>;
    addDistributor(name: string, adminUsername: string, adminPassword: string): Promise<bigint>;
    addEstimatedOrder(staffId: string, staffName: string, pharmacyId: string, pharmacyName: string, items: Array<EstimatedOrderItem>, distributorId: string): Promise<bigint>;
    addMedicine(name: string, price: bigint, description: string, company: string, strength: string, packSize: string, genericName: string, batchNo: string, medicineType: string, productCode: string, groupId: bigint): Promise<bigint>;
    addMedicineForDistributor(distId: bigint, name: string, price: bigint, description: string, company: string, strength: string, packSize: string, genericName: string, batchNo: string, medicineType: string, productCode: string, groupId: bigint): Promise<bigint>;
    addMedicineGroup(name: string, distributorId: bigint): Promise<bigint>;
    addPakkaBill(masterCustomerId: string, masterCustomerName: string, items: Array<PakkaBillItem>, totalAmount: number, distributorId: string): Promise<bigint>;
    addPaymentRecord(date: string, amount: bigint, orderId: bigint, staffName: string, pharmacyName: string): Promise<bigint>;
    addPharmacy(name: string, contact: string, location: string, code: string, ntn: string, cnic: string): Promise<bigint>;
    addPharmacyForDistributor(distId: bigint, name: string, contact: string, location: string, code: string, ntn: string, cnic: string): Promise<bigint>;
    addPurchase(productName: string, genericName: string, batchNo: string, quantity: bigint, price: bigint, packSize: string, companyName: string, medicineType: string, invoiceNumber: string | null): Promise<bigint>;
    addStaffForDistributor(distId: bigint, username: string, password: string, role: string, displayName: string): Promise<bigint>;
    adjustInventoryStock(medicineId: bigint, delta: bigint): Promise<boolean>;
    changeSuperAdminPassword(oldPassword: string, newPassword: string): Promise<boolean>;
    clearOrdersForDistributor(distId: bigint): Promise<bigint>;
    createOrder(pharmacyId: bigint, orderLines: Array<MedicineItem>, staffName: string, staffCode: string, notes: string): Promise<bigint>;
    createOrderForDistributor(distId: bigint, pharmacyId: bigint, orderLines: Array<MedicineItem>, staffName: string, staffCode: string, notes: string): Promise<bigint>;
    deleteCustomer(id: bigint): Promise<boolean>;
    deleteDistributor(id: bigint): Promise<boolean>;
    deleteEstimatedOrders(ids: Array<bigint>): Promise<void>;
    deleteMedicine(id: bigint): Promise<boolean>;
    deleteMedicineGroup(groupId: bigint, distributorId: bigint): Promise<boolean>;
    deletePakkaBill(id: bigint): Promise<boolean>;
    deletePaymentRecord(id: bigint): Promise<boolean>;
    deletePharmacy(id: bigint): Promise<boolean>;
    deletePurchase(id: bigint): Promise<boolean>;
    deleteStaffRecord(staffId: bigint): Promise<boolean>;
    getActiveOrders(): Promise<Array<OrderRecord>>;
    getActiveOrdersByDistributor(distId: bigint): Promise<Array<OrderRecord>>;
    getAllOrdersForSuperAdmin(): Promise<Array<OrderRecord>>;
    getAllStaffLocations(): Promise<Array<StaffLocation>>;
    getAllStaffOrders(): Promise<Array<OrderRecord>>;
    getCustomers(): Promise<Array<Customer>>;
    getCustomersByDistributor(distId: bigint): Promise<Array<Customer>>;
    getDistributorById(id: bigint): Promise<Distributor | null>;
    getDistributorStats(distId: bigint): Promise<{
        pharmacyCount: bigint;
        orderCount: bigint;
        staffCount: bigint;
        medicineCount: bigint;
    }>;
    getDistributors(): Promise<Array<Distributor>>;
    getEstimatedOrders(): Promise<Array<EstimatedOrder>>;
    getHistoryOrders(): Promise<Array<OrderRecord>>;
    getHistoryOrdersByDistributor(distId: bigint): Promise<Array<OrderRecord>>;
    getInventoryStock(): Promise<Array<[bigint, bigint]>>;
    getMedicineGroups(distributorId: bigint): Promise<Array<MedicineGroup>>;
    getMedicines(): Promise<Array<Medicine>>;
    getMedicinesByDistributor(distId: bigint): Promise<Array<Medicine>>;
    getOrder(orderId: bigint): Promise<OrderRecord | null>;
    getOrdersByStaffName(distId: bigint, staffName: string): Promise<Array<OrderRecord>>;
    getPakkaBills(): Promise<Array<PakkaBill>>;
    getPaymentRecords(): Promise<Array<PaymentRecord>>;
    getPharmacies(): Promise<Array<Pharmacy>>;
    getPharmaciesByDistributor(distId: bigint): Promise<Array<Pharmacy>>;
    getPurchases(): Promise<Array<PurchaseRecord>>;
    getStaffByDistributor(distId: bigint): Promise<Array<StaffRecord>>;
    getStaffOrders(staffId: Principal): Promise<Array<OrderRecord>>;
    registerStaff(name: string, password: string): Promise<boolean>;
    setInventoryStock(medicineId: bigint, qty: bigint): Promise<boolean>;
    updateDistributor(id: bigint, name: string, adminUsername: string, adminPassword: string): Promise<boolean>;
    updateMedicine(id: bigint, name: string, price: bigint, description: string, company: string, strength: string, packSize: string, genericName: string, batchNo: string, medicineType: string, productCode: string, groupId: bigint): Promise<boolean>;
    updateOrderLines(orderId: bigint, pharmacyId: bigint, orderLines: Array<MedicineItem>, notes: string): Promise<boolean>;
    updateOrderPaymentAndReturn(orderId: bigint, paymentReceived: bigint, returnItems: Array<ReturnItem>, returnReason: string): Promise<boolean>;
    updateOrderStatus(orderId: bigint, newStatus: OrderStatus): Promise<boolean>;
    updatePharmacy(id: bigint, name: string, contact: string, location: string, code: string, ntn: string, cnic: string): Promise<boolean>;
    updateStaffLocation(username: string, role: string, lat: number, lng: number, accuracy: number, updatedAt: string): Promise<boolean>;
    updateStaffRecordPassword(staffId: bigint, newPassword: string): Promise<boolean>;
    updateUserInfo(userId: bigint, newUsername: string, newDisplayName: string): Promise<boolean>;
    verifyDistributorLogin(username: string, password: string): Promise<bigint | null>;
    verifyPassword(name: string, password: string): Promise<boolean>;
    verifyStaffLoginForDistributor(username: string, password: string): Promise<{
        staffId: bigint;
        displayName: string;
        role: string;
        distributorId: bigint;
    } | null>;
    verifySuperAdmin(password: string): Promise<boolean>;
}
