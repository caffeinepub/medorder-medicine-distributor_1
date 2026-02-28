import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Time "mo:core/Time";

module {
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
    company : Text;
    strength : Text;
    packSize : Text;
  };

  type MedicineItem = {
    medicineId : Nat;
    quantity : Nat;
    bonusQty : Nat;
    discountPercent : Nat;
  };

  type OrderStatus = {
    #pending;
    #confirmed;
    #delivered;
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
    timestamp : Time.Time;
  };

  type ReturnItem = {
    medicineId : Nat;
    returnedQty : Nat;
  };

  // Old OrderRecord without return-related fields.
  type OldOrderRecord = {
    id : Nat;
    staffId : Principal.Principal;
    staffName : Text;
    staffCode : Text;
    pharmacyId : Nat;
    status : OrderStatus;
    orderLines : [MedicineItem];
    notes : Text;
    timestamp : Time.Time;
  };

  // Old actor state without return-related fields.
  type OldActor = {
    staff : Map.Map<Principal.Principal, Staff>;
    pharmacies : Map.Map<Nat, Pharmacy>;
    medicines : Map.Map<Nat, Medicine>;
    orders : Map.Map<Nat, OldOrderRecord>;
    purchases : Map.Map<Nat, PurchaseRecord>;
    nextPharmacyId : Nat;
    nextMedicineId : Nat;
    nextOrderId : Nat;
    nextPurchaseId : Nat;
    fortyEightHoursInNanoseconds : Int.Int;
    oneYearInNanoseconds : Int.Int;
  };

  // New OrderRecord with return-related fields.
  type NewOrderRecord = {
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

  // New actor state with return-related fields.
  type NewActor = {
    staff : Map.Map<Principal.Principal, Staff>;
    pharmacies : Map.Map<Nat, Pharmacy>;
    medicines : Map.Map<Nat, Medicine>;
    orders : Map.Map<Nat, NewOrderRecord>;
    purchases : Map.Map<Nat, PurchaseRecord>;
    nextPharmacyId : Nat;
    nextMedicineId : Nat;
    nextOrderId : Nat;
    nextPurchaseId : Nat;
    fortyEightHoursInNanoseconds : Int.Int;
    oneYearInNanoseconds : Int.Int;
  };

  public func run(old : OldActor) : NewActor {
    let newOrders = old.orders.map<Nat, OldOrderRecord, NewOrderRecord>(
      func(_id, oldOrder) {
        {
          oldOrder with
          paymentReceived = 0;
          returnItems = [];
          returnReason = "";
          pharmacyCode = "";
        };
      }
    );

    {
      old with orders = newOrders;
    };
  };
};
