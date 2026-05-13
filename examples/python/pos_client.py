import requests
import time
import json

class ARCpayClient:
    def __init__(self, token):
        self.base_url = "https://pos.ap3.tw/api"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def verify_user(self, uid):
        """步驟 1: 驗證用戶並獲取 paymentID"""
        print(f"[Verify] 正在驗證用戶: {uid}...")
        url = f"{self.base_url}/verify/{uid}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[Verify] 成功！PaymentID: {data.get('paymentid')}")
            return data
        else:
            print(f"[Verify] 失敗: {response.text}")
            return None

    def execute_charge(self, payment_id, uid, amount, metadata=None):
        """步驟 2: 執行扣款請求"""
        print(f"[Charge] 請求扣款: {amount} Pi...")
        url = f"{self.base_url}/execute-charge"
        payload = {
            "paymentID": payment_id,
            "uid": uid,
            "amount": str(amount),
            "metadata": metadata or {}
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

    def monitor_order(self, txid, interval=3, timeout=300):
        """步驟 3: 監控訂單狀態直到成功"""
        print(f"[Monitor] 啟動監控, TXID: {txid}")
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            try:
                url = f"{self.base_url}/events/{txid}"
                response = requests.get(url, headers=self.headers)
                res_data = response.json()
                
                # 取得內層 data 資訊
                order_data = res_data.get("data", {})
                status = order_data.get("status")
                
                if status == "SUCCESS":
                    # 確認雙方帳本皆更新成功
                    detail = order_data.get("transaction_detail", {})
                    if detail.get("pair_verified"):
                        print("[Monitor] 交易最終確認成功！")
                        return order_data
                
                print(f"[Monitor] 當前狀態: {status}，等待中...")
            except Exception as e:
                print(f"[Monitor] 查詢出錯: {e}")
            
            time.sleep(interval)
            
        print("[Monitor] 監控超時")
        return None

# --- 使用範例 ---
if __name__ == "__main__":
    # 初始化客戶端 (填入您的 accessToken)
    client = ARCpayClient(token="123")
    
    USER_UID = "27016297-1"
    AMOUNT = "20"
    
    # 1. 驗證
    verify_res = client.verify_user(USER_UID)
    
    if verify_res and "paymentid" in verify_res:
        pid = verify_res["paymentid"]
        
        # 2. 扣款
        charge_res = client.execute_charge(pid, USER_UID, AMOUNT, {
            "store": "Taipei Store",
            "order_note": "Python Example"
        })
        
        # 3. 處理結果
        if charge_res.get("success"):
            print(f"✅ 交易直接完成！TXID: {charge_res.get('txid')}")
        elif charge_res.get("error") == "RECHARGE_REQUIRED":
            print("⚠️ 餘額不足，引導用戶使用 Pi SDK 支付...")
            final_order = client.monitor_order(charge_res.get("txid"))
            if final_order:
                print(f"✅ 監控完成！交易編號: {final_order.get('txid')}")
        else:
            print(f"❌ 支付失敗: {charge_res.get('error')}")
