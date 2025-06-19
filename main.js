import './style.css';
import liff from '@line/liff';

// 各グローバル変数を定義
let IS_PRODUCTION_FLG = false;
let userType = "client"; // デフォルト
let userId = null;
let displayName = null;

// ✅ GASのURLは関数にして毎回評価
function getGASUrl() {
  return IS_PRODUCTION_FLG
    // 本番環境
    ? "https://script.google.com/macros/s/AKfycbw_qZ108jgUiDIIzmaPW6vCB9oVI24qRYpyE36qNVsRdHCpwXzP9Dbz0DmdpGBwR9Mk/exec"
    // テスト環境
    : "https://script.google.com/macros/s/AKfycbz_cX3vs-DGPEL39JGDVzt7sTtRjPgArB2aFOR1veJRWsLdMbpEuTC2lnllxxZv38eexg/exec";
}

// ✅ URLパラメータを取得する関数
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries());
}

// ✅ URLパラメータから `skipRedirect` の値を取得
function getSkipRedirectType() {
    const params = new URLSearchParams(window.location.search);
    const skipRedirect = params.get("skipRedirect");

    // ✅ テスト用も含めて判定
    if (["coach", "client", "test_coach", "test_client"].includes(skipRedirect)) {
        if (skipRedirect === "test_coach") return "coach";
        if (skipRedirect === "test_client") return "client";
        return skipRedirect;
    }

    return null;
}

// ✅ LIFFを初期化する関数（開いたら即閉じる）
async function initializeLIFF() {
     try {
        console.log("LIFFの初期化を開始...");

       // URLから本番かテストかを自動判定
       const currentUrl = window.location.href;
       IS_PRODUCTION_FLG = currentUrl.includes("2006759470-npBm9Mxr");

       const currentLIFFId = IS_PRODUCTION_FLG
         ? "2006759470-npBm9Mxr" // 本番
         : "2007474035-goRlynEz"; // テスト
       
       console.log("🌐 適用される LIFF ID:", currentLIFFId);
       console.log("💡 IS_PRODUCTION_FLG:", IS_PRODUCTION_FLG);

  
       // URLパラメータ先に取得
       const urlParams = getUrlParams();
       const paramType = urlParams.type;

       console.log("💡 現在のURLパラメータ:", urlParams); // ← ここ重要

       await liff.init({ liffId: currentLIFFId });

        console.log("✅ LIFF初期化成功！");

        // ✅ `liff.init()` 完了後にURLパラメータを取得
        console.log("取得したURLパラメータ:", urlParams);
       userType = urlParams.type || "client";
       
        // ✅ テスト用パラメータを通常の挙動にマッピング
        if (userType === "test_coach") {
            userType = "coach";
            IS_PRODUCTION_FLG = false;
        }
        if (userType === "test_client") {
            userType = "client";
            IS_PRODUCTION_FLG = false;
        }

        // ✅ ログインしていなければログイン処理を行う
        if (!liff.isLoggedIn()) {
            console.log("LINEログインが必要です");
            liff.login();
            return;
        }

        console.log("ログイン済み！ユーザー情報を取得します");
        console.log(userType, IS_PRODUCTION_FLG); // テスト用ログ


        // ✅ ユーザー情報を取得 (LINE IDとLINE名)
        const profile = await liff.getProfile();
        userId = profile.userId;
        displayName = profile.displayName;

        console.log("ユーザーID:", userId);
        console.log("表示名:", displayName);

       // ✅ **開いた瞬間に閉じる**
setTimeout(() => {
    const userTypeFromURL = getSkipRedirectType();

    // ✅ URLパラメータで `skipRedirect=coach` または `skipRedirect=client` の場合、リダイレクトせずにデータ送信
    if (userTypeFromURL) {
        console.log(`✅ ${userTypeFromURL} のリダイレクトスキップが指定されました。`);
        sendToGAS(userId, displayName, userTypeFromURL); // 🚀 送信処理を実行
        liff.closeWindow();
        return;
    }
  

    // // ✅ 通常のリダイレクト処理
    // const redirectUrl = IS_PRODUCTION_FLG 
    //     // 本番環境
    //     ? "https://liff.line.me/2006759470-OZ0a7wX8?unique_key=7SDwrl&ts=1748956494"
    //     // テスト環境
    //     : "https://liff.line.me/2007474035-rBkeNA5R?unique_key=A72dog&ts=1749818069";



  // ✅ 環境とユーザー種別に応じたリダイレクト処理　⚠️一時対応→本番環境にメール認証追加時に削除する⚠️
let redirectUrl;

if (!IS_PRODUCTION_FLG) {
    // テスト環境の場合
    redirectUrl = "https://liff.line.me/2007474035-rBkeNA5R?unique_key=A72dog&ts=1749818069";
} else {
    // 本番環境の場合
    redirectUrl = (userType === "coach")
        ? "https://liff.line.me/2006759470-OZ0a7wX8?unique_key=GOCZ7R&ts=1740514622"
        : "https://liff.line.me/2006759470-OZ0a7wX8?unique_key=Ve3HHH&ts=1740514466";
}


  
    console.log(`✅ ${userType} 用のリダイレクト: ${redirectUrl}`);

    // ✅ 新しいウィンドウで開く
    liff.openWindow({
        url: redirectUrl,
        external: true, // LINE外のブラウザで開く
    });

    console.log("LIFFアプリを閉じます...");
    liff.closeWindow();
}, 100);
 // 0.5秒後に閉じる（即時でもOK）
     
    sendToGAS(userId, displayName, userType);
    } catch (error) {
        console.error("LIFFの初期化に失敗:", error);
    }
}

// ✅ GASにLINE IDと名前を送信する関数（バックグラウンド処理）
async function sendToGAS(userId, displayName, userType) {
    try {
        console.log("GASへデータ送信中......", userId, displayName, userType);

        const formData = new URLSearchParams();
        formData.append("userId", userId);
        formData.append("displayName", displayName);
        formData.append("type", userType);

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
