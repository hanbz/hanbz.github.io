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
    let filterValues = {
        brightness: 0,
        contrast: 0,
        saturation: 0
    };
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
        
        // 設置畫布的顯示大小
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        
        // 設置畫布的實際大小，考慮設備像素比
        canvas.width = Math.floor(containerWidth * dpr);
        canvas.height = Math.floor(containerHeight * dpr);
        
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

        // 調整參數滑塊
        document.getElementById('brightness').addEventListener('input', function () {
            document.getElementById('brightness-value').textContent = this.value;
            filterValues.brightness = parseInt(this.value);
        });

        document.getElementById('contrast').addEventListener('input', function () {
            document.getElementById('contrast-value').textContent = this.value;
            filterValues.contrast = parseInt(this.value);
        });

        document.getElementById('saturation').addEventListener('input', function () {
            document.getElementById('saturation-value').textContent = this.value;
            filterValues.saturation = parseInt(this.value);
        });

        // 套用濾鏡
        document.getElementById('apply-filters').addEventListener('click', applyFilters);

        // 重置濾鏡
        document.getElementById('reset-filters').addEventListener('click', resetFilters);

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
                    <style>
                        body { 
                            margin: 0; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh;
                            background-color: #e6f7ff; /* 藍色背景 */
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                </head>
                <body>
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
        
        // 設置當前選中的相框按鈕
        document.querySelector(`.frame-btn[data-frame="${frameSrc}"]`).classList.add('selected');

        // 載入相框圖片
        const img = new Image();
        img.onload = function () {
            frameImage = {
                element: img,
                src: frameSrc
            };
            
            drawFrame();
            document.getElementById('loading').style.display = 'none';
        };
        
        img.onerror = function () {
            console.error("Error loading frame image");
            document.getElementById('loading').style.display = 'none';
            alert('載入相框時發生錯誤');
        };
        
        img.src = frameSrc;
    }

    // 繪製相框
    function drawFrame() {
        if (frameImage) {
            // 如果有相機串流，保留視頻畫面不刪除
            if (!isStreamActive) {
                // 填充白色背景
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
                
                // 如果有上傳圖片，先繪製圖片
                if (currentImage) {
                    ctx.drawImage(
                        currentImage.element,
                        currentImage.x,
                        currentImage.y,
                        currentImage.width,
                        currentImage.height
                    );
                }
            }
            
            // 繪製相框 - 相框應該覆蓋整個畫布，保持2:3比例
            ctx.drawImage(
                frameImage.element,
                0,
                0,
                canvas.width / (window.devicePixelRatio || 1),
                canvas.height / (window.devicePixelRatio || 1)
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
        
        // 清除畫布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 填充白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 繪製當前圖片（如果有）
        if (currentImage) {
            // 重新計算圖片在畫布上的位置和尺寸
            const imageRatio = currentImage.ratio;
            const canvasRatio = canvas.width / canvas.height;
            
            let x, y, width, height;
            
            // 根據圖片長寬比決定如何填充畫布
            if (imageRatio > canvasRatio) {
                // 圖片較寬，以寬度為準
                width = canvas.width * 0.9;
                height = width / imageRatio;
                x = (canvas.width - width) / 2;
                y = (canvas.height - height) / 2;
            } else {
                // 圖片較高，以高度為準
                height = canvas.height * 0.9;
                width = height * imageRatio;
                x = (canvas.width - width) / 2;
                y = (canvas.height - height) / 2;
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
                    canvas.width,
                    canvas.height
                );
            }
        } else if (isStreamActive && video) {
            // 如果是相機預覽狀態，繼續繪製視頻預覽
            drawVideoPreview();
        }
    }

    // 應用濾鏡
    function applyFilters() {
        if (!currentImage) {
            alert('請先拍攝一張照片');
            return;
        }

        document.getElementById('loading').style.display = 'flex';

        // 創建臨時畫布
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentImage.width;
        tempCanvas.height = currentImage.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 繪製當前圖片到臨時畫布
        tempCtx.drawImage(currentImage.element, 0, 0, currentImage.width, currentImage.height);

        // 獲取圖片數據
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // 應用濾鏡
        const brightnessValue = 1 + filterValues.brightness / 100;
        const contrastValue = 1 + filterValues.contrast / 100;
        const saturationValue = 1 + filterValues.saturation / 100;

        for (let i = 0; i < data.length; i += 4) {
            // 應用亮度
            data[i] = data[i] * brightnessValue;
            data[i + 1] = data[i + 1] * brightnessValue;
            data[i + 2] = data[i + 2] * brightnessValue;

            // 應用對比度
            data[i] = ((data[i] - 128) * contrastValue) + 128;
            data[i + 1] = ((data[i + 1] - 128) * contrastValue) + 128;
            data[i + 2] = ((data[i + 2] - 128) * contrastValue) + 128;

            // 應用飽和度
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg + saturationValue * (data[i] - avg);
            data[i + 1] = avg + saturationValue * (data[i + 1] - avg);
            data[i + 2] = avg + saturationValue * (data[i + 2] - avg);

            // 確保顏色值在有效範圍內
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }

        // 更新臨時畫布
        tempCtx.putImageData(imageData, 0, 0);

        // 創建新圖片
        const newImg = new Image();
        newImg.onload = function () {
            currentImage.element = newImg;
            redrawCanvas();
            document.getElementById('loading').style.display = 'none';
        };

        newImg.src = tempCanvas.toDataURL();
    }

    // 重置濾鏡
    function resetFilters() {
        filterValues = {
            brightness: 0,
            contrast: 0,
            saturation: 0
        };

        // 重置滑塊
        document.getElementById('brightness').value = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('saturation').value = 0;

        // 更新顯示值
        document.getElementById('brightness-value').textContent = '0';
        document.getElementById('contrast-value').textContent = '0';
        document.getElementById('saturation-value').textContent = '0';

        if (originalImage) {
            currentImage = { ...originalImage };
            redrawCanvas();
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
            video.style.display = 'none';
            document.body.appendChild(video);
        }
        
        // 請求攝像頭權限，根據當前的鏡頭狀態選擇前置或後置鏡頭
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: isFrontCamera ? 'user' : 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        })
        .then(function(stream) {
            video.srcObject = stream;
            isStreamActive = true;
            
            // 等待視頻元數據加載完成
            video.onloadedmetadata = function() {
                // 隱藏提示信息
                document.getElementById('no-image-message').style.display = 'none';
                // 顯示視頻預覽
                drawVideoPreview();
            };
            
            document.getElementById('loading').style.display = 'none';
        })
        .catch(function(error) {
            console.error("無法啟動相機: ", error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('no-image-message').style.display = 'flex';
            document.getElementById('no-image-message').textContent = '無法啟動相機，請檢查相機權限';
            alert('無法啟動相機，請檢查相機權限。');
        });
    }
    
    // 在畫布上繪製視頻預覽
    function drawVideoPreview() {
        if (!video || !isStreamActive) return;
        
        const dpr = window.devicePixelRatio || 1;
        
        // 清除畫布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // 獲取視頻尺寸
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
            requestAnimationFrame(drawVideoPreview);
            return;
        }
        
        // 計算視頻和畫布的長寬比
        const videoRatio = videoWidth / videoHeight;
        const canvasRatio = (canvas.width / dpr) / (canvas.height / dpr);
        
        let x, y, width, height;
        
        // 根據視頻長寬比決定如何填充畫布
        if (videoRatio > canvasRatio) {
            width = (canvas.width / dpr) * 0.9;
            height = width / videoRatio;
            x = ((canvas.width / dpr) - width) / 2;
            y = ((canvas.height / dpr) - height) / 2;
        } else {
            height = (canvas.height / dpr) * 0.9;
            width = height * videoRatio;
            x = ((canvas.width / dpr) - width) / 2;
            y = ((canvas.height / dpr) - height) / 2;
        }
        
        // 繪製視頻
        ctx.drawImage(video, x, y, width, height);
        
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
        tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        // 將臨時畫布內容轉換為圖片
        const img = new Image();
        img.onload = function() {
            // 計算圖片在主畫布上的位置和尺寸
            const imageRatio = videoWidth / videoHeight;
            const canvasRatio = (canvas.width / dpr) / (canvas.height / dpr);
            
            let x, y, width, height;
            
            // 根據圖片長寬比決定如何填充畫布
            if (imageRatio > canvasRatio) {
                width = (canvas.width / dpr) * 0.9;
                height = width / imageRatio;
                x = ((canvas.width / dpr) - width) / 2;
                y = ((canvas.height / dpr) - height) / 2;
            } else {
                height = (canvas.height / dpr) * 0.9;
                width = height * imageRatio;
                x = ((canvas.width / dpr) - width) / 2;
                y = ((canvas.height / dpr) - height) / 2;
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
            ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            
            // 繪製圖片
            ctx.drawImage(img, x, y, width, height);
            
            // 如果有相框，重新應用
            if (frameImage) {
                drawFrame();
            }
            
            // 重置濾鏡
            resetFilters();
            
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