
```markdown
# Node.js Integration Example / Node.js 整合範例

This directory contains a sample implementation of the **ARCpay POS API** using **Node.js** and the **axios** library.  
此目錄包含使用 **Node.js** 與 **axios** 函式庫實作 **ARCpay POS API** 的範例程式碼。

---

## 📦 Prerequisites / 準備工作
- **Node.js**: Version 14.x or higher / 建議版本 14.x 以上  
- **npm**: Integrated with Node.js / 隨 Node.js 一併安裝的套件管理器  

---

## ⚙️ 1. Setup / 環境設定

### Install Dependencies / 安裝相依套件
Navigate to this directory and run:  
進入此目錄並執行：

```bash
npm install
```

---

## 🔑 2. Configure Token / 設定 Token

Open `app.js` and update the `ACCESS_TOKEN` in the `CONFIG` object with your actual token.  
開啟 `app.js` 並將 `CONFIG` 物件中的 `ACCESS_TOKEN` 替換為您實際獲取的權杖。

```javascript
const CONFIG = {
    BASE_URL: 'https://pos.ap3.tw/api',
    ACCESS_TOKEN: 'YOUR_ACTUAL_TOKEN',
};
```

---

## ▶️ 3. Running the Sample / 執行範例

Execute the script using the following command:  
使用以下指令執行腳本：

```bash
npm start
```

Alternatively / 或執行:  
```bash
node app.js
```

---

## 📂 Code Structure / 程式碼架構說明

The `app.js` file demonstrates a complete asynchronous workflow:  
`app.js` 檔案展示了完整的非同步處理流程：

- **verifyUser()**  
  Scans the user QR and retrieves the session `paymentid`.  
  驗證用戶：掃描用戶 QR 碼並獲取該次交易會話的 `paymentid`。

- **executeCharge()**  
  Requests the payment. Handles both immediate success and the "Recharge Required" scenario.  
  執行扣款：請求支付。能同時處理「直接扣款成功」與「餘額不足需補款」的情境。

- **monitorOrder()**  
  A polling mechanism that checks the transaction status until finalized on the blockchain (`pair_verified: true`).  
  監控訂單：輪詢機制，持續檢查交易狀態直到帳本確認同步（`pair_verified: true`）。

---

## ⚠️ Key Considerations / 開發注意事項

> [!TIP]  
> **Polling Interval**: The example uses a 3-second interval for monitoring. You can adjust this based on your POS hardware performance.  
> **輪詢間隔**：範例預設每 3 秒檢查一次狀態。您可以根據 POS 硬體效能調整此間隔。

---
