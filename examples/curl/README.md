# cURL Integration Example / cURL 測試範例

This directory contains shell scripts and command-line examples for testing the ARCpay POS API.
此目錄包含用於測試 ARCpay POS API 的 Shell 腳本與命令列範例。

## 🚀 Quick Start / 快速開始

You can use the provided `quick_test.sh` to run through the flow, or copy the commands below.
您可以使用提供的 `quick_test.sh` 執行完整流程，或直接複製下方的指令。

### Step 1: Verify User / 驗證用戶
```bash
curl -X GET "[https://pos.ap3.tw/api/verify/12345678-9](https://pos.ap3.tw/api/verify/12345678-9)" \
  -H "Authorization: Bearer {your_accessToken}" \
  -H "Content-Type: application/json"
```

### Step 2: Execute Charge / 執行扣款
Replace PAYMENT_ID with the ID obtained from Step 1.
將 PAYMENT_ID 替換為步驟 1 獲得的 ID。
```bash
curl -X POST "[https://pos.ap3.tw/api/execute-charge](https://pos.ap3.tw/api/execute-charge)" \
  -H "Authorization: Bearer {your_accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentID": "YOUR_PAYMENT_ID",
    "amount": "20",
    "uid": "12345678-9",
    "metadata": { "store": "Store_001" }
  }'
```

### Step 3: Monitor Status / 監控狀態
If the response was RECHARGE_REQUIRED, monitor the txid.
若回傳為 RECHARGE_REQUIRED，請監控該 txid。
```bash
curl -X GET "[https://pos.ap3.tw/api/events/YOUR_TXID](https://pos.ap3.tw/api/events/YOUR_TXID)"
```

```bash
chmod +x quick_test.sh
./quick_test.sh
```
