import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
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
  };

  type Medicine = {
    id : Nat;
    name : Text;
    price : Nat;
    description : Text;
  };

  type MedicineItem = {
    medicineId : Nat;
    quantity : Nat;
  };

  type OrderStatus = {
    #pending;
    #confirmed;
    #delivered;
  };

  type OrderRecord = {
    id : Nat;
    staffId : Principal;
    pharmacyId : Nat;
    status : OrderStatus;
    orderLines : [MedicineItem];
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
  };

  // Persistent storage
  let staff = Map.empty<Principal, Staff>();
  let pharmacies = Map.empty<Nat, Pharmacy>();
  let medicines = Map.empty<Nat, Medicine>();
  let orders = Map.empty<Nat, OrderRecord>();

  var nextPharmacyId = 0;
  var nextMedicineId = 0;
  var nextOrderId = 0;

  public shared ({ caller }) func registerStaff(name : Text, password : Text) : async () {
    if (staff.containsKey(caller)) { Runtime.trap("Staff with this Principal already exists!") };

    let staffRecord : Staff = {
      name;
      password;
    };

    staff.add(caller, staffRecord);
  };

  // Pharmacist functions (TODO: make privileged?)
  public shared ({ caller }) func addPharmacy(name : Text, contact : Text, location : Text) : async Nat {
    let id = nextPharmacyId;
    nextPharmacyId += 1;

    let pharmacy : Pharmacy = {
      id;
      name;
      contact;
      location;
    };

    pharmacies.add(id, pharmacy);
    id;
  };

  public shared ({ caller }) func addMedicine(name : Text, price : Nat, description : Text) : async Nat {
    let id = nextMedicineId;
    nextMedicineId += 1;

    let medicine : Medicine = {
      id;
      name;
      price;
      description;
    };

    medicines.add(id, medicine);
    id;
  };

  // Query methods
  public query ({ caller }) func getPharmacies() : async [Pharmacy] {
    pharmacies.values().toArray().sort();
  };

  public query ({ caller }) func getMedicines() : async [Medicine] {
    medicines.values().toArray().sort();
  };

  // Order Management
  public shared ({ caller }) func createOrder(
    pharmacyId : Nat,
    orderLines : [MedicineItem],
  ) : async Nat {
    if (not staff.containsKey(caller)) { Runtime.trap("Staff member does not exist!") };

    let id = nextOrderId;
    nextOrderId += 1;

    let newOrder : OrderRecord = {
      id;
      staffId = caller;
      pharmacyId;
      orderLines;
      status = #pending;
      timestamp = Time.now();
    };

    orders.add(id, newOrder);
    id;
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Nat, newStatus : OrderStatus) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist!") };
      case (?order) {
        let updatedOrder : OrderRecord = {
          id = order.id;
          staffId = order.staffId;
          pharmacyId = order.pharmacyId;
          orderLines = order.orderLines;
          status = newStatus;
          timestamp = order.timestamp;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public query ({ caller }) func getAllStaffOrders() : async [OrderRecord] {
    orders.values().toArray();
  };

  public query ({ caller }) func getAllOrdersByStatus() : async [OrderRecord] {
    orders.values().toArray().sort(OrderRecord.compareByStatusThenId);
  };

  public query ({ caller }) func getStaffOrders(staffId : Principal) : async [OrderRecord] {
    orders.values().toArray().filter(
      func(order) { order.staffId == staffId }
    );
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async OrderRecord {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order does not exist!") };
      case (?order) { order };
    };
  };
};
