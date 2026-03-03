import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

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
    staffId : Principal;
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

  type OldMedicine = {
    id : Nat;
    name : Text;
    price : Nat;
    description : Text;
    company : Text;
    strength : Text;
    packSize : Text;
  };

  type OldPurchaseRecord = {
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

  // Persistent storage for old actor
  type OldActor = {
    staff : Map.Map<Principal, Staff>;
    pharmacies : Map.Map<Nat, Pharmacy>;
    medicines : Map.Map<Nat, OldMedicine>;
    orders : Map.Map<Nat, OrderRecord>;
    purchases : Map.Map<Nat, OldPurchaseRecord>;
    nextPharmacyId : Nat;
    nextMedicineId : Nat;
    nextOrderId : Nat;
    nextPurchaseId : Nat;
  };

  // Persistent storage for new actor
  type NewActor = {
    staff : Map.Map<Principal, Staff>;
    pharmacies : Map.Map<Nat, Pharmacy>;
    customers : Map.Map<Nat, Customer>;
    medicines : Map.Map<Nat, Medicine>;
    orders : Map.Map<Nat, OrderRecord>;
    purchases : Map.Map<Nat, PurchaseRecord>;
    nextPharmacyId : Nat;
    nextMedicineId : Nat;
    nextOrderId : Nat;
    nextPurchaseId : Nat;
    nextCustomerId : Nat;
  };

  public func run(state : OldActor) : NewActor {
    let newMedicines = state.medicines.map<Nat, OldMedicine, Medicine>(
      func(_id, oldMedicine) {
        { oldMedicine with genericName = ""; batchNo = ""; medicineType = "" };
      }
    );
    let newPurchases = state.purchases.map<Nat, OldPurchaseRecord, PurchaseRecord>(
      func(_id, oldPurchase) {
        { oldPurchase with medicineType = "" };
      }
    );
    {
      state with
      customers = Map.empty<Nat, Customer>();
      medicines = newMedicines;
      purchases = newPurchases;
      nextCustomerId = 0;
    };
  };
};
