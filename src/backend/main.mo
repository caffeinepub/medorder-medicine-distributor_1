import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";

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
  };

  type CustomerType = {
    #doctor;
    #medicalStore;
    #pharmacy;
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
    quantity : Nat;
    bonusQty : Nat;
    discountPercent : Nat;
    distributionDiscount : Nat;
    companyDiscount : Nat;
    netRate : Nat;
  };

  type OrderStatus = {
    #pending;
    #confirmed;
    #delivered;
  };

  type ReturnItem = {
    medicineId : Nat;
    returnedQty : Nat;
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

  module Pharmacy {
    public func compare(p1 : Pharmacy, p2 : Pharmacy) : Order.Order {
      compareNat(p1.id, p2.id);
    };

    func compareNat(n1 : Nat, n2 : Nat) : Order.Order {
      if (n1 < n2) { #less } else if (n1 > n2) { #greater } else { #equal };
    };
  };

  module Medicine {
    public func compare(m1 : Medicine, m2 : Medicine) : Order.Order {
      compareNat(m1.id, m2.id);
    };

    func compareNat(n1 : Nat, n2 : Nat) : Order.Order {
      if (n1 < n2) { #less } else if (n1 > n2) { #greater } else { #equal };
    };
  };

  module OrderRecord {
    func compareNat(n1 : Nat, n2 : Nat) : Order.Order {
      if (n1 < n2) { #less } else if (n1 > n2) { #greater } else { #equal };
    };

    public func compare(o1 : OrderRecord, o2 : OrderRecord) : Order.Order {
      compareNat(o1.id, o2.id);
    };

    func orderStatusToNat(status : OrderStatus) : Nat {
      switch (status) {
        case (#pending) { 0 };
        case (#confirmed) { 1 };
        case (#delivered) { 2 };
      };
    };

    public func compareByStatusThenId(o1 : OrderRecord, o2 : OrderRecord) : Order.Order {
      let res = compareNat(orderStatusToNat(o1.status), orderStatusToNat(o2.status));
      switch (res) {
        case (#equal) { compareNat(o1.id, o2.id) };
        case (other) { other };
      };
    };

    public func compareDescendingById(a : OrderRecord, b : OrderRecord) : Order.Order {
      if (a.id > b.id) {
        #less;
      } else if (a.id < b.id) {
        #greater;
      } else {
        #equal;
      };
    };
  };

  module PurchaseRecord {
    public func compareByIdDescending(a : PurchaseRecord, b : PurchaseRecord) : Order.Order {
      if (a.id > b.id) {
        #less;
      } else if (a.id < b.id) {
        #greater;
      } else {
        #equal;
      };
    };
  };

  module Customer {
    public func compareById(c1 : Customer, c2 : Customer) : Order.Order {
      if (c1.id < c2.id) { #less } else if (c1.id > c2.id) {
        #greater;
      } else { #equal };
    };
  };

  let staff = Map.empty<Principal.Principal, Staff>();
  let pharmacies = Map.empty<Nat, Pharmacy>();
  let customers = Map.empty<Nat, Customer>();
  let medicines = Map.empty<Nat, Medicine>();
  let orders = Map.empty<Nat, OrderRecord>();
  let purchases = Map.empty<Nat, PurchaseRecord>();
  let inventoryStock = Map.empty<Nat, Int>();

  var nextPharmacyId = 0;
  var nextMedicineId = 0;
  var nextOrderId = 0;
  var nextPurchaseId = 0;
  var nextCustomerId = 0;

  let fortyEightHoursInNanoseconds : Int = 48 * 60 * 60 * 1_000_000_000;
  let oneYearInNanoseconds : Int = 365 * 24 * 60 * 60 * 1_000_000_000;

  public shared ({ caller }) func registerStaff(name : Text, password : Text) : async Bool {
    if (staff.containsKey(caller)) { return true };

    let staffRecord : Staff = {
      name;
      password;
    };

    staff.add(caller, staffRecord);
    true;
  };

  public query ({ caller }) func verifyPassword(name : Text, password : Text) : async Bool {
    for ((_, staffRecord) in staff.entries()) {
      if (staffRecord.name == name and staffRecord.password == password) {
        return true;
      };
    };
    false;
  };

  public shared ({ caller }) func addPharmacy(name : Text, contact : Text, location : Text, code : Text) : async Nat {
    let id = nextPharmacyId;
    nextPharmacyId += 1;

    let pharmacy : Pharmacy = {
      id;
      name;
      contact;
      location;
      code;
    };

    pharmacies.add(id, pharmacy);
    id;
  };

  public shared ({ caller }) func deletePharmacy(id : Nat) : async Bool {
    let result = pharmacies.containsKey(id);
    pharmacies.remove(id);
    result;
  };

  public query ({ caller }) func getPharmacies() : async [Pharmacy] {
    pharmacies.values().toArray().sort();
  };

  public shared ({ caller }) func addCustomer(
    name : Text,
    customerType : CustomerType,
    address : Text,
    area : Text,
    contactNo : Text,
    groupName : Text,
    code : Text,
  ) : async Nat {
    let id = nextCustomerId;
    nextCustomerId += 1;

    let customer : Customer = {
      id;
      name;
      customerType;
      address;
      area;
      contactNo;
      groupName;
      code;
      timestamp = Time.now();
    };

    customers.add(id, customer);
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

  public shared ({ caller }) func addMedicine(
    name : Text,
    price : Nat,
    description : Text,
    company : Text,
    strength : Text,
    packSize : Text,
    genericName : Text,
    batchNo : Text,
    medicineType : Text,
  ) : async Nat {
    let id = nextMedicineId;
    nextMedicineId += 1;

    let medicine : Medicine = {
      id;
      name;
      price;
      description;
      company;
      strength;
      packSize;
      genericName;
      batchNo;
      medicineType;
    };

    medicines.add(id, medicine);
    id;
  };

  public shared ({ caller }) func deleteMedicine(id : Nat) : async Bool {
    let result = medicines.containsKey(id);
    medicines.remove(id);
    result;
  };

  public query ({ caller }) func getMedicines() : async [Medicine] {
    medicines.values().toArray().sort();
  };

  public shared ({ caller }) func createOrder(
    pharmacyId : Nat,
    orderLines : [MedicineItem],
    staffName : Text,
    staffCode : Text,
  ) : async Nat {
    if (not staff.containsKey(caller)) {
      ignore registerStaff(staffName, staffCode);
    };

    let id = nextOrderId;
    nextOrderId += 1;

    let newOrder : OrderRecord = {
      id;
      staffId = caller;
      staffName;
      staffCode;
      pharmacyId;
      orderLines;
      notes = "";
      status = #pending;
      timestamp = Time.now();
      paymentReceived = 0;
      returnItems = [];
      returnReason = "";
      pharmacyCode = "";
    };

    orders.add(id, newOrder);
    id;
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Nat, newStatus : OrderStatus) : async Bool {
    switch (orders.get(orderId)) {
      case (null) { false };
      case (?order) {
        let updatedOrder : OrderRecord = {
          order with status = newStatus
        };
        orders.add(orderId, updatedOrder);
        true;
      };
    };
  };

  public shared ({ caller }) func updateOrderPaymentAndReturn(
    orderId : Nat,
    paymentReceived : Nat,
    returnItems : [ReturnItem],
    returnReason : Text,
    pharmacyCode : Text,
  ) : async Bool {
    switch (orders.get(orderId)) {
      case (null) { false };
      case (?order) {
        let updatedOrder : OrderRecord = {
          order with
          paymentReceived;
          returnItems;
          returnReason;
          pharmacyCode;
        };
        orders.add(orderId, updatedOrder);
        true;
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
    ).sort(OrderRecord.compareDescendingById);
  };

  public query ({ caller }) func getHistoryOrders() : async [OrderRecord] {
    let currentTime = Time.now();
    orders.values().toArray().filter(
      func(order) {
        order.status == #delivered and
        order.timestamp < (currentTime - fortyEightHoursInNanoseconds) and
        order.timestamp >= (currentTime - oneYearInNanoseconds)
      }
    ).sort(OrderRecord.compareDescendingById);
  };

  public query ({ caller }) func getStaffOrders(staffId : Principal.Principal) : async [OrderRecord] {
    orders.values().toArray().filter(
      func(order) { order.staffId == staffId }
    );
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async ?OrderRecord {
    orders.get(orderId);
  };

  public shared ({ caller }) func addPurchase(
    productName : Text,
    genericName : Text,
    batchNo : Text,
    quantity : Nat,
    price : Nat,
    packSize : Text,
    companyName : Text,
    medicineType : Text,
  ) : async Nat {
    let id = nextPurchaseId;
    nextPurchaseId += 1;

    let purchase : PurchaseRecord = {
      id;
      productName;
      genericName;
      batchNo;
      quantity;
      price;
      packSize;
      companyName;
      medicineType;
      timestamp = Time.now();
    };

    purchases.add(id, purchase);
    id;
  };

  public shared ({ caller }) func deletePurchase(id : Nat) : async Bool {
    let result = purchases.containsKey(id);
    purchases.remove(id);
    result;
  };

  public query ({ caller }) func getPurchases() : async [PurchaseRecord] {
    let purchaseArray = purchases.values().toArray();
    purchaseArray.sort(PurchaseRecord.compareByIdDescending);
  };

  // New Functionality

  public shared ({ caller }) func updateOrderLines(
    orderId : Nat,
    pharmacyId : Nat,
    orderLines : [MedicineItem],
    notes : Text,
  ) : async Bool {
    switch (orders.get(orderId)) {
      case (null) { false };
      case (?order) {
        switch (order.status) {
          case (#pending) {
            let updatedOrder : OrderRecord = {
              order with
              orderLines;
              pharmacyId;
              notes;
            };
            orders.add(orderId, updatedOrder);
            true;
          };
          case (_) { false };
        };
      };
    };
  };

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
    let newQty = Int.max(0, currentQty + delta);
    inventoryStock.add(medicineId, newQty);
    true;
  };
};
