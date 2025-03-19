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
    
    // 默認選擇相框1
    applyFrame('./assets/frames/網站_相框01.png');

    // 添加畫布大小調整函數
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        
        // 根據容器寬度和2:3的比例計算畫布大小
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // 設置白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 重新繪製
        redrawCanvas();
    }

    // 上傳圖片
    function uploadImage(file) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('no-image-message').style.display = 'none';

        const reader = new FileReader();

        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                // 清除畫布
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 計算圖片的長寬比
                const imgRatio = img.width / img.height;
                // 計算畫布的長寬比
                const canvasRatio = canvas.width / canvas.height;
                
                let scale, x, y, width, height;
                
                // 根據圖片長寬比決定如何填充畫布
                if (imgRatio > canvasRatio) {
                    // 圖片較寬，以高度為準
                    height = canvas.height * 0.9;
                    width = height * imgRatio;
                    x = (canvas.width - width) / 2;
                    y = (canvas.height - height) / 2;
                } else {
                    // 圖片較高，以寬度為準
                    width = canvas.width * 0.9;
                    height = width / imgRatio;
                    x = (canvas.width - width) / 2;
                    y = (canvas.height - height) / 2;
                }

                // 繪製圖片
                ctx.drawImage(img, x, y, width, height);

                // 保存原始圖片和當前圖片
                originalImage = {
                    element: img,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    ratio: imgRatio
                };

                currentImage = { ...originalImage };

                // 如果有相框，重新應用
                if (frameImage) {
                    drawFrame();
                }

                document.getElementById('loading').style.display = 'none';

                // 重置濾鏡
                resetFilters();
            };

            img.src = event.target.result;
        };

        reader.readAsDataURL(file);
    }

    // 初始化事件
    function initEventListeners() {
        // 上傳圖片 - 不再需要點擊按鈕事件，因為我們使用label直接觸發file input
        document.getElementById('file-input').addEventListener('change', function (e) {
            if (this.files && this.files[0]) {
                uploadImage(this.files[0]);
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

        // 下載圖片
        document.getElementById('download-btn').addEventListener('click', downloadImage);
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
            // 填充白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
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
            
            // 繪製相框 - 相框應該覆蓋整個畫布，保持2:3比例
            ctx.drawImage(
                frameImage.element,
                0,
                0,
                canvas.width,
                canvas.height
            );
            
            // 隱藏上傳提示訊息
            document.getElementById('no-image-message').style.display = 'none';
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
            ctx.drawImage(
                currentImage.element,
                currentImage.x,
                currentImage.y,
                currentImage.width,
                currentImage.height
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
        }
    }

    // 應用濾鏡
    function applyFilters() {
        if (!currentImage) {
            alert('請先上傳一張圖片');
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

    // 下載圖片
    function downloadImage() {
        if (!currentImage) {
            alert('請先上傳一張圖片');
            return;
        }

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'framed_photo.png';
        link.click();
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