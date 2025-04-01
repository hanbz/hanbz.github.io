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
    let cameraInitialized = false; // 追蹤相機是否已初始化

    // 檢查是否在移動裝置上
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // 檢查是否為 iPhone/iPad
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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

        // 修改下載圖片功能 - 將圖片上傳到伺服器
        document.getElementById('download-btn').addEventListener('click', function() {
            // 顯示加載中狀態
            document.getElementById('loading').style.display = 'flex';
            
            // 獲取Canvas的圖片數據（base64格式）
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            
            // 準備表單數據
            const formData = new FormData();
            formData.append('imageData', imageData);
            
            // 發送POST請求到PHP腳本
            fetch('upload.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // 隱藏加載中狀態
                document.getElementById('loading').style.display = 'none';
                
                if (data.success) {
                    // 上傳成功，打開新分頁並顯示保存的圖片
                    window.open(data.url, '_blank');
                } else {
                    // 上傳失敗，顯示錯誤信息
                    alert('上傳失敗: ' + data.message);
                }
            })
            .catch(error => {
                // 隱藏加載中狀態
                document.getElementById('loading').style.display = 'none';
                
                // 顯示錯誤信息
                console.error('上傳錯誤:', error);
                alert('上傳圖片時發生錯誤，請重試！');
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
        const currentFrameBtn = document.querySelector(`.frame-btn[data-frame="${frameSrc}"]`);
        if (currentFrameBtn) {
             currentFrameBtn.classList.add('selected');
        } else {
             console.warn("Could not find frame button for src:", frameSrc);
        }

        // 載入相框圖片
        const img = new Image();
        img.onload = function() {
            frameImage = {
                element: img,
                src: frameSrc
            };
            
            // 重新繪製畫布 - 調用調整後的 drawFrame
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

    // 繪製相框 (調整後，處理背景並疊加)
    function drawFrame() {
        // 這個函數現在主要在應用新相框時被調用，
        // 或者在 capturePhoto 後繪製最終圖像時
        // 它需要確保背景（可能是白色，可能是已捕獲的圖像）已經存在
        if (frameImage) {
            const dpr = window.devicePixelRatio || 1;
            const canvasWidth = canvas.width / dpr;
            const canvasHeight = canvas.height / dpr;

            // 檢查：如果不是視頻流狀態，並且有 currentImage，則先繪製 currentImage
            // 注意：視頻流狀態下，背景由 drawVideoPreview 處理
            if (!isStreamActive && currentImage) {
                 ctx.drawImage(
                     currentImage.element,
                     currentImage.x,
                     currentImage.y,
                     currentImage.width,
                     currentImage.height
                 );
            } else if (!isStreamActive) {
                 // 如果沒有視頻流也沒有圖像，確保背景是白色
                 ctx.fillStyle = 'white';
                 ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            // 在現有內容上繪製相框
            drawFrameOverlay(); 
        }
    }

     // 新增：只繪製相框疊加層的函數
     function drawFrameOverlay() {
         if (frameImage) {
             const dpr = window.devicePixelRatio || 1;
             const canvasWidth = canvas.width / dpr;
             const canvasHeight = canvas.height / dpr;
             ctx.drawImage(
                 frameImage.element,
                 0,
                 0,
                 canvasWidth,
                 canvasHeight
             );
         }
     }


    // 重繪畫布 - 主要用於 resize 事件
    function redrawCanvas() {
        if (!canvas || !ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = canvas.width / dpr;
        const canvasHeight = canvas.height / dpr;
        
        // 清除畫布並設置白色背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 如果有已捕獲的圖片，重繪它
        if (currentImage) {
             // --- (計算圖片尺寸和位置邏輯) ---
             const imageRatio = currentImage.ratio;
             const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
             let x, y, width, height;
             if (!isMobileDevice) {
                 width = canvasWidth; height = width / imageRatio;
                 if (height > canvasHeight) { height = canvasHeight; width = height * imageRatio; }
                 x = (canvasWidth - width) / 2; y = (canvasHeight - height) / 2;
             } else {
                 width = canvasWidth; height = width / imageRatio;
                 x = 0; y = (canvasHeight - height) / 2;
             }
             // 更新 currentImage 的尺寸以備後用 (雖然 drawImage 會使用這些值)
             currentImage.x = x; currentImage.y = y; currentImage.width = width; currentImage.height = height;
             // --- (計算結束) ---
            
            ctx.drawImage(
                currentImage.element,
                x,
                y,
                width,
                height
            );
            // 重繪相框
            drawFrameOverlay();
        } 
        // 注意：resize 時不應自動重啟視頻流，如果流正在活動，
        // drawVideoPreview 的下一個循環會處理新的畫布尺寸。
        // 如果流已停止，則只顯示 currentImage 或白屏。
    }


    // 啟動相機
    function startCamera(callback) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('no-image-message').style.display = 'flex';
        document.getElementById('no-image-message').textContent = '相機啟動中...';

        // 停止可能已經存在的相機串流
        stopCamera();

        // 創建視頻元素（如果尚未創建）
        if (!video) {
            video = document.createElement('video');
            video.autoplay = true; // 保持 autoplay
            video.playsInline = true; // 關鍵：在 iOS 上允許內聯播放
            video.muted = true; // 靜音通常有助於自動播放策略
            video.style.display = 'none'; // 保持隱藏
            document.body.appendChild(video);

            // *** 新增：監聽 onplaying 事件來啟動繪製 ***
            video.onplaying = function() {
                console.log("Video stream is playing.");
                // 只有在視頻真正播放時才啟動繪製預覽
                if (isStreamActive) {
                    document.getElementById('no-image-message').style.display = 'none';
                    // 清除可能由 onloadedmetadata 觸發的延遲繪製
                    if(window.drawPreviewTimeout) clearTimeout(window.drawPreviewTimeout); 
                    drawVideoPreview(); // 啟動繪製循環
                    cameraInitialized = true; // 標記相機初始化成功
                     // 如果提供了回調函數，則執行
                    if (typeof callback === 'function') {
                       callback();
                    }
                }
            };

            // *** 可選：監聽其他事件以便調試 ***
            video.onloadedmetadata = function() {
                console.log("Video metadata loaded.");
                 // 元數據加載後可以嘗試繪製一次，但主要依賴 onplaying
                 // 確保 video 尺寸可用後再嘗試繪製
                 if (video.videoWidth > 0 && video.videoHeight > 0) {
                    // 設置一個短延遲繪製，以防 onplaying 事件未能觸發或延遲
                    window.drawPreviewTimeout = setTimeout(() => {
                        if (isStreamActive && !cameraInitialized) { // 如果尚未初始化
                             console.log("Attempting draw from onloadedmetadata timeout");
                             drawVideoPreview(); 
                        }
                    }, 300); 
                 }
            };
             video.oncanplay = function() {
                 console.log("Video can play.");
             };
             video.onsuspend = function() {
                 console.log("Video suspended."); // 監控是否意外暫停
             };
        }

        // 根據設備選擇適合的相機設置
        let constraints = {
            video: {
                facingMode: isFrontCamera ? 'user' : 'environment'
            },
            audio: false
        };

        if (!isMobile) {
            constraints.video.width = { ideal: 1920 };
            constraints.video.height = { ideal: 1080 };
        } else {
            constraints.video.width = { ideal: 1280 };
            constraints.video.height = { ideal: 720 };
        }

        // 請求攝像頭權限
        navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            console.log("getUserMedia successful.");
            video.srcObject = stream;
            isStreamActive = true;
            cameraInitialized = false; // 重置初始化標記

            // *** 嘗試顯式觸發播放 ***
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("video.play() promise resolved.");
                    // 播放成功，等待 onplaying 事件觸發
                }).catch(error => {
                    console.error("video.play() failed:", error);
                    // 即使播放失敗，也可能由 autoplay + playsinline 觸發
                    // onplaying 事件仍然是關鍵
                    // iOS 可能會在這裡報錯說 play() 不是由用戶手勢觸發
                    // 但由於權限授予本身是手勢，可能仍會播放
                    // 因此不在此處調用 handleCameraError，依賴 onplaying
                });
            }

            document.getElementById('loading').style.display = 'none'; // 隱藏加載提示

        })
        .catch(function(error) {
            console.error("無法啟動相機: ", error);
            // 嘗試切換攝像頭
             if (isFrontCamera) {
                 isFrontCamera = false;
                 constraints.video.facingMode = 'environment';
                
                 navigator.mediaDevices.getUserMedia(constraints)
                 .then(function(stream) {
                     console.log("getUserMedia successful (rear camera).");
                     video.srcObject = stream;
                     isStreamActive = true;
                     cameraInitialized = false;
                     const playPromise = video.play();
                     if (playPromise !== undefined) {
                         playPromise.then(() => {}).catch(err => {
                              console.error("video.play() failed (rear):", err);
                              // 依然不報錯，等待 onplaying
                         });
                     }
                     document.getElementById('loading').style.display = 'none';
                 })
                 .catch(function(secondError) {
                     handleCameraError(secondError, "無法啟動後置相機");
                 });
             } else {
                 handleCameraError(error, "無法啟動任何相機");
             }
        });

        // 處理相機錯誤的函數
        function handleCameraError(error, customMessage = '無法啟動相機，請檢查相機權限') {
            console.error(customMessage + ": ", error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('no-image-message').style.display = 'flex';
            document.getElementById('no-image-message').textContent = customMessage;
            // 不再彈出 alert
            cameraInitialized = false;
            if (typeof callback === 'function') {
                callback(error);
            }
        }
    }
    
    // 在畫布上繪製視頻預覽
    function drawVideoPreview() {
        // *** 確保只在流活躍且視頻有尺寸時繪製 ***
        if (!video || !isStreamActive || video.paused || video.ended || video.videoWidth === 0 || video.videoHeight === 0) {
             console.log("Stopping drawVideoPreview loop. Conditions:", {isStreamActive, paused: video?.paused, ended: video?.ended, width: video?.videoWidth, height: video?.videoHeight});
             return; 
        }

        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = canvas.width / dpr;
        const canvasHeight = canvas.height / dpr;

        // *** 在繪製前清除畫布 ***
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); 
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoRatio = videoWidth / videoHeight;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        let x, y, width, height;

        // --- (計算繪製尺寸和位置的邏輯保持不變) ---
        if (!isMobileDevice) {
            width = canvasWidth; height = width / videoRatio;
            if (height > canvasHeight) { height = canvasHeight; width = height * videoRatio; }
            x = (canvasWidth - width) / 2; y = (canvasHeight - height) / 2;
        } else {
            width = canvasWidth; height = width / videoRatio;
            x = 0; y = (canvasHeight - height) / 2;
        }
       // --- (計算繪製尺寸和位置的邏輯結束) ---

        // *** 繪製視頻幀 ***
        if (isFrontCamera) {
            ctx.save();
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, width, height);
            ctx.restore();
        } else {
            ctx.drawImage(video, x, y, width, height);
        }

        // *** 如果有相框，疊加相框 ***
        drawFrameOverlay(); 

        // *** 繼續下一幀繪製 ***
        requestAnimationFrame(drawVideoPreview);
    }
    
    // 捕獲照片
    function capturePhoto() {
        // *** 檢查相機是否真正初始化完成 ***
        if (!video || !isStreamActive || !cameraInitialized) {
            alert('相機尚未完全準備就緒，請稍候...');
            return;
        }
        
        // --- (捕獲邏輯基本不變，確保 stopCamera 被調用) ---
        document.getElementById('loading').style.display = 'flex';
        const dpr = window.devicePixelRatio || 1;
        const tempCanvas = document.createElement('canvas');
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        tempCanvas.width = videoWidth;
        tempCanvas.height = videoHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (isFrontCamera) {
            tempCtx.translate(videoWidth, 0);
            tempCtx.scale(-1, 1);
        }
        // 從 video 繪製當前幀到臨時 canvas
        tempCtx.drawImage(video, 0, 0, videoWidth, videoHeight); 

        const img = new Image();
        img.onload = function() {
             // --- (計算圖片尺寸和位置邏輯) ---
             const imageRatio = videoWidth / videoHeight;
             const canvasWidth = canvas.width / dpr;
             const canvasHeight = canvas.height / dpr;
             const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
             let x, y, width, height;
             if (!isMobileDevice) {
                 width = canvasWidth; height = width / imageRatio;
                 if (height > canvasHeight) { height = canvasHeight; width = height * imageRatio; }
                 x = (canvasWidth - width) / 2; y = (canvasHeight - height) / 2;
             } else {
                 width = canvasWidth; height = width / imageRatio;
                 x = 0; y = (canvasHeight - height) / 2;
             }
             // --- (計算結束) ---

            originalImage = { element: img, x, y, width, height, ratio: imageRatio, originalWidth: videoWidth, originalHeight: videoHeight };
            currentImage = { ...originalImage };

            // *** 關鍵：停止相機流 ***
            stopCamera(); 
            // cameraInitialized 會在 stopCamera 裡或 drawVideoPreview 循環停止時變為 false

            // 清除主畫布並繪製捕獲的圖片
            ctx.clearRect(0, 0, canvas.width, canvas.height); // 使用原始畫布尺寸清除
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight); // 使用 dpr 調整後的尺寸填充
            ctx.drawImage(img, x, y, width, height); // 繪製捕獲的圖片

            // 重新應用相框
            drawFrameOverlay(); // 只疊加相框

            document.getElementById('loading').style.display = 'none';
        };
        // 將臨時 canvas 轉為圖片數據
        img.src = tempCanvas.toDataURL('image/png'); 
    }
    
    // 停止相機
    function stopCamera() {
        console.log("Stopping camera stream.");
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        isStreamActive = false;
        cameraInitialized = false; // 標記相機已停止或未初始化
        // 清除可能的延遲繪製計時器
        if(window.drawPreviewTimeout) clearTimeout(window.drawPreviewTimeout); 
    }
});

window.onload = function() {
    var popup = document.getElementById('popup-ad');
    if (popup) {
         popup.style.display = 'flex';
    }
    
    // 確保自動觸發重新拍攝的代碼被移除或註釋掉
    // setTimeout(function() {
    //     const retakeBtn = document.getElementById('retake-photo-btn');
    //     if (retakeBtn) {
    //          retakeBtn.click();
    //     }
    // }, 1000);
};

function closePopup(event) {
    var popup = document.getElementById('popup-ad');
     if (popup) {
        popup.style.display = 'none';
    }
    if (event) {
        event.stopPropagation();
    }
} 