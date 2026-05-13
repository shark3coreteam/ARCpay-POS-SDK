import requests
import time
import json

class ARCpayClient:
    """
    ARCpay POS API Client Example
    ARCpay POS API 客戶端整合範例
    """
    def __init__(self, token):
        self.base_url = "https://pos.ap3.tw/api"
        # Authorization header with Bearer Token
        # 使用 Bearer Token 進行身份驗證
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def verify_user(self, uid):
        """
        Step 1: Verify user and get paymentID
        步驟 1: 驗證用戶並獲取 paymentID
        """
        print(f"[Verify] Verifying user / 正在驗證用戶: {uid}...")
        url = f"{self.base_url}/verify/{uid}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[Verify] Success / 成功！PaymentID: {data.get('paymentid')}")
            return data
        else:
            print(f"[Verify] Failed / 失敗: {response.text}")
            return None

    def execute_charge(self, payment_id, uid, amount, metadata=None):
        """
        Step 2: Execute the charge request
        步驟 2: 執行扣款請求
        """
        print(f"[Charge] Requesting / 請求扣款: {amount} Pi...")
        url = f"{self.base_url}/execute-charge"
        payload = {
            "txid": payment_id,
            "uid": uid,
            "amount": str(amount), # Ensure amount is a string / 確保金額為字串
            "metadata": metadata or {}
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

    def monitor_order(self, txid, interval=3, timeout=300):
        """
        Step 3: Monitor order status until success (Polling)
        步驟 3: 監控訂單狀態直到成功 (輪詢)
        """
        print(f"[Monitor] Starting monitor / 啟動監控, TXID: {txid}")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                url = f"{self.base_url}/events/{txid}"
                response = requests.get(url, headers=self.headers)
                res_data = response.json()
                
                # Get inner data object / 取得內層 data 物件
                order_data = res_data.get("data", {})
                status = order_data.get("status")
                
                # Check if status is SUCCESS and pair_verified is true
                # 確認狀態為 SUCCESS 且雙方帳本校對成功 (pair_verified)
                if status == "SUCCESS":
                    detail = order_data.get("transaction_detail", {})
                    if detail.get("pair_verified"):
                        print("[Monitor] Transaction Confirmed / 交易最終確認成功！")
                        return order_data
                
                print(f"[Monitor] Current Status / 當前狀態: {status}, waiting...")
            except Exception as e:
                print(f"[Monitor] Polling Error / 查詢出錯: {e}")
            
            time.sleep(interval) # Wait for next poll / 等待下次輪詢
            
        print("[Monitor] Timeout / 監控超時")
        return None

# --- Main Flow Example / 主流程範例 ---
if __name__ == "__main__":
    # Replace with your actual accessToken / 替換為您的正式權杖
    client = ARCpayClient(token="123")
    
    # Example values / 範例數值
    USER_UID = "12345678-9"
    AMOUNT = "1"
    
    # 1. Verify / 驗證
    verify_res = client.verify_user(USER_UID)
    
    if verify_res and "paymentid" in verify_res:
        pid = verify_res["paymentid"]
        
        # 2. Charge / 扣款
        charge_res = client.execute_charge(pid, USER_UID, AMOUNT, {
            "store": "Taipei Store",
            "order_note": "No onions"
        })
        
        # 3. Handle Result / 處理結果
        if charge_res.get("success"):
            # Case: Direct success / 情境：直接扣款完成
            print(f"✅ Success / 交易直接完成！TXID: {charge_res.get('txid')}")
        elif charge_res.get("error") == "RECHARGE_REQUIRED":
            # Case: Insufficient balance / 情境：餘額不足，啟動監控
            print("⚠️ Recharge Required / 需導引支付，開始監控狀態...")
            final_order = client.monitor_order(charge_res.get("txid"))
            if final_order:
                print(f"✅ Final Success / 監控完成！交易編號: {final_order.get('txid')}")
        else:
            print(f"❌ Failed / 支付失敗: {charge_res.get('error')}")
