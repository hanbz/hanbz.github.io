<?php
// 獲取圖片URL參數
$imageUrl = isset($_GET['url']) ? $_GET['url'] : '';

// 驗證URL是否為本站的uploads目錄下的圖片
$validPath = false;
if (!empty($imageUrl)) {
    // 解析URL
    $parsedUrl = parse_url($imageUrl);
    $path = isset($parsedUrl['path']) ? $parsedUrl['path'] : '';

    // 檢查路徑是否以 /uploads/ 開頭並且是 .jpg 結尾
    if (strpos($path, '/uploads/') === 0 && pathinfo($path, PATHINFO_EXTENSION) === 'jpg') {
        $validPath = true;
    }
}

// 如果沒有有效的圖片URL，重定向到主頁
if (!$validPath && !file_exists('.' . $path)) {
    echo "<script>alert('無效的圖片URL'); window.location.href = 'index.html';</script>";
    exit;
}

// 獲取文件的本地路徑
$localPath = '.' . $path;
?>
<!DOCTYPE html>
<html lang="zh-TW">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>相框成品</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #e6f7ff;
            /* 藍色背景 */
            font-family: 'Noto Sans TC', sans-serif;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            text-align: center;
        }

        .reminder {
            margin-bottom: 20px;
            font-size: 32px;
            font-weight: 500;
            color: #002368;
        }

        .image-container {
            margin: 20px 0;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            background-color: white;
            padding: 10px;
            border-radius: 5px;
        }

        .photo {
            max-width: 100%;
            height: auto;
            display: block;
        }

        .button-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
        }

        .button {
            background-color: #0064b4;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
            text-decoration: none;
            display: inline-block;
        }

        .button:hover {
            background-color: #005091;
        }

        .button.primary {
            background-color: #0064b4;
        }

        .button.secondary {
            background-color: #66a3d3;
        }

        .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
        }

        @media (max-width: 600px) {
            .reminder {
                font-size: 24px;
            }

            .button {
                padding: 10px 20px;
                font-size: 14px;
            }
        }

        .submit-btn {
            display: block;
            text-decoration: none;
        }
        .submit-img-btn {
            max-width: 300px;
            height: auto;
            transition: transform 0.3s ease;
        }
        .submit-btn:hover .submit-img-btn {
            transform: scale(1.05);
        }
    </style>
</head>

<body>
    <div class="container">
        <h1 class="reminder">記得截圖或儲存照片喔!</h1>

        <div class="button-container">
            <a href="https://www.surveycake.com/s/860ra" target="_blank" class="submit-btn">
                <img src="./assets/pic/網站_上傳照片按鈕.png" alt="上傳照片" class="submit-img-btn">
            </a>
        </div>

        <div class="image-container">
            <img src="<?php echo htmlspecialchars($imageUrl); ?>" alt="相框照片" class="photo">
        </div>
    </div>
</body>

</html>