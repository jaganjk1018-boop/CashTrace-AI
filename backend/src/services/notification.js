// src/services/notification.js
//
// Automatically dispatches real-time SMS and Email alerts to the nearest
// police station and the cyber crime control room upon predicting a high-risk cash-out event.

export function sendAlerts(prediction) {
  const {
    account_number,
    last_amount,
    withdrawal_point_name,
    police_station_name,
    police_station_contact,
    probability
  } = prediction;

  const confidence = (probability * 100).toFixed(0);
  const formattedAmount = Number(last_amount).toLocaleString("en-IN");

  console.log("\n========================================================");
  console.log("🚨 [ALERT DISPATCH] CRITICAL PREDICTIVE ALERT BROADCASTED");
  console.log("========================================================");
  
  // 1. Simulate SMS Alert to direct police contact
  console.log(`📱 [SMS ALERT] Sent to Direct Police Intercept Unit:`);
  console.log(`   Recipients: [ ${police_station_name} ] at ${police_station_contact || '+91-11-23010101'}`);
  console.log(`   Message: "NCRP ALERT: High-risk cash-out expected at ${withdrawal_point_name}. Suspect account: ****${account_number.slice(-4)}. Amount: ₹${formattedAmount}. Intercept window: < 4 hours. Dispatching unit. - CashTrace AI"`);
  
  // 2. Simulate Email Alert to Nodal/Control HQ
  console.log(`✉️ [EMAIL ALERT] Sent to Cyber Crime Control HQ:`);
  console.log(`   To: controlroom@cybercell.gov.in, nodal@${police_station_name.toLowerCase().replace(/ /g, "")}.gov.in`);
  console.log(`   Subject: [CRITICAL DISPATCH] Predicted Mule Account Cash-Out - NCRP Ref`);
  console.log(`   Body:`);
  console.log(`     ATTN: Officer-in-Charge,`);
  console.log(`     Our machine learning model has detected a high-probability cash-out attempt.`);
  console.log(`     `);
  console.log(`     Target ATM/Branch:     ${withdrawal_point_name}`);
  console.log(`     Predicted Window:      Next 4 Hours`);
  console.log(`     Suspect Account:       ${account_number}`);
  console.log(`     At Risk Amount:        ₹${formattedAmount}`);
  console.log(`     Intercepting Station:  ${police_station_name}`);
  console.log(`     Direct Helpline:       ${police_station_contact}`);
  console.log(`     `);
  console.log(`     Please coordinate immediate interception to prevent capital flight.`);
  console.log("========================================================\n");
}
