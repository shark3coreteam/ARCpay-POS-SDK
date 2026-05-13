# ARCpay POS SDK

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-POS-orange)
![Network](https://img.shields.io/badge/network-Pi_Network-purple)
---

## 概述
本文件說明 **ARCpay-POS-SDK** 與 POS 機廠商整合的支付流程、API 規格、錯誤處理與整合檢查清單。目標是讓 POS 廠商在取得 **access token** 後，能在其產品內建立支援 ARCpay 的支付流程，引導客戶使用 PI Network 的 KYC 用戶完成付款。

---

本文件專為 POS 廠商設計，說明如何透過 ARCpay API 整合 Pi 幣支付流程，讓您的 POS 產品能夠引導客戶與廣大的 PI Network KYC 用戶進行交易。

## 快速上手
1. 與 ARCpay 完成商務合作並取得 **access token**。  
2. 在 POS UI 中加入掃描 ARCpay QR 的流程，取得付款者的 **uid**。  
3. 後端呼叫 `GET /api/verify/{uid}` 取得 **paymentID**。  
4. 後端呼叫 `POST /api/execute-charge` 發起扣款。  
5. 若回傳需充值，呼叫 `GET /api/events/{txid}` 監控交易狀態，等待 `pair_verified` 與 `status: SUCCESS`。  
6. 交易確認後在 POS 完成本地交易流程（列印收據、更新訂單狀態等）。

---

## API 規格

### 驗證 QR 取得付款者帳號與 paymentID
**說明**：掃描 QR 後呼叫此 API 以確認支付會話並取得 `paymentID`。  
**Method**：GET  
**Endpoint**
```
https://pos.ap3.tw/api/verify/{uid}
```
**Header**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**範例請求**
```bash
curl -X GET "https://pos.ap3.tw/api/verify/27016297-1" \
  -H "Authorization: Bearer {your_accessToken}" \
  -H "Content-Type: application/json"
```

**成功回傳範例**
```json
{
  "app_balance": 16.735,
  "paymentid": "stx2e603309c150b503eb641......",
  "name": "TEST123",
  "status": "WAITING"
}
```

**過期或無效回傳範例**
```json
{
  "error": "該用戶尚未開啟支付功能或 QR 已過期",
  "code": "SESSION_NOT_FOUND"
}
```

**備註**
- `app_balance` 為參考用，POS 可選擇在本地判斷餘額是否足夠再繼續，但非必要。
- 若收到 `SESSION_NOT_FOUND`，請提示使用者重新掃描或重新啟動支付流程。

---

### 發起扣款請求 request Pi coin
**說明**：使用 `paymentID` 與付款者 `uid` 發起扣款。若 POS 使用本地貨幣，請先換算為對應 PI 數量。  
**Method**：POST  
**Endpoint**
```
https://pos.ap3.tw/api/execute-charge
```
**Header**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**範例請求**
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

**可能回應情況**
- **paymentID 過期或不存在**
```json
{"error":"交易會話已過期"}
```
- **用戶餘額不足 需引導充值**
```json
{"success":false,"error":"RECHARGE_REQUIRED","message":"引導用戶使用 Pi SDK 支付","txid":"stx2e603309c150b503eb641......"}
```
- **交易完成**
```json
{"success":true,"txid":"stx2e603309c150b503eb641......","balance":11.735}
```

**備註**
- 若收到 `RECHARGE_REQUIRED`，請轉為監控訂單事件並在 UI 上引導使用者在 ARCpay App 內完成 Pi SDK 支付。

---

### 監控訂單事件
**說明**：當收到 `RECHARGE_REQUIRED` 或需等待用戶在 ARCpay 端完成支付時，POS 應呼叫事件查詢以監控交易狀態。  
**Method**：GET  
**Endpoint**
```
https://pos.ap3.tw/api/events/{txid}
```

**範例請求**
```bash
curl -X GET "https://pos.ap3.tw/api/events/stx2e603309c150b503eb641......"
```

**成功回傳範例**
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
      "target": "pos機測試",
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

**說明重點**
- **transaction_detail** 包含帳本紀錄與交易明細。  
- **pair_verified: true** 表示雙方帳本皆已成功更新，POS 可在確認後完成本地交易流程。

---

## 錯誤處理與建議流程
- **SESSION_NOT_FOUND / 交易會話已過期**  
  - 動作：提示使用者重新掃描 QR 或重新啟動支付流程。  
- **RECHARGE_REQUIRED**  
  - 動作：顯示引導訊息，提示使用者在 ARCpay App 內完成 Pi SDK 支付；後端開始輪詢或使用 webhook/事件機制監控 `txid`。  
- **網路或伺服器錯誤**  
  - 動作：採用指數退避重試；多次失敗後提示使用者稍後重試或改用其他支付方式。  
- **重複請求或重複扣款**  
  - 動作：以 `paymentID` 與 `txid` 作為唯一識別，後端檢查並避免重複處理。  
- **安全性建議**  
  - 所有 API 呼叫必須使用 HTTPS 並帶上有效 `Authorization: Bearer <access_token>`。  
  - 不要在客戶端或公開 repo 中硬編 access token，建議在後端安全儲存並由後端轉發 API 請求。

---

## 整合檢查清單
- **已取得並安全儲存 access token**。  
- **POS UI 能掃描 ARCpay QR 並取得 uid**。  
- **成功呼叫 GET /api/verify/{uid} 並取得 paymentID**。  
- **成功呼叫 POST /api/execute-charge 並處理三種回應情況**（成功、RECHARGE_REQUIRED、過期）。  
- **能呼叫 GET /api/events/{txid} 監控並解析 transaction_detail 與 pair_verified**。  
- **已實作錯誤重試與使用者提示機制**。  
- **已在後端實作日誌與稽核紀錄**（記錄 paymentID、txid、請求時間、回應內容）。

---

## 範例整合序列
1. 使用者在 POS 選擇 PI 支付並掃描 QR，取得 `uid`。  
2. POS 後端呼叫 `GET /api/verify/{uid}` → 取得 `paymentID`。  
3. POS 後端呼叫 `POST /api/execute-charge` 帶入 `paymentID`、`uid`、`amount`、`metadata`。  
4. 若回傳 `RECHARGE_REQUIRED` → POS 前端顯示引導訊息並後端定期呼叫 `GET /api/events/{txid}`。  
5. 當 `transaction_detail.pair_verified == true` 且 `status == SUCCESS` → POS 完成本地交易並列印收據或更新訂單狀態。

---

## 常見問題
- **POS 要不要在本地檢查 app_balance？**  
  - 可選擇性檢查；`app_balance` 僅為參考，實際支付仍以後端交易結果為準。  
- **metadata 有格式限制嗎？**  
  - `metadata` 為 JSON 物件，建議包含店鋪識別與訂單備註，避免放入敏感資料。  
- **如何處理重複請求或重複扣款？**  
  - 以 `paymentID` 與 `txid` 作為唯一識別，後端應檢查重複交易並避免重複扣款。  
- **是否支援 webhook 推播事件？**  
  - 若需 webhook 支援，請與 ARCpay 技術支援聯繫確認可用性與設定方式。

---

## 日誌與稽核建議
- 建議記錄以下欄位以利對帳與除錯：**paymentID、txid、uid、amount、metadata、request timestamp、response payload、HTTP status code**。  
- 建議保留日誌至少 90 天，並對敏感資料進行遮蔽或加密處理。

---

## 聯絡與回報問題
如遇 API 行為與上述文件不符或需進一步協助，請聯絡 ARCpay 技術支援團隊並提供：**paymentID、txid、API 請求時間、回應內容** 以利快速排查。

---
