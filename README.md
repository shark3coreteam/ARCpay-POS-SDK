# ARCpay POS SDK

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-POS-orange)
![Network](https://img.shields.io/badge/network-Pi_Network-purple)

---
<!-- README.md 或 README.en.md 內部 -->
English | [繁體中文](README.zh-TW.md)

## Overview
This document describes **ARCpay-POS-SDK** integration for POS vendors: payment flow, API specifications, error handling, and an integration checklist. The goal is to enable POS vendors, after obtaining an **access token** through business cooperation, to implement ARCpay payments in their products and onboard customers who are KYC-verified PI Network users.

This guide is intended for POS vendors and explains how to integrate Pi coin payments via ARCpay APIs so your POS can accept payments from the PI Network KYC user base.

---

## Quick Start
1. Complete business onboarding with ARCpay and obtain an **access token**.  
2. Add ARCpay QR scanning to your POS UI and capture the payer’s **uid**.  
3. Backend calls `GET /api/verify/{uid}` to obtain a **paymentID**.  
4. Backend calls `POST /api/execute-charge` to request payment.  
5. If the response requires a recharge, call `GET /api/events/{txid}` to monitor the transaction until `pair_verified` and `status: SUCCESS`.  
6. After confirmation, complete the local POS flow (print receipt, update order status, etc.).

---

## API Specification

### Verify QR and obtain payer account and paymentID
**Description**: Call this endpoint after scanning the ARCpay QR to confirm the payment session and receive a `paymentID`.  
**Method**: GET  
**Endpoint**
```
https://pos.ap3.tw/api/verify/{uid}
```
**Headers**
- **Authorization**: `Bearer <access_token>`
- **Content-Type**: `application/json`

**Example request**
```bash
curl -X GET "https://pos.ap3.tw/api/verify/12345678-9" \
  -H "Authorization: Bearer {your_accessToken}" \
  -H "Content-Type: application/json"
```

**Successful response example**
```json
{
  "app_balance": 16.735,
  "paymentid": "stx2e603309c150b503eb641......",
  "name": "TEST123",
  "status": "WAITING"
}
```

**Expired or invalid response example**
```json
{
  "error": "該用戶尚未開啟支付功能或 QR 已過期",
  "code": "SESSION_NOT_FOUND"
}
```

**Notes**
- **app_balance** is informational. POS may optionally check it locally but it is not required.
- If you receive **SESSION_NOT_FOUND**, prompt the user to re-scan the QR or restart the payment flow.

---

### Execute charge request for Pi coin
**Description**: Use the `paymentID` and payer `uid` to request the Pi payment. If your POS uses local currency, convert to the corresponding PI amount before calling.  
**Method**: POST  
**Endpoint**
```
https://pos.ap3.tw/api/execute-charge
```
**Headers**
- **Authorization**: `Bearer <access_token>`
- **Content-Type**: `application/json`

**Example request**
```bash
curl -X POST "https://pos.ap3.tw/api/execute-charge" \
  -H "Authorization: Bearer {your_accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentID": "stx2e603309c150b503eb641......",
    "amount": "5",
    "uid": "12345678-7",
    "metadata": {
      "store": "Taipei Store",
      "order_note": "No onions"
    }
  }'
```

**Possible responses**
- **paymentID expired or not found**
```json
{"error":"交易會話已過期"}
```
- **Insufficient balance, guide user to recharge**
```json
{"success":false,"error":"RECHARGE_REQUIRED","message":"引導用戶使用 Pi SDK 支付","txid":"stx2e603309c150b503eb641......"}
```
- **Transaction completed**
```json
{"success":true,"txid":"stx2e603309c150b503eb641......","balance":11.735}
```

**Notes**
- If you receive **RECHARGE_REQUIRED**, switch to monitoring the order events and guide the user to complete payment in the ARCpay app using the Pi SDK.

---

### Monitor order events
**Description**: When `RECHARGE_REQUIRED` is returned or you must wait for the payer to complete payment in ARCpay, call this endpoint to monitor transaction status.  
**Method**: GET  
**Endpoint**
```
https://pos.ap3.tw/api/events/{txid}
```

**Example request**
```bash
curl -X GET "https://pos.ap3.tw/api/events/stx2e603309c150b503eb641......" \
  -H "Authorization: Bearer {your_accessToken}" \
  -H "Content-Type: application/json"
```

**Successful response example**
```json
{
  "data": {
    "txid": "stx2e603309c150b503eb641......",
    "app_wallet": 16.735,
    "name": "TEST123",
    "status": "SUCCESS",
    "created_at": 1778674955400,
    "transferPayload": {
      "txid": "stx2e603309c150b503eb641......",
      "target": "pos_test",
      "receiver_uid": "........",
      "amt": 5,
      "is_merchant": true,
      "metadata": { "store": "Taipei Store", "order_note": "No onions" }
    },
    "transaction_detail": {
      "amount": 4.975,
      "total_billed": 1,
      "fee": 0.25,
      "timestamp": "2026-05-11T12:23:30.533Z",
      "target": "@TEST123.pi",
      "pair_verified": true
    }
  }
}
```

**Key points**
- **transaction_detail** contains ledger records and transaction breakdown.  
- **pair_verified: true** indicates both ledgers have been updated successfully; POS can then finalize the local transaction.

---

## Error Handling and Recommendations
- **SESSION_NOT_FOUND or session expired**  
  - Action: Prompt the user to re-scan the QR or restart the payment flow.
- **RECHARGE_REQUIRED**  
  - Action: Show guidance to the user to complete payment in the ARCpay app; backend should poll or use webhook/event mechanisms to monitor `txid`.
- **Network or server errors**  
  - Action: Use exponential backoff for retries; after repeated failures, prompt the user to try again later or use an alternative payment method.
- **Duplicate requests or double charges**  
  - Action: Use `paymentID` and `txid` as unique identifiers; backend must check for duplicates and prevent double processing.
- **Security recommendations**  
  - All API calls must use HTTPS and include a valid **Authorization: Bearer <access_token>** header.  
  - Do not hardcode access tokens in client-side code or public repositories. Store tokens securely on the backend and proxy requests through your server.

---

## Integration Checklist
- **Access token obtained and stored securely**.  
- **POS UI can scan ARCpay QR and obtain uid**.  
- **Successfully call GET /api/verify/{uid} and receive paymentID**.  
- **Successfully call POST /api/execute-charge and handle three response cases** (success, RECHARGE_REQUIRED, expired).  
- **Can call GET /api/events/{txid} and parse transaction_detail and pair_verified**.  
- **Error retry logic and user-facing prompts implemented**.  
- **Backend logging and audit records implemented** (record paymentID, txid, request time, response payload).

---

## Example Integration Flow
1. User selects PI payment on the POS and scans the ARCpay QR to obtain `uid`.  
2. POS backend calls `GET /api/verify/{uid}` → receives `paymentID`.  
3. POS backend calls `POST /api/execute-charge` with `paymentID`, `uid`, `amount`, and `metadata`.  
4. If response is `RECHARGE_REQUIRED` → POS frontend shows guidance and backend polls `GET /api/events/{txid}`.  
5. When `transaction_detail.pair_verified == true` and `status == SUCCESS` → POS finalizes the local transaction, prints receipt, and updates order status.

---

## FAQ
- **Should POS check app_balance locally?**  
  - Optional. `app_balance` is for reference only; final payment outcome depends on backend transaction results.
- **Are there format restrictions for metadata?**  
  - `metadata` must be a JSON object. Include store identifiers and order notes. Avoid storing sensitive data in metadata.
- **How to prevent duplicate charges?**  
  - Use `paymentID` and `txid` as unique keys. Backend should detect and ignore duplicate processing attempts.
- **Is webhook support available?**  
  - If you require webhook push events, contact ARCpay technical support to confirm availability and configuration.

---

## Logging and Auditing Recommendations
- Log the following fields for reconciliation and debugging: **paymentID, txid, uid, amount, metadata, request timestamp, response payload, HTTP status code**.  
- Retain logs for at least **90 days** and mask or encrypt sensitive fields.

---

## Contact and Support
If API behavior differs from this documentation or you need further assistance, contact ARCpay technical support and provide: **paymentID, txid, API request time, and response payload** to help expedite troubleshooting.

---
