<?php
// 設定錯誤報告
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 允許跨域請求 (如果需要的話)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 響應類型為 JSON
header('Content-Type: application/json');

// 確保是 POST 請求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => '僅支援 POST 請求']);
    exit;
}

try {
    // 檢查是否收到 base64 圖片數據
    if (empty($_POST['imageData'])) {
        throw new Exception('沒有收到圖片數據');
    }

    // 獲取 base64 圖片數據
    $base64Data = $_POST['imageData'];
    
    // 從 base64 字串中提取實際數據部分 (移除 "data:image/png;base64," 前綴)
    if (strpos($base64Data, 'data:image/') === 0) {
        list(, $base64Data) = explode(',', $base64Data);
    }
    
    // 解碼 base64 數據
    $imageData = base64_decode($base64Data);
    
    if (!$imageData) {
        throw new Exception('無法解碼圖片數據');
    }
    
    // 創建上傳目錄（如果不存在）
    $uploadDir = 'uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // 生成唯一檔名 (使用時間戳和隨機字串)
    $fileName = uniqid('photo_') . '.jpg';
    $filePath = $uploadDir . $fileName;
    
    // 保存圖片文件
    if (file_put_contents($filePath, $imageData)) {
        // 獲取文件的完整 URL
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $fileUrl = $protocol . $host . '/' . $filePath;
        
        // 創建 view.php 的URL
        $viewUrl = $protocol . $host . '/view.php?url=' . urlencode($fileUrl);
        
        // 返回成功響應
        echo json_encode([
            'success' => true, 
            'message' => '圖片上傳成功',
            'url' => $viewUrl,
            'direct_url' => $fileUrl
        ]);
    } else {
        throw new Exception('保存圖片時發生錯誤');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => '上傳失敗: ' . $e->getMessage()
    ]);
}
?> 