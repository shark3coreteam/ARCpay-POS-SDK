const axios = require('axios');

// 配置資訊 (實際開發建議放入 .env 檔案)
const CONFIG = {
    BASE_URL: 'https://pos.ap3.tw/api',
    ACCESS_TOKEN: '123', // 請替換為正式的商務合作 Token
};

// 建立 Axios 實例
const api = axios.create({
    baseURL: CONFIG.BASE_URL,
    headers: {
        'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

/**
 * 步驟 1: 驗證用戶並獲取 Payment ID
 */
async function verifyUser(uid) {
    try {
        console.log(`[Verify] 正在驗證用戶: ${uid}...`);
        const response = await api.get(`/verify/${uid}`);
        console.log('[Verify] 成功獲取支付資訊:', response.data);
        return response.data; // 包含 paymentid, app_balance 等
    } catch (error) {
        console.error('[Verify] 失敗:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 步驟 2: 執行支付請求
 */
async function executeCharge(paymentID, uid, amount, metadata = {}) {
    try {
        console.log(`[Charge] 正在請求支付: ${amount} Pi...`);
        const response = await api.post('/execute-charge', {
            paymentID,
            amount,
            uid,
            metadata
        });
        return response.data;
    } catch (error) {
        console.error('[Charge] 失敗:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 步驟 3: 監控訂單狀態 (輪詢直到成功)
 */
async function monitorOrder(txid) {
    console.log(`[Monitor] 啟動訂單監控, TXID: ${txid}`);
    
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const response = await api.get(`/events/${txid}`);
                const orderData = response.data.data;

                if (orderData.status === 'SUCCESS' && orderData.transaction_detail?.pair_verified) {
                    console.log('[Monitor] 交易確認成功！');
                    clearInterval(interval);
                    resolve(orderData);
                } else {
                    console.log(`[Monitor] 當前狀態: ${orderData.status}, 等待用戶操作...`);
                }
            } catch (error) {
                console.error('[Monitor] 輪詢發生錯誤:', error.message);
                // 視情況決定是否要 clearInterval
            }
        }, 3000); // 每 3 秒檢查一次
    });
}

/**
 * 主流程範例
 */
async function runPaymentFlow(userUid, amount) {
    try {
        // 1. 驗證
        const verifyData = await verifyUser(userUid);
        const { paymentid } = verifyData;

        // 2. 扣款
        const chargeResult = await executeCharge(paymentid, userUid, amount, {
            store: "Taipei Store",
            order_note: "No onions"
        });

        // 3. 判斷結果
        if (chargeResult.success) {
            console.log('✅ 交易直接完成 (內部帳本扣款):', chargeResult.txid);
        } else if (chargeResult.error === 'RECHARGE_REQUIRED') {
            console.log('⚠️ 用戶餘額不足，已導引至 Pi SDK，開始監控狀態...');
            const finalOrder = await monitorOrder(chargeResult.txid);
            console.log('✅ 交易最終完成:', finalOrder.txid);
        }

    } catch (err) {
        console.error('❌ 支付流程中斷:', err.message);
    }
}

// 執行測試 (以您的範例 UID 為例)
runPaymentFlow('27016297-1', '20');
