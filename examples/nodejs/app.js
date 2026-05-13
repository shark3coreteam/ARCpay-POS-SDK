/**
 * ARCpay POS SDK - Node.js Integration Example
 * ARCpay POS SDK - Node.js 整合範例實作
 * 
 * Dependencies: axios (npm install axios)
 */

const axios = require('axios');

// --- Configuration / 配置資訊 (實際開發建議放入 .env 檔案)
const CONFIG = {
    // The base URL for ARCpay POS API / ARCpay POS API 基礎路徑
    BASE_URL: 'https://pos.ap3.tw/api',
    // Your Business Access Token / 您的商務合作權杖
    ACCESS_TOKEN: '123', 
};

// Initialize Axios Instance / 初始化 Axios 實例
const api = axios.create({
    baseURL: CONFIG.BASE_URL,
    headers: {
        'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Step 1: Verify User and Get Payment ID
 * 步驟 1: 驗證用戶並獲取支付 ID
 * @param {string} uid - User's ARCpay account / 用戶 ARCpay 帳號
 */
async function verifyUser(uid) {
    try {
        console.log(`[Verify] Verifying user / 正在驗證用戶: ${uid}...`);
        const response = await api.get(`/verify/${uid}`);
        
        // Success: returns paymentid, app_balance, name, status
        // 成功：回傳包含 paymentid, app_balance, 姓名與狀態
        console.log('[Verify] Success / 獲取成功:', response.data);
        return response.data; 
    } catch (error) {
        console.error('[Verify] Failed / 失敗:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Step 2: Execute Charge Request
 * 步驟 2: 執行扣款請求
 * @param {string} paymentID - Obtained from Step 1 / 從步驟 1 獲得的 ID
 * @param {string} uid - User's account / 付款方帳號
 * @param {string} amount - Amount in Pi / 欲扣除的 Pi 數量
 */
async function executeCharge(paymentID, uid, amount, metadata = {}) {
    try {
        console.log(`[Charge] Requesting / 請求扣款: ${amount} Pi...`);
        const response = await api.post('/execute-charge', {
            paymentID,
            amount,
            uid,
            metadata
        });
        return response.data;
    } catch (error) {
        console.error('[Charge] Failed / 失敗:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Step 3: Monitor Order Status (Polling)
 * 步驟 3: 監控訂單狀態 (輪詢)
 * @param {string} txid - Transaction ID to monitor / 欲監控的交易序號
 */
async function monitorOrder(txid) {
    console.log(`[Monitor] Starting monitor / 啟動監控, TXID: ${txid}`);
    
    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            try {
                const response = await api.get(`/events/${txid}`);
                const orderData = response.data.data;

                // Check if status is SUCCESS and pair_verified is true
                // 確認狀態為 SUCCESS 且雙方帳本校對成功 (pair_verified)
                if (orderData.status === 'SUCCESS' && orderData.transaction_detail?.pair_verified) {
                    console.log('[Monitor] Transaction Confirmed / 交易確認成功！');
                    clearInterval(interval);
                    resolve(orderData);
                } else {
                    console.log(`[Monitor] Current Status / 當前狀態: ${orderData.status}...`);
                }
            } catch (error) {
                console.error('[Monitor] Polling Error / 輪詢錯誤:', error.message);
            }
        }, 3000); // Check every 3 seconds / 每 3 秒檢查一次
    });
}

/**
 * Main Payment Flow Example
 * 主支付流程範例
 */
async function runPaymentFlow(userUid, amount) {
    try {
        // 1. Verify User / 驗證用戶
        const verifyData = await verifyUser(userUid);
        const { paymentid } = verifyData;

        // 2. Execute Charge / 執行扣款
        const chargeResult = await executeCharge(paymentid, userUid, amount, {
            store: "Taipei Store",
            order_note: "No onions"
        });

        // 3. Process Result / 處理結果
        if (chargeResult.success) {
            // Case A: Paid directly from internal balance
            // 情境 A: 直接從內部餘額扣款完成
            console.log('✅ Completed Directly / 交易直接完成:', chargeResult.txid);
        } else if (chargeResult.error === 'RECHARGE_REQUIRED') {
            // Case B: Insufficient balance, guide to Pi SDK payment
            // 情境 B: 餘額不足，引導用戶進行 Pi SDK 支付，開始監控
            console.log('⚠️ Recharge Required / 需導引支付，開始監控狀態...');
            const finalOrder = await monitorOrder(chargeResult.txid);
            console.log('✅ Final Success / 交易最終完成:', finalOrder.txid);
        }

    } catch (err) {
        console.error('❌ Flow Interrupted / 流程中斷:', err.message);
    }
}

// --- Run Test / 執行測試 ---
// Replace with actual test UID and amount / 替換為實際測試的 UID 與金額
runPaymentFlow('12345678-9', '1');
