document.addEventListener('DOMContentLoaded', function () {
    // 初始化
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let originalImage = null;
    let currentImage = null;
    let frameImage = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let video = null;
    let isStreamActive = false;
    let isFrontCamera = true; // 預設使用前置鏡頭

    // 檢查是否在移動裝置上
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 初始化事件監聽器
    initEventListeners();
    resizeCanvas();

    // 窗口大小改變時調整畫布
    window.addEventListener('resize', resizeCanvas);

    // 初始化白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 修改提示文字
    document.getElementById('no-image-message').textContent = '正在啟動相機...';
    
    // 默認選擇相框1
    applyFrame('./assets/frames/網站_相框01.png');
    
    // 頁面載入時立即啟動相機
    setTimeout(function() {
        startCamera();
    }, 500);

    // 添加畫布大小調整函數
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        
        // 獲取設備像素比
        const dpr = window.devicePixelRatio || 1;
        
        // 根據容器寬度和2:3的比例計算畫布大小
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 判斷是否為桌面版本（非移動設備）
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 設置畫布的顯示大小 - 保持與容器相同大小
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        
        // 設置畫布的實際大小，考慮設備像素比
        canvas.width = Math.floor(containerWidth * dpr);
        canvas.height = Math.floor(containerHeight * dpr);
        
        // 重要：每次重設畫布大小時，先重置繪圖上下文
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 調整繪圖上下文以匹配設備像素比
        ctx.scale(dpr, dpr);

        // 設置白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, containerWidth, containerHeight);

        // 重新繪製
        redrawCanvas();
    }

    // 初始化事件
    function initEventListeners() {
        // 拍攝照片
        document.getElementById('take-photo-btn').addEventListener('click', capturePhoto);
        
        // 重新拍攝
        document.getElementById('retake-photo-btn').addEventListener('click', function() {
            // 清除已經捕獲的照片
            if (currentImage) {
                // 保存當前照片作為備份，以便需要時恢復
                const backupImage = { ...currentImage };
                
                // 清除當前照片
                currentImage = null;
                originalImage = null;
                
                // 啟動相機
                startCamera();
                } else {
                startCamera();
            }
        });

        // 相框選擇
        document.querySelectorAll('.frame-btn').forEach(button => {
            button.addEventListener('click', function () {
                // 移除之前的選中狀態
                document.querySelectorAll('.frame-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });

                // 添加新選中狀態
                this.classList.add('selected');

                // 應用相框
                applyFrame(this.getAttribute('data-frame'));
            });
        });

        // 在新分頁開啟照片
        document.getElementById('download-btn').addEventListener('click', function() {
            // 先打開一個空白頁面
            const newWindow = window.open('', '_blank');
            
            // 將 Canvas 轉換成 Blob
            canvas.toBlob(function(blob) {
                // 創建 Blob URL
                const blobUrl = URL.createObjectURL(blob);
                
                // 在新頁面中設置內容
                const newPageContent = `
                <!DOCTYPE html>
                <html lang="zh-TW">
                <head>
                    <meta charset="UTF-8">
                    <title>照片相框成品</title>
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
                            background-color: #e6f7ff; /* 藍色背景 */
                            font-family: 'Noto Sans TC', sans-serif;
                        }
                        .reminder {
                            margin-bottom: 20px;
                            font-size: 50px;
                            font-weight: 500;
                            color: #002368;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="reminder">記得截圖或儲存照片喔！</div>
                    <img src="${blobUrl}" alt="照片相框成品">
                </body>
                </html>`;
                
                // 將內容寫入新頁面
                newWindow.document.write(newPageContent);
                newWindow.document.close(); // 完成寫入
            });
        });
    }

    // 修改應用相框函數
    function applyFrame(frameSrc) {
        document.getElementById('loading').style.display = 'flex';
        
        // 將所有相框按鈕重置為未選中狀態
        document.querySelectorAll('.frame-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 選中當前相框按鈕
        document.querySelector(`.frame-btn[data-frame="${frameSrc}"]`).classList.add('selected');
        
        // 載入相框圖片
        const img = new Image();
        img.onload = function() {
            frameImage = {
                element: img,
                src: frameSrc
            };
            
            // 重新繪製畫布
            drawFrame();
            
            document.getElementById('loading').style.display = 'none';
        };
        
        img.onerror = function() {
            console.error('載入相框圖片失敗：', frameSrc);
            alert('載入相框圖片失敗，請重試或選擇其他相框');
            document.getElementById('loading').style.display = 'none';
        };
        
        img.src = frameSrc;
    }

    // 繪製相框
    function drawFrame() {
        if (frameImage) {
            const dpr = window.devicePixelRatio || 1;
            const canvasWidth = canvas.width / dpr;
            const canvasHeight = canvas.height / dpr;
            
            // 如果有相機串流，保留視頻畫面不刪除
            if (!isStreamActive) {
                // 如果有上傳圖片，先繪製圖片
                if (currentImage) {
                    // 使用當前圖片的位置和尺寸繪製
                    ctx.drawImage(
                        currentImage.element,
                        currentImage.x,
                        currentImage.y,
                        currentImage.width,
                        currentImage.height
                    );
                } else {
                    // 填充白色背景
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                }
            }
            
            // 繪製相框 - 相框應該覆蓋整個畫布，保持2:3比例
            ctx.drawImage(
                frameImage.element,
                0,
                0,
                canvasWidth,
                canvasHeight
            );
            
            // 隱藏上傳提示訊息，除非相機正在啟動中
            if (document.getElementById('no-image-message').textContent !== '相機啟動中...' &&
                document.getElementById('no-image-message').textContent !== '正在啟動相機...') {
                document.getElementById('no-image-message').style.display = 'none';
            }
        }
    }

    // 重繪畫布
    function redrawCanvas() {
        if (!canvas || !ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        
        // 清除畫布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 獲取畫布實際的顯示尺寸
        const canvasWidth = canvas.width / dpr;
        const canvasHeight = canvas.height / dpr;
        
        // 填充白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 繪製當前圖片（如果有）
        if (currentImage) {
            // 重新計算圖片在畫布上的位置和尺寸
            const imageRatio = currentImage.ratio;
            
            let x, y, width, height;
            
            // 判斷是否為桌面版本（非移動設備）
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // 圖片的尺寸和位置計算
            if (!isMobileDevice) {
                // 桌面版本：圖片寬度設為畫布寬度，保持圖片比例
                width = canvasWidth;
                height = width / imageRatio;
                
                // 若高度超出畫布，則調整以適應高度
                if (height > canvasHeight) {
                    height = canvasHeight;
                    width = height * imageRatio;
                }
                
                // 確保圖片居中
                x = (canvasWidth - width) / 2;
                y = (canvasHeight - height) / 2;
            } else {
                // 移動版本：圖片寬度設為畫布寬度，垂直居中
                width = canvasWidth;
                height = width / imageRatio;
                x = 0;  // 貼齊左側
                y = (canvasHeight - height) / 2;  // 垂直居中
            }
            
            // 更新當前圖片的位置和尺寸
            currentImage.x = x;
            currentImage.y = y;
            currentImage.width = width;
            currentImage.height = height;
            
            // 繪製圖片
            ctx.drawImage(
                currentImage.element,
                x,
                y,
                width,
                height
            );
            
            // 如果有相框，繪製相框
            if (frameImage) {
                ctx.drawImage(
                    frameImage.element,
                    0,
                    0,
                    canvasWidth,
                    canvasHeight
                );
            }
        } else if (isStreamActive && video) {
            // 如果是相機預覽狀態，繼續繪製視頻預覽
            drawVideoPreview();
        }
    }

    // 啟動相機
    function startCamera() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('no-image-message').style.display = 'flex';
        document.getElementById('no-image-message').textContent = '相機啟動中...';
        
        // 停止可能已經存在的相機串流
        stopCamera();
        
        // 創建視頻元素（如果尚未創建）
        if (!video) {
            video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true; // 在 iOS 上允許內聯播放
            video.style.display = 'none';
            document.body.appendChild(video);
        }
        
        // 根據設備選擇適合的相機設置
        let constraints = {
            video: {
                facingMode: isFrontCamera ? 'user' : 'environment'
            },
            audio: false
        };
        
        // 在高端設備上嘗試使用更高的分辨率
        if (!isMobile) {
            constraints.video.width = { ideal: 1920 };
            constraints.video.height = { ideal: 1080 };
        } else {
            // 在移動設備上使用較低的分辨率但保持較高的幀率
            constraints.video.width = { ideal: 1280 };
            constraints.video.height = { ideal: 720 };
        }
        
        // 請求攝像頭權限
        navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            video.srcObject = stream;
            isStreamActive = true;
            
            // 為 iPhone Safari 添加額外確認
            video.onloadedmetadata = function() {
                document.getElementById('no-image-message').style.display = 'none';
                
                // 強制等待並多次嘗試繪製，確保視頻尺寸正確獲取
                setTimeout(function() {
                    drawVideoPreview();
                    // 200ms 後再次嘗試繪製，確保尺寸已正確獲取
                    setTimeout(drawVideoPreview, 200);
                }, 100);
            };
            
            // 當視頻可以播放時，確保繪製預覽
            video.oncanplay = function() {
                if (isStreamActive) {
                    drawVideoPreview();
                }
            };
            
            document.getElementById('loading').style.display = 'none';
        })
        .catch(function(error) {
            console.error("無法啟動相機: ", error);
            
            // 如果前置相機失敗，嘗試後置相機
            if (isFrontCamera) {
                isFrontCamera = false;
                constraints.video.facingMode = 'environment';
                
                navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream) {
                    video.srcObject = stream;
                    isStreamActive = true;
                    
                    video.onloadedmetadata = function() {
                        document.getElementById('no-image-message').style.display = 'none';
                        drawVideoPreview();
                    };
                    
                    document.getElementById('loading').style.display = 'none';
                })
                .catch(function(secondError) {
                    handleCameraError(secondError);
                });
            } else {
                handleCameraError(error);
            }
        });
        
        // 處理相機錯誤的函數
        function handleCameraError(error) {
            console.error("無法啟動任何相機: ", error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('no-image-message').style.display = 'flex';
            document.getElementById('no-image-message').textContent = '無法啟動相機，請檢查相機權限';
            alert('無法啟動相機，請檢查相機權限或嘗試使用其他瀏覽器。');
        }
    }
    
    // 在畫布上繪製視頻預覽
    function drawVideoPreview() {
        if (!video || !isStreamActive) return;
        
        const dpr = window.devicePixelRatio || 1;
        
        // 清除畫布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 獲取畫布實際的顯示尺寸
        const canvasWidth = canvas.width / dpr;
        const canvasHeight = canvas.height / dpr;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // 獲取視頻尺寸
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
            // 在 Safari 上可能需要更多時間加載視頻
            setTimeout(() => requestAnimationFrame(drawVideoPreview), 100);
            return;
        }
        
        // 計算視頻和畫布的長寬比
        const videoRatio = videoWidth / videoHeight;
        
        // 判斷是否為桌面版本（非移動設備）
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 計算視頻在畫布上的位置和尺寸
        let x, y, width, height;
        
        if (!isMobileDevice) {
            // 桌面版本：視頻寬度設為畫布寬度，保持視頻比例
            width = canvasWidth;
            height = width / videoRatio;
            
            // 若高度超出畫布，則調整以適應高度
            if (height > canvasHeight) {
                height = canvasHeight;
                width = height * videoRatio;
            }
            
            // 確保視頻居中
            x = (canvasWidth - width) / 2;
            y = (canvasHeight - height) / 2;
        } else {
            // 移動版本：視頻寬度設為畫布寬度，垂直居中
            width = canvasWidth;
            height = width / videoRatio;
            x = 0;  // 貼齊左側
            y = (canvasHeight - height) / 2;  // 垂直居中
        }
        
        // 繪製視頻 - 前置相機需要水平翻轉
        if (isFrontCamera) {
            // 保存當前繪圖狀態
            ctx.save();
            // 水平翻轉處理
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, width, height);
            // 恢復繪圖狀態
            ctx.restore();
        } else {
            // 後置相機直接繪製
            ctx.drawImage(video, x, y, width, height);
        }
        
        // 如果有相框，重新應用
        if (frameImage) {
            drawFrame();
        }
        
        // 繼續繪製預覽
        if (isStreamActive) {
            requestAnimationFrame(drawVideoPreview);
        }
    }
    
    // 捕獲照片
    function capturePhoto() {
        if (!video || !isStreamActive) {
            alert('相機未啟動，請稍候...');
            return;
        }

        document.getElementById('loading').style.display = 'flex';
        
        const dpr = window.devicePixelRatio || 1;
        
        // 創建一個臨時畫布來捕獲整個視頻幀，保持原始尺寸
        const tempCanvas = document.createElement('canvas');
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // 設置臨時畫布為視頻原始尺寸
        tempCanvas.width = videoWidth;
        tempCanvas.height = videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 將視頻幀繪製到臨時畫布上（保持原始尺寸）
        if (isFrontCamera) {
            // 前置鏡頭需要水平翻轉
            tempCtx.translate(videoWidth, 0);
            tempCtx.scale(-1, 1);
        }
        tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        // 將臨時畫布內容轉換為圖片
        const img = new Image();
        img.onload = function() {
            // 計算圖片在主畫布上的位置和尺寸
            const imageRatio = videoWidth / videoHeight;
            const canvasWidth = canvas.width / dpr;
            const canvasHeight = canvas.height / dpr;
            
            // 判斷是否為桌面版本（非移動設備）
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            let x, y, width, height;
            
            if (!isMobileDevice) {
                // 桌面版本：圖片寬度設為畫布寬度，保持圖片比例
                width = canvasWidth;
                height = width / imageRatio;
                
                // 若高度超出畫布，則調整以適應高度
                if (height > canvasHeight) {
                    height = canvasHeight;
                    width = height * imageRatio;
                }
                
                // 確保圖片居中
                x = (canvasWidth - width) / 2;
                y = (canvasHeight - height) / 2;
            } else {
                // 移動版本：圖片寬度設為畫布寬度，垂直居中
                width = canvasWidth;
                height = width / imageRatio;
                x = 0;  // 貼齊左側
                y = (canvasHeight - height) / 2;  // 垂直居中
            }
            
            // 保存原始圖片和當前圖片的數據
            originalImage = {
                element: img,
                x: x,
                y: y,
                width: width,
                height: height,
                ratio: imageRatio,
                originalWidth: videoWidth,
                originalHeight: videoHeight
            };
            
            currentImage = { ...originalImage };
            
            // 停止相機串流
            stopCamera();
            
            // 清除畫布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // 繪製圖片
            ctx.drawImage(img, x, y, width, height);
            
            // 如果有相框，重新應用
            if (frameImage) {
                drawFrame();
            }
            
            document.getElementById('loading').style.display = 'none';
        };
        
        img.src = tempCanvas.toDataURL('image/png');
    }
    
    // 停止相機
    function stopCamera() {
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
            isStreamActive = false;
        }
    }
});

window.onload = function() {
    var popup = document.getElementById('popup-ad');
    popup.style.display = 'flex';
};

function closePopup(event) {
    var popup = document.getElementById('popup-ad');
    popup.style.display = 'none';
    if (event) {
        event.stopPropagation();
    }
} 