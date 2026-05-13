---

### 2. `examples/curl/quick_test.sh`

這是一個自動化的測試腳本，方便開發者快速驗證。

```bash
#!/bin/bash

# --- 配置區 ---
TOKEN="123"
BASE_URL="https://pos.ap3.tw/api"
USER_UID="27016297-1"
AMOUNT="1"

echo "-----------------------------------------------"
echo "ARCpay POS API Quick Test"
echo "-----------------------------------------------"

# 1. Verify
echo "[Step 1] Verifying User..."
VERIFY_RES=$(curl -s -X GET "$BASE_URL/verify/$USER_UID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

PAYMENT_ID=$(echo $VERIFY_RES | sed -n 's/.*"paymentid":"\([^"]*\)".*/\1/p')

if [ -z "$PAYMENT_ID" ]; then
    echo "Error: Could not get Payment ID"
    echo "Response: $VERIFY_RES"
    exit 1
fi
echo "Success! PaymentID: $PAYMENT_ID"

# 2. Execute Charge
echo -e "\n[Step 2] Executing Charge..."
CHARGE_RES=$(curl -s -X POST "$BASE_URL/execute-charge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"txid\": \"$PAYMENT_ID\",
    \"amount\": \"$AMOUNT\",
    \"uid\": \"$USER_UID\"
  }")

echo "Response: $CHARGE_RES"

# 判斷是否需要監控
TXID=$(echo $CHARGE_RES | sed -n 's/.*"txid":"\([^"]*\)".*/\1/p')

if [[ $CHARGE_RES == *"RECHARGE_REQUIRED"* ]]; then
    echo -e "\n[Step 3] Status: RECHARGE_REQUIRED. Starting Monitor..."
    echo "Monitoring TXID: $TXID"
    echo "Please complete payment in Pi App. Checking every 5 seconds..."
    
    while true; do
        STATUS_RES=$(curl -s -X GET "$BASE_URL/events/$TXID" -H "Authorization: Bearer $TOKEN")
        if [[ $STATUS_RES == *"SUCCESS"* ]] && [[ $STATUS_RES == *"pair_verified\":true"* ]]; then
            echo -e "\n✅ Transaction Confirmed!"
            echo $STATUS_RES
            break
        else
            echo -n "."
            sleep 5
        fi
    done
elif [[ $CHARGE_RES == *"\"success\":true"* ]]; then
    echo -e "\n✅ Transaction Completed Directly!"
else
    echo -e "\n❌ Transaction Failed or Session Expired."
fi
