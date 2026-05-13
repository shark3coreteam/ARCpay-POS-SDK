```markdown
# 🐍 Python Integration Example / Python 整合範例

This directory contains a sample implementation of the **ARCpay POS API** using **Python** and the `requests` library.  
此目錄包含使用 **Python** 與 `requests` 函式庫實作 **ARCpay POS API** 的範例程式碼。

---

## 📦 Prerequisites / 準備工作

- **Python**: Version 3.6 or higher / 建議版本 3.6 以上  
- **pip**: Python package installer / Python 套件管理工具  

---

## ⚙️ 1. Setup / 環境設定

### Install Dependencies / 安裝相依套件
Use `pip` to install the required `requests` library:  
使用 `pip` 安裝必要的 `requests` 函式庫：

```bash
pip install requests
```

---

## 🔑 2. Configure Token / 設定 Token

Open `pos_client.py` and replace the token value in the `ARCpayClient` initialization with your actual access token.  
開啟 `pos_client.py` 並將 `ARCpayClient` 初始化中的權杖內容替換為您實際獲取的權杖。

```python
# In pos_client.py
client = ARCpayClient(token="YOUR_ACTUAL_TOKEN")
```

---

## ▶️ 3. Running the Sample / 執行範例

Execute the script directly from your terminal:  
直接在終端機執行腳本：

```bash
python pos_client.py
```

---

## 📂 Code Structure / 程式碼架構說明

The `pos_client.py` script is organized into a clean, reusable class structure:  
`pos_client.py` 腳本採用清晰且可重用的類別結構進行組織：

- **verify_user()**  
  Calls the `/verify` endpoint to validate the user QR code and start a session.  
  驗證用戶：呼叫 `/verify` 接口以驗證用戶 QR 碼並啟動交易會話。

- **execute_charge()**  
  Sends a charge request. Logic checks for direct success or the need for a recharge.  
  執行扣款：發送扣款請求。邏輯上會自動檢查是「直接成功」還是「需要導引充值」。

- **monitor_order()**  
  A polling loop that queries the `/events` API until the transaction status is `SUCCESS` and `pair_verified` is true.  
  監控訂單：一個輪詢迴圈，持續查詢 `/events` API 直到交易狀態為 `SUCCESS` 且 `pair_verified` 為真。

---

## ⚠️ Key Considerations / 開發注意事項

> [!TIP]  
> **Timeout Management / 超時管理**  
> The `monitor_order` function includes a timeout parameter (default **300 seconds**). You can adjust this based on your specific business requirements.  
> `monitor_order` 函式包含一個 **timeout** 參數（預設 **300 秒**）。您可以根據實際業務需求調整此數值。

> [!WARNING]  
> **Data Types / 資料類型**  
> Ensure the `amount` is passed as a **string** to avoid floating-point precision issues during API transmission.  
> 確保 `amount` 以 **字串** 形式傳遞，以避免 API 傳輸過程中出現浮點數精度問題。

---
