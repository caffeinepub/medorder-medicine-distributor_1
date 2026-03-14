import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Order "mo:core/Order";

persistent actor {
  type Staff = {
    name : Text;
    password : Text;
  };

  type Pharmacy = {
    id : Nat;
    name : Text;
    contact : Text;
    location : Text;
    code : Text;
    ntn : Text;
    cnic : Text;
  };

  type CustomerType = {
    #doctor;
    #medicalStore;
    #pharmacy;
    #hospital;
  };

  type Customer = {
    id : Nat;
    name : Text;
    customerType : CustomerType;
    address : Text;
    area : Text;
    contactNo : Text;
    groupName : Text;
    code : Text;
    ntn : Text;
    cnic : Text;
    timestamp : Time.Time;
  };

  type Medicine = {
    id : Nat;
    name : Text;
    price : Nat;
    description : Text;
    company : Text;
    strength : Text;
    packSize : Text;
    genericName : Text;
    batchNo : Text;
    medicineType : Text;
  };

  type MedicineItem = {
    medicineId : Nat;
    quantity : Float;
    bonusQty : Nat;
    discountPercent : Nat;
    distributionDiscount : Nat;
    companyDiscount : Nat;
    netRate : Nat;
  };

  type ReturnItem = {
    medicineId : Nat;
    returnedQty : Nat;
  };

  type OrderStatus = {
    #pending;
    #confirmed;
    #delivered;
  };

  type OrderRecord = {
    id : Nat;
    staffId : Principal.Principal;
    staffName : Text;
    staffCode : Text;
    pharmacyId : Nat;
    status : OrderStatus;
    orderLines : [MedicineItem];
    notes : Text;
    timestamp : Time.Time;
    paymentReceived : Nat;
    returnItems : [ReturnItem];
    returnReason : Text;
    pharmacyCode : Text;
  };

  // NOTE: strength field is NOT included here to maintain stable storage compatibility
  // with existing deployed canisters. strength is handled frontend-only.
  type PurchaseRecord = {
    id : Nat;
    productName : Text;
    genericName : Text;
    batchNo : Text;
    quantity : Nat;
    price : Nat;
    packSize : Text;
    companyName : Text;
    medicineType : Text;
    timestamp : Time.Time;
  };

  type StaffLocation = {
    username : Text;
    role : Text;
    lat : Float;
    lng : Float;
    accuracy : Float;
    updatedAt : Text;
  };

  type PaymentRecord = {
    id : Nat;
    date : Text;
    amount : Nat;
    orderId : Nat;
    staffName : Text;
    pharmacyName : Text;
    timestamp : Time.Time;
  };

  type Distributor = {
    id : Nat;
    name : Text;
    adminUsername : Text;
    adminPassword : Text;
    createdAt : Time.Time;
  };

  module Pharmacy {
    public func compareById(p1 : Pharmacy, p2 : Pharmacy) : Order.Order {
      Nat.compare(p1.id, p2.id);
    };
  };

  module Medicine {
    public func compareById(m1 : Medicine, m2 : Medicine) : Order.Order {
      Nat.compare(m1.id, m2.id);
    };
  };

  module OrderRecord {
    public func compareByIdDescending(a : OrderRecord, b : OrderRecord) : Order.Order {
      if (a.id > b.id) { #less } else if (a.id < b.id) { #greater } else { #equal };
    };
  };

  module PurchaseRecord {
    public func compareByIdDescending(a : PurchaseRecord, b : PurchaseRecord) : Order.Order {
      if (a.id > b.id) { #less } else if (a.id < b.id) { #greater } else { #equal };
    };
  };

  module Customer {
    public func compareById(c1 : Customer, c2 : Customer) : Order.Order {
      if (c1.id < c2.id) { #less } else if (c1.id > c2.id) { #greater } else { #equal };
    };
  };

  module Distributor {
    public func compareById(d1 : Distributor, d2 : Distributor) : Order.Order {
      Nat.compare(d1.id, d2.id);
    };
  };

  let staff = Map.empty<Principal.Principal, Staff>();
  let pharmacies = Map.empty<Nat, Pharmacy>();
  let customers = Map.empty<Nat, Customer>();
  let medicines = Map.empty<Nat, Medicine>();
  let orders = Map.empty<Nat, OrderRecord>();
  let purchases = Map.empty<Nat, PurchaseRecord>();
  let inventoryStock = Map.empty<Nat, Int>();
  let staffLocations = Map.empty<Text, StaffLocation>();
  let paymentRecords = Map.empty<Nat, PaymentRecord>();
  let distributors = Map.empty<Nat, Distributor>();
  var nextPharmacyId = 0;
  var nextMedicineId = 0;
  var nextOrderId = 0;
  var nextPurchaseId = 0;
  var nextCustomerId = 0;
  var nextPaymentRecordId = 0;
  var nextDistributorId = 0;
  var superAdminPassword : Text = "superadmin123";
  let fortyEightHoursInNanoseconds : Int = 48 * 60 * 60 * 1_000_000_000;
  let oneYearInNanoseconds : Int = 365 * 24 * 60 * 60 * 1_000_000_000;

  // ==================== SUPER ADMIN ====================

  public query func verifySuperAdmin(password : Text) : async Bool {
    password == superAdminPassword;
  };

  public shared func changeSuperAdminPassword(oldPassword : Text, newPassword : Text) : async Bool {
    if (oldPassword == superAdminPassword) {
      superAdminPassword := newPassword;
      true;
    } else {
      false;
    };
  };

  // ==================== DISTRIBUTORS ====================

  public shared func addDistributor(name : Text, adminUsername : Text, adminPassword : Text) : async Nat {
    let id = nextDistributorId;
    nextDistributorId += 1;
    distributors.add(id, { id; name; adminUsername; adminPassword; createdAt = Time.now() });
    id;
  };

  public shared func deleteDistributor(id : Nat) : async Bool {
    let result = distributors.containsKey(id);
    distributors.remove(id);
    result;
  };

  public query func getDistributors() : async [Distributor] {
    distributors.values().toArray().sort(Distributor.compareById);
  };

  public shared func updateDistributor(id : Nat, name : Text, adminUsername : Text, adminPassword : Text) : async Bool {
    switch (distributors.get(id)) {
      case (null) { false };
      case (?d) {
        distributors.add(id, { id; name; adminUsername; adminPassword; createdAt = d.createdAt });
        true;
      };
    };
  };

  // ==================== STAFF ====================

  public shared ({ caller }) func registerStaff(name : Text, password : Text) : async Bool {
    if (staff.containsKey(caller)) { return true };
    staff.add(caller, { name; password });
    true;
  };

  public query ({ caller }) func verifyPassword(name : Text, password : Text) : async Bool {
    for ((_, s) in staff.entries()) {
      if (s.name == name and s.password == password) { return true };
    };
    false;
  };

  // ==================== PHARMACIES ====================

  public shared ({ caller }) func addPharmacy(name : Text, contact : Text, location : Text, code : Text, ntn : Text, cnic : Text) : async Nat {
    let id = nextPharmacyId;
    nextPharmacyId += 1;
    pharmacies.add(id, { id; name; contact; location; code; ntn; cnic });
    id;
  };

  public shared ({ caller }) func deletePharmacy(id : Nat) : async Bool {
    let result = pharmacies.containsKey(id);
    pharmacies.remove(id);
    result;
  };

  public shared ({ caller }) func updatePharmacy(id : Nat, name : Text, contact : Text, location : Text, code : Text, ntn : Text, cnic : Text) : async Bool {
    switch (pharmacies.get(id)) {
      case (null) { false };
      case (?_) {
        pharmacies.add(id, { id; name; contact; location; code; ntn; cnic });
        true;
      };
    };
  };

  public query ({ caller }) func getPharmacies() : async [Pharmacy] {
    pharmacies.values().toArray().sort(Pharmacy.compareById);
  };

  // ==================== CUSTOMERS ====================

  public shared ({ caller }) func addCustomer(name : Text, customerType : CustomerType, address : Text, area : Text, contactNo : Text, groupName : Text, code : Text, ntn : Text, cnic : Text) : async Nat {
    let id = nextCustomerId;
    nextCustomerId += 1;
    customers.add(id, { id; name; customerType; address; area; contactNo; groupName; code; ntn; cnic; timestamp = Time.now() });
    id;
  };

  public shared ({ caller }) func deleteCustomer(id : Nat) : async Bool {
    let result = customers.containsKey(id);
    customers.remove(id);
    result;
  };

  public query ({ caller }) func getCustomers() : async [Customer] {
    customers.values().toArray().sort(Customer.compareById);
  };

  // ==================== MEDICINES ====================

  public shared ({ caller }) func addMedicine(name : Text, price : Nat, description : Text, company : Text, strength : Text, packSize : Text, genericName : Text, batchNo : Text, medicineType : Text) : async Nat {
    let id = nextMedicineId;
    nextMedicineId += 1;
    medicines.add(id, { id; name; price; description; company; strength; packSize; genericName; batchNo; medicineType });
    id;
  };

  public shared ({ caller }) func deleteMedicine(id : Nat) : async Bool {
    let result = medicines.containsKey(id);
    medicines.remove(id);
    result;
  };

  public shared ({ caller }) func updateMedicine(id : Nat, name : Text, price : Nat, description : Text, company : Text, strength : Text, packSize : Text, genericName : Text, batchNo : Text, medicineType : Text) : async Bool {
    switch (medicines.get(id)) {
      case (null) { false };
      case (?_) {
        medicines.add(id, { id; name; price; description; company; strength; packSize; genericName; batchNo; medicineType });
        true;
      };
    };
  };

  public query ({ caller }) func getMedicines() : async [Medicine] {
    medicines.values().toArray().sort(Medicine.compareById);
  };

  // ==================== ORDERS ====================

  public shared ({ caller }) func createOrder(pharmacyId : Nat, orderLines : [MedicineItem], staffName : Text, staffCode : Text, notes : Text) : async Nat {
    if (not staff.containsKey(caller)) {
      ignore registerStaff(staffName, staffCode);
    };
    let id = nextOrderId;
    nextOrderId += 1;
    orders.add(id, {
      id; staffId = caller; staffName; staffCode; pharmacyId; orderLines; notes;
      status = #pending; timestamp = Time.now(); paymentReceived = 0;
      returnItems = []; returnReason = ""; pharmacyCode = "";
    });
    id;
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Nat, newStatus : OrderStatus) : async Bool {
    switch (orders.get(orderId)) {
      case (null) { false };
      case (?order) { orders.add(orderId, { order with status = newStatus }); true };
    };
  };

  public shared ({ caller }) func updateOrderPaymentAndReturn(orderId : Nat, paymentReceived : Nat, returnItems : [ReturnItem], returnReason : Text) : async Bool {
    switch (orders.get(orderId)) {
      case (null) { false };
      case (?order) {
        orders.add(orderId, { order with paymentReceived; returnItems; returnReason });
        true;
      };
    };
  };

  public shared ({ caller }) func updateOrderLines(orderId : Nat, pharmacyId : Nat, orderLines : [MedicineItem], notes : Text) : async Bool {
    switch (orders.get(orderId)) {
      case (null) { false };
      case (?order) {
        switch (order.status) {
          case (#pending) {
            orders.add(orderId, { order with orderLines; pharmacyId; notes });
            true;
          };
          case (_) { false };
        };
      };
    };
  };

  public query ({ caller }) func getAllStaffOrders() : async [OrderRecord] {
    orders.values().toArray();
  };

  public query ({ caller }) func getActiveOrders() : async [OrderRecord] {
    let currentTime = Time.now();
    orders.values().toArray().filter(
      func(order) {
        switch (order.status) {
          case (#delivered) { order.timestamp >= currentTime - fortyEightHoursInNanoseconds };
          case (_) { true };
        };
      }
    ).sort(OrderRecord.compareByIdDescending);
  };

  public query ({ caller }) func getHistoryOrders() : async [OrderRecord] {
    let currentTime = Time.now();
    orders.values().toArray().filter(
      func(order) {
        order.status == #delivered and
        order.timestamp < (currentTime - fortyEightHoursInNanoseconds) and
        order.timestamp >= (currentTime - oneYearInNanoseconds)
      }
    ).sort(OrderRecord.compareByIdDescending);
  };

  public query ({ caller }) func getStaffOrders(staffId : Principal.Principal) : async [OrderRecord] {
    orders.values().toArray().filter(func(order) { order.staffId == staffId });
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async ?OrderRecord {
    orders.get(orderId);
  };

  // ==================== PURCHASES ====================

  public shared ({ caller }) func addPurchase(productName : Text, genericName : Text, batchNo : Text, quantity : Nat, price : Nat, packSize : Text, companyName : Text, medicineType : Text) : async Nat {
    let id = nextPurchaseId;
    nextPurchaseId += 1;
    purchases.add(id, { id; productName; genericName; batchNo; quantity; price; packSize; companyName; medicineType; timestamp = Time.now() });
    id;
  };

  public shared ({ caller }) func deletePurchase(id : Nat) : async Bool {
    let result = purchases.containsKey(id);
    purchases.remove(id);
    result;
  };

  public query ({ caller }) func getPurchases() : async [PurchaseRecord] {
    purchases.values().toArray().sort(PurchaseRecord.compareByIdDescending);
  };

  // ==================== INVENTORY ====================

  public query ({ caller }) func getInventoryStock() : async [(Nat, Int)] {
    inventoryStock.toArray();
  };

  public shared ({ caller }) func setInventoryStock(medicineId : Nat, qty : Int) : async Bool {
    inventoryStock.add(medicineId, qty);
    true;
  };

  public shared ({ caller }) func adjustInventoryStock(medicineId : Nat, delta : Int) : async Bool {
    let currentQty : Int = switch (inventoryStock.get(medicineId)) {
      case (null) { 0 };
      case (?qty) { qty };
    };
    inventoryStock.add(medicineId, Int.max(0, currentQty + delta));
    true;
  };

  // ==================== LOCATION ====================

  public shared ({ caller }) func updateStaffLocation(username : Text, role : Text, lat : Float, lng : Float, accuracy : Float, updatedAt : Text) : async Bool {
    staffLocations.add(username, { username; role; lat; lng; accuracy; updatedAt });
    true;
  };

  public query ({ caller }) func getAllStaffLocations() : async [StaffLocation] {
    staffLocations.values().toArray();
  };

  // ==================== PAYMENTS ====================

  public shared ({ caller }) func addPaymentRecord(date : Text, amount : Nat, orderId : Nat, staffName : Text, pharmacyName : Text) : async Nat {
    let id = nextPaymentRecordId;
    nextPaymentRecordId += 1;
    paymentRecords.add(id, { id; date; amount; orderId; staffName; pharmacyName; timestamp = Time.now() });
    id;
  };

  public query ({ caller }) func getPaymentRecords() : async [PaymentRecord] {
    paymentRecords.values().toArray();
  };

  public shared ({ caller }) func deletePaymentRecord(id : Nat) : async Bool {
    let result = paymentRecords.containsKey(id);
    paymentRecords.remove(id);
    result;
  };
};
