# MedFlow -- User Backend Sync Fix

## Current State
User Management mein `handleAddUser` function pehle user ko localStorage mein save karta hai, phir backend call karta hai. Agar backend call succeed bhi kare, `toast.success` hamesha chal jaata hai chahe backend save hua ya nahi. Backend sync on-mount logic bhi hai lekin `getStaffByDistributor` return empty ho to early return kar leta hai -- agar koi bhi staff nahi to local-only users backend mein sync nahi hote.

Login flow: Mobile par `verifyStaffLoginForDistributor` call hota hai -- agar user backend mein nahi hai to "invalid username or password" aata hai.

## Requested Changes (Diff)

### Add
- `isAddingUser` loading state jab user add ho raha ho
- Manual "Sync Users to Backend" button in User Management -- jo sab local-only users ko backend mein push kare
- Backend sync on-mount ko fix karo: agar `staffList` empty bhi ho tab bhi local-only users backend mein sync hon

### Modify
- `handleAddUser`: user pehle **backend mein save karo**, tab localStorage mein -- agar backend fail ho to user add hi mat karo aur clear error dikhao
- Backend sync useEffect: `if (!staffList || staffList.length === 0) return;` line hataao -- local-only users hamesha sync hon chahe backend list empty ho
- Add button: loading state show karo jab backend save ho raha ho

### Remove
- Pehle wali logic jo user localStorage mein save karta tha before backend confirmation

## Implementation Plan
1. `handleAddUser` mein flow reverse karo: pehle `addStaffForDistributor` call karo, agar succeed ho tab user localStorage mein save karo with `backendStaffId`. Agar fail ho to error dikhao aur return karo.
2. `isAddingUser` state add karo -- button disabled + loading text show karo jab backend call chal rahi ho.
3. Backend sync useEffect mein early return hataao -- `staffList` empty ho tab bhi localOnlyUsers sync karo.
4. Manual sync button add karo User Management mein -- click par sab `backendStaffId`-less users ko backend mein push karo.
