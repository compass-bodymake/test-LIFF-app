import './style.css';
import liff from '@line/liff';

// 各グローバル変数を定義
let IS_PRODUCTION_FLG = false;
let userId = null;
let displayName = null;
let token = null;

// ✅ GASのURLは関数にして毎回評価
function getGASUrl() {
    return IS_PRODUCTION_FLG
        // 本番環境
        ? "https://script.google.com/macros/s/AKfycbw_qZ108jgUiDIIzmaPW6vCB9oVI24qRYpyE36qNVsRdHCpwXzP9Dbz0DmdpGBwR9Mk/exec"
        // テスト環境
        : "https://script.google.com/macros/s/AKfycbzN_NAyQrfPDtZzRdXNwD0YejvVbMl3yFibX2s452uyaiDHyaMGkQuhYkLWwYRweCEoVw/exec";
}

// ✅ URLパラメータを取得する関数
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries());
}

// ✅ LIFFを初期化する関数（開いたら即閉じる）
async function initializeLIFF() {
    try {
        console.log("LIFFの初期化を開始...");
        console.log("現在のバージョン v3");

        const currentUrl = window.location.href;

        // 2006759470-npBm9MxrがURLに含まれていたら本番環境
        IS_PRODUCTION_FLG = currentUrl.includes("2006759470-npBm9Mxr");

        const currentLIFFId = IS_PRODUCTION_FLG
            ? "2006759470-npBm9Mxr" // 本番
            : "2007474035-goRlynEz"; // テスト

        console.log("🌐 適用される LIFF ID:", currentLIFFId);
        console.log("💡 IS_PRODUCTION_FLG:", IS_PRODUCTION_FLG);


        // URLパラメータ先に取得
        const urlParams = getUrlParams();

        await liff.init({ liffId: currentLIFFId });

        console.log("✅ LIFF初期化成功！");

        // ✅ ログインしていなければログイン処理を行う
        if (!liff.isLoggedIn()) {
            console.log("LINEログインが必要です");
            liff.login();
            return;
        }
        console.log("ログイン済み！ユーザー情報、URLパラメータを取得します");

        // ✅ `liff.init()` 完了後にURLパラメータを取得
        console.log("取得したURLパラメータ:", urlParams);
        token = urlParams.token;

        // ✅ ユーザー情報を取得 (LINE IDとLINE名)
        const profile = await liff.getProfile();
        userId = profile.userId;
        displayName = profile.displayName;

        console.log("ユーザーID:", userId);
        console.log("表示名:", displayName);
        console.log("取得したURLパラメータ:", urlParams);
        console.log("token:", token);
        console.log("GASにPOST");

        // ✅ **開いた瞬間に閉じる**
        await sendToGAS(userId, displayName, token);
        setTimeout(() => {
            liff.closeWindow();
        }, 1000); 
        // 1秒後に閉じる
    } catch (error) {
        console.error("LIFFの初期化に失敗:", error);
    }
}

// ✅ GASにLINE IDと名前を送信する関数（バックグラウンド処理）
async function sendToGAS(userId, displayName, token) {
    try {
        console.log("GASへデータ送信中......", userId, displayName, token);

        const formData = new URLSearchParams();
        formData.append("userId", userId);
        formData.append("displayName", displayName);
        formData.append("token", token);

        const response = await fetch(getGASUrl(), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const result = await response.json();
        console.log("GASのレスポンス:", result);

    } catch (error) {
        console.error("GAS送信エラー:", error);
    }
}

// ✅ 初期化関数を実行
initializeLIFF();
