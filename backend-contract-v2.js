(() => {"use strict";
window.BackendContractV2=Object.freeze({
 version:"BACKEND_CONTRACT_V2",
 detailCheckout:{method:"POST",path:"/api/create-checkout-session",sameOrigin:true,csrf:true,bindAccountAtCreation:true,serverPrice:980},
 membershipCheckout:{method:"POST",path:"/api/create-subscription-checkout",sameOrigin:true,csrf:true,bindAccountAtCreation:true,serverPrice:490},
 paidRead:{path:"/api/my-order-reading/:orderId",accountOwned:true,noStore:true},
 premiumWrite:{accountOwned:true,csrf:true,paidRequired:true},
 portal:{path:"/api/my-customer-portal",accountOwned:true,csrf:true},
 legacyPublicOrderRoutes:{production:"DISABLED"},
 successUrlUnlock:false
});
})();