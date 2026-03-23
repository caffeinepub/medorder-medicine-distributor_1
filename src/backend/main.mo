import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Order "mo:core/Order";



actor {
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

  type StaffRecord = {
    id : Nat;
    distributorId : Nat;
    username : Text;
    password : Text;
    role : Text;
    displayName : Text;
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

  module StaffRecord {
    public func compareById(a : StaffRecord, b : StaffRecord) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  type EstimatedOrderItem = {
    medicineId : Nat;
    medicineName : Text;
    quantity : Float;
    bonusQty : Nat;
    discountPercent : Nat;
    distributionDiscount : Nat;
    companyDiscount : Nat;
    netRate : Nat;
    unitPrice : Nat;
  };

  type EstimatedOrder = {
    id : Nat;
    staffId : Text;
    staffName : Text;
    pharmacyId : Text;
    pharmacyName : Text;
    items : [EstimatedOrderItem];
    timestamp : Time.Time;
    distributorId : Text;
  };

  type PakkaBillItem = {
    medicineId : Nat;
    medicineName : Text;
    quantity : Float;
    netRate : Nat;
    companyDiscount : Nat;
    totalValue : Float;
  };

  type PakkaBill = {
    id : Nat;
    masterCustomerId : Text;
    masterCustomerName : Text;
    items : [PakkaBillItem];
    totalAmount : Float;
    timestamp : Time.Time;
    distributorId : Text;
  };

  stable let staff = Map.empty<Principal.Principal, Staff>();
  stable let pharmacies = Map.empty<Nat, Pharmacy>();
  stable let customers = Map.empty<Nat, Customer>();
  stable let medicines = Map.empty<Nat, Medicine>();
  stable let orders = Map.empty<Nat, OrderRecord>();
  stable let purchases = Map.empty<Nat, PurchaseRecord>();
  stable let inventoryStock = Map.empty<Nat, Int>();
  stable let staffLocations = Map.empty<Text, StaffLocation>();
  stable let paymentRecords = Map.empty<Nat, PaymentRecord>();
  stable let estimatedOrders = Map.empty<Nat, EstimatedOrder>();
  stable let pakkaBills = Map.empty<Nat, PakkaBill>();

  stable let pharmacyDist = Map.empty<Nat, Nat>();
  stable let medicineDist = Map.empty<Nat, Nat>();
  stable let orderDist = Map.empty<Nat, Nat>();
  stable let customerDist = Map.empty<Nat, Nat>();
  stable let staffRecords = Map.empty<Nat, StaffRecord>();

  stable var nextStaffRecordId = 0;
  stable var nextEstimatedOrderId = 0;
  stable var nextPakkaBillId = 0;
  stable var distributors : List.List<Distributor> = List.empty<Distributor>();
  stable var nextPharmacyId = 0;
  stable var nextMedicineId = 0;
  stable var nextOrderId = 0;
  stable var nextPurchaseId = 0;
  stable var nextCustomerId = 0;
  stable var nextPaymentRecordId = 0;
  stable var nextDistributorId = 0;
  stable var superAdminPassword : Text = "superadmin123";

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

  public query func verifyDistributorLogin(username : Text, password : Text) : async ?Nat {
    let d = distributors.find(func(d) { d.adminUsername == username and d.adminPassword == password });
    switch (d) {
      case (null) { null };
      case (?distributor) { ?distributor.id };
    };
  };

  public query func getDistributorById(id : Nat) : async ?Distributor {
    distributors.find(func(d) { d.id == id });
  };

  public shared func addDistributor(name : Text, adminUsername : Text, adminPassword : Text) : async Nat {
    let id = nextDistributorId;
    nextDistributorId += 1;
    let distributor : Distributor = {
      id;
      name;
      adminUsername;
      adminPassword;
      createdAt = Time.now();
    };
    distributors.add(distributor);
    id;
  };

  public shared func deleteDistributor(id : Nat) : async Bool {
    let initialSize = distributors.size();
    distributors := distributors.filter(func(d) { d.id != id });
    distributors.size() < initialSize;
  };

  public query func getDistributors() : async [Distributor] {
    let array = distributors.toArray();
    array.sort(Distributor.compareById);
  };

  public shared func updateDistributor(id : Nat, name : Text, adminUsername : Text, adminPassword : Text) : async Bool {
    var found = false;
    distributors := distributors.map<Distributor, Distributor>(
      func(d) {
        if (d.id == id) {
          found := true;
          { id; name; adminUsername; adminPassword; createdAt = d.createdAt };
        } else { d };
      }
    );
    found;
  };

  public query func getDistributorStats(distId : Nat) : async { orderCount : Nat; staffCount : Nat; medicineCount : Nat; pharmacyCount : Nat } {
    var orderCount = 0;
    var medicineCount = 0;
    var pharmacyCount = 0;
    for ((_, dId) in orderDist.entries()) {
      if (dId == distId) { orderCount += 1 };
    };
    for ((_, dId) in medicineDist.entries()) {
      if (dId == distId) { medicineCount += 1 };
    };
    for ((_, dId) in pharmacyDist.entries()) {
      if (dId == distId) { pharmacyCount += 1 };
    };
    let staffArr = staffRecords.values().toArray();
    var staffCount = 0;
    for (s in staffArr.vals()) {
      if (s.distributorId == distId) { staffCount += 1 };
    };
    { orderCount; staffCount; medicineCount; pharmacyCount };
  };

  public query func getAllOrdersForSuperAdmin() : async [OrderRecord] {
    orders.values().toArray().sort(OrderRecord.compareByIdDescending);
  };

  // ==================== STAFF RECORDS (PER DISTRIBUTOR) ====================

  public shared func addStaffForDistributor(distId : Nat, username : Text, password : Text, role : Text, displayName : Text) : async Nat {
    let id = nextStaffRecordId;
    nextStaffRecordId += 1;
    staffRecords.add(id, { id; distributorId = distId; username; password; role; displayName });
    id;
  };

  public query func getStaffByDistributor(distId : Nat) : async [StaffRecord] {
    let arr = staffRecords.values().toArray();
    let filtered = arr.filter(func(s) { s.distributorId == distId });
    filtered.sort(StaffRecord.compareById);
  };

  public shared func deleteStaffRecord(staffId : Nat) : async Bool {
    let result = staffRecords.containsKey(staffId);
    staffRecords.remove(staffId);
    result;
  };

  public shared func updateStaffRecordPassword(staffId : Nat, newPassword : Text) : async Bool {
    switch (staffRecords.get(staffId)) {
      case (null) { false };
      case (?s) {
        staffRecords.add(staffId, { s with password = newPassword });
        true;
      };
    };
  };

  public query func verifyStaffLoginForDistributor(username : Text, password : Text) : async ?{ distributorId : Nat; role : Text; displayName : Text; staffId : Nat } {
    for ((_, s) in staffRecords.entries()) {
      if (s.username == username and s.password == password) {
        return ?{ distributorId = s.distributorId; role = s.role; displayName = s.displayName; staffId = s.id };
      };
    };
    null;
  };

  // ==================== STAFF (legacy) ====================

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

  public shared func addPharmacyForDistributor(distId : Nat, name : Text, contact : Text, location : Text, code : Text, ntn : Text, cnic : Text) : async Nat {
    let id = nextPharmacyId;
    nextPharmacyId += 1;
    pharmacies.add(id, { id; name; contact; location; code; ntn; cnic });
    pharmacyDist.add(id, distId);
    id;
  };

  public shared ({ caller }) func deletePharmacy(id : Nat) : async Bool {
    let result = pharmacies.containsKey(id);
    pharmacies.remove(id);
    pharmacyDist.remove(id);
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

  public query func getPharmaciesByDistributor(distId : Nat) : async [Pharmacy] {
    let arr = pharmacies.values().toArray();
    let filtered = arr.filter(func(p) {
      switch (pharmacyDist.get(p.id)) {
        case (null) false;
        case (?d) d == distId;
      }
    });
    filtered.sort(Pharmacy.compareById);
  };

  // ==================== CUSTOMERS ====================

  public shared ({ caller }) func addCustomer(name : Text, customerType : CustomerType, address : Text, area : Text, contactNo : Text, groupName : Text, code : Text, ntn : Text, cnic : Text) : async Nat {
    let id = nextCustomerId;
    nextCustomerId += 1;
    customers.add(id, { id; name; customerType; address; area; contactNo; groupName; code; ntn; cnic; timestamp = Time.now() });
    id;
  };

  public shared func addCustomerForDistributor(distId : Nat, name : Text, customerType : CustomerType, address : Text, area : Text, contactNo : Text, groupName : Text, code : Text, ntn : Text, cnic : Text) : async Nat {
    let id = nextCustomerId;
    nextCustomerId += 1;
    customers.add(id, { id; name; customerType; address; area; contactNo; groupName; code; ntn; cnic; timestamp = Time.now() });
    customerDist.add(id, distId);
    id;
  };

  public shared ({ caller }) func deleteCustomer(id : Nat) : async Bool {
    let result = customers.containsKey(id);
    customers.remove(id);
    customerDist.remove(id);
    result;
  };

  public query ({ caller }) func getCustomers() : async [Customer] {
    customers.values().toArray().sort(Customer.compareById);
  };

  public query func getCustomersByDistributor(distId : Nat) : async [Customer] {
    let arr = customers.values().toArray();
    let filtered = arr.filter(func(c) {
      switch (customerDist.get(c.id)) {
        case (null) false;
        case (?d) d == distId;
      }
    });
    filtered.sort(Customer.compareById);
  };

  // ==================== MEDICINES ====================

  public shared ({ caller }) func addMedicine(name : Text, price : Nat, description : Text, company : Text, strength : Text, packSize : Text, genericName : Text, batchNo : Text, medicineType : Text) : async Nat {
    let id = nextMedicineId;
    nextMedicineId += 1;
    medicines.add(id, { id; name; price; description; company; strength; packSize; genericName; batchNo; medicineType });
    id;
  };

  public shared func addMedicineForDistributor(distId : Nat, name : Text, price : Nat, description : Text, company : Text, strength : Text, packSize : Text, genericName : Text, batchNo : Text, medicineType : Text) : async Nat {
    let id = nextMedicineId;
    nextMedicineId += 1;
    medicines.add(id, { id; name; price; description; company; strength; packSize; genericName; batchNo; medicineType });
    medicineDist.add(id, distId);
    id;
  };

  public shared ({ caller }) func deleteMedicine(id : Nat) : async Bool {
    let result = medicines.containsKey(id);
    medicines.remove(id);
    medicineDist.remove(id);
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

  public query func getMedicinesByDistributor(distId : Nat) : async [Medicine] {
    let arr = medicines.values().toArray();
    let filtered = arr.filter(func(m) {
      switch (medicineDist.get(m.id)) {
        case (null) false;
        case (?d) d == distId;
      }
    });
    filtered.sort(Medicine.compareById);
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

  public shared func createOrderForDistributor(distId : Nat, pharmacyId : Nat, orderLines : [MedicineItem], staffName : Text, staffCode : Text, notes : Text) : async Nat {
    let id = nextOrderId;
    nextOrderId += 1;
    orders.add(id, {
      id; staffId = Principal.fromText("2vxsx-fae"); staffName; staffCode; pharmacyId; orderLines; notes;
      status = #pending; timestamp = Time.now(); paymentReceived = 0;
      returnItems = []; returnReason = ""; pharmacyCode = "";
    });
    orderDist.add(id, distId);
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
          case (#delivered) order.timestamp >= currentTime - fortyEightHoursInNanoseconds;
          case (_) true;
        }
      }
    ).sort(OrderRecord.compareByIdDescending);
  };

  public query func getActiveOrdersByDistributor(distId : Nat) : async [OrderRecord] {
    let currentTime = Time.now();
    let arr = orders.values().toArray();
    let filtered = arr.filter(func(order) {
      let inDist = switch (orderDist.get(order.id)) {
        case (null) false;
        case (?d) d == distId;
      };
      if (not inDist) return false;
      switch (order.status) {
        case (#delivered) order.timestamp >= currentTime - fortyEightHoursInNanoseconds;
        case (_) true;
      }
    });
    filtered.sort(OrderRecord.compareByIdDescending);
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

  public query func getHistoryOrdersByDistributor(distId : Nat) : async [OrderRecord] {
    let currentTime = Time.now();
    let arr = orders.values().toArray();
    let filtered = arr.filter(func(order) {
      let inDist = switch (orderDist.get(order.id)) {
        case (null) false;
        case (?d) d == distId;
      };
      inDist and
      order.status == #delivered and
      order.timestamp < (currentTime - fortyEightHoursInNanoseconds) and
      order.timestamp >= (currentTime - oneYearInNanoseconds)
    });
    filtered.sort(OrderRecord.compareByIdDescending);
  };

  public query ({ caller }) func getStaffOrders(staffId : Principal.Principal) : async [OrderRecord] {
    orders.values().toArray().filter(func(order) { order.staffId == staffId });
  };

  public query func getOrdersByStaffName(distId : Nat, staffName : Text) : async [OrderRecord] {
    let arr = orders.values().toArray();
    let filtered = arr.filter(func(order) {
      let inDist = switch (orderDist.get(order.id)) {
        case (null) false;
        case (?d) d == distId;
      };
      inDist and order.staffName == staffName
    });
    filtered.sort(OrderRecord.compareByIdDescending);
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

  // ==================== ESTIMATED ORDERS ====================

  public shared func addEstimatedOrder(staffId : Text, staffName : Text, pharmacyId : Text, pharmacyName : Text, items : [EstimatedOrderItem], distributorId : Text) : async Nat {
    let id = nextEstimatedOrderId;
    nextEstimatedOrderId += 1;
    estimatedOrders.add(id, { id; staffId; staffName; pharmacyId; pharmacyName; items; timestamp = Time.now(); distributorId });
    id;
  };

  public query func getEstimatedOrders() : async [EstimatedOrder] {
    estimatedOrders.values().toArray();
  };

  public shared func deleteEstimatedOrders(ids : [Nat]) : async () {
    for (id in ids.vals()) {
      estimatedOrders.remove(id);
    };
  };

  // ==================== PAKKA BILLS ====================

  public shared func addPakkaBill(masterCustomerId : Text, masterCustomerName : Text, items : [PakkaBillItem], totalAmount : Float, distributorId : Text) : async Nat {
    let id = nextPakkaBillId;
    nextPakkaBillId += 1;
    pakkaBills.add(id, { id; masterCustomerId; masterCustomerName; items; totalAmount; timestamp = Time.now(); distributorId });
    id;
  };

  public query func getPakkaBills() : async [PakkaBill] {
    pakkaBills.values().toArray();
  };

  // ==================== CLEAR ORDERS ====================

  public shared func clearOrdersForDistributor(distId : Nat) : async Nat {
    let arr = orders.values().toArray();
    var count = 0;
    for (order in arr.vals()) {
      switch (orderDist.get(order.id)) {
        case (?d) {
          if (d == distId) {
            orders.remove(order.id);
            orderDist.remove(order.id);
            count += 1;
          }
        };
        case (null) {};
      }
    };
    count;
  };

  public shared func deletePakkaBill(id : Nat) : async Bool {
    let exists = pakkaBills.containsKey(id);
    pakkaBills.remove(id);
    exists;
  };

};
