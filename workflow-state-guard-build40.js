export const ORDER_STATES=Object.freeze(["pending","awaiting_payment","paid","payment_failed"]);
export const PALM_STATES=Object.freeze(["pending_upload","uploaded","processing","delete_pending","deleted"]);
const orderTransitions=new Map([
 ["pending",new Set(["awaiting_payment","paid","payment_failed"])],
 ["awaiting_payment",new Set(["paid","payment_failed"])],
 ["paid",new Set([])],["payment_failed",new Set([])]
]);
const palmTransitions=new Map([
 ["pending_upload",new Set(["uploaded","deleted"])],["uploaded",new Set(["processing","delete_pending","deleted"])],
 ["processing",new Set(["delete_pending","deleted"])],["delete_pending",new Set(["deleted"])],["deleted",new Set([])]
]);
export function transitionAllowed(kind,from,to){
 const m=kind==="order"?orderTransitions:kind==="palm"?palmTransitions:null;
 return !!m?.get(from)?.has(to);
}
export function assertTransition(kind,from,to){if(!transitionAllowed(kind,from,to)){const e=new Error("INVALID_STATE_TRANSITION");e.code="INVALID_STATE_TRANSITION";throw e}return true}
