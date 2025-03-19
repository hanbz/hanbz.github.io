document.addEventListener('DOMContentLoaded', function () {
    // 初始化
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // 啟用高解析度畫布
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
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
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / devicePixelRatio;
    const displayHeight = canvas.height / devicePixelRatio;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // 默認選擇相框1
    applyFrame('./assets/frames/網站_相框01.png');

    // 添加畫布大小調整函數
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        
        // 根據容器寬度和2:3的比例計算畫布大小
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 设置更高的分辨率
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // 设置画布的CSS大小
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        
        // 重置上下文状态
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 设置画布的实际像素大小（更高分辨率）
        canvas.width = containerWidth * devicePixelRatio;
        canvas.height = containerHeight * devicePixelRatio;
        
        // 根据设备像素比例缩放上下文
        ctx.scale(devicePixelRatio, devicePixelRatio);

        // 設置白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, containerWidth, containerHeight);
        
        // 设置高质量图像渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

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
            
            // 设置跨域属性以避免某些情况下的跨域问题
            img.crossOrigin = "Anonymous";
            
            img.onload = function () {
                // 保存原始图片信息
                const imgNaturalWidth = img.naturalWidth;
                const imgNaturalHeight = img.naturalHeight;
                
                // 获取设备像素比例
                const devicePixelRatio = window.devicePixelRatio || 1;
                const displayWidth = canvas.width / devicePixelRatio;
                const displayHeight = canvas.height / devicePixelRatio;
                
                // 清除畫布
                ctx.clearRect(0, 0, displayWidth, displayHeight);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, displayWidth, displayHeight);

                // 計算圖片的長寬比
                const imgRatio = imgNaturalWidth / imgNaturalHeight;
                // 計算畫布的長寬比
                const canvasRatio = displayWidth / displayHeight;
                
                let x, y, width, height;
                
                // 根據圖片長寬比決定如何填充畫布
                if (imgRatio > canvasRatio) {
                    // 圖片較寬，以高度為準
                    height = displayHeight * 0.9;
                    width = height * imgRatio;
                    x = (displayWidth - width) / 2;
                    y = (displayHeight - height) / 2;
                } else {
                    // 圖片較高，以寬度為準
                    width = displayWidth * 0.9;
                    height = width / imgRatio;
                    x = (displayWidth - width) / 2;
                    y = (displayHeight - height) / 2;
                }

                // 高品質繪製圖片
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(
                    img, 
                    0, 0, imgNaturalWidth, imgNaturalHeight,
                    x, y, width, height
                );

                // 保存原始圖片和當前圖片，确保保留原始尺寸信息
                originalImage = {
                    element: img,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    ratio: imgRatio,
                    naturalWidth: imgNaturalWidth,
                    naturalHeight: imgNaturalHeight
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
        img.crossOrigin = "Anonymous";
        img.onload = function () {
            // 保存相框原始尺寸和比例
            const frameNaturalWidth = img.naturalWidth;
            const frameNaturalHeight = img.naturalHeight;
            
            frameImage = {
                element: img,
                src: frameSrc,
                width: img.naturalWidth,
                height: img.naturalHeight,
                ratio: img.naturalWidth / img.naturalHeight,
                naturalWidth: frameNaturalWidth,
                naturalHeight: frameNaturalHeight
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
            // 獲取設備像素比例
            const devicePixelRatio = window.devicePixelRatio || 1;
            const displayWidth = canvas.width / devicePixelRatio;
            const displayHeight = canvas.height / devicePixelRatio;
            
            // 填充白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, displayWidth, displayHeight);
            
            // 計算相框在畫布中的適當尺寸
            let frameWidth, frameHeight;
            
            // 保持相框的原始比例
            if (frameImage.ratio > displayWidth / displayHeight) {
                // 相框较宽，适应画布宽度
                frameWidth = displayWidth;
                frameHeight = frameWidth / frameImage.ratio;
            } else {
                // 相框较高，适应画布高度
                frameHeight = displayHeight;
                frameWidth = frameHeight * frameImage.ratio;
            }
            
            // 居中绘制相框
            const frameX = (displayWidth - frameWidth) / 2;
            const frameY = (displayHeight - frameHeight) / 2;
            
            // 如果有上傳圖片，先按相框区域绘制图片
            if (currentImage) {
                // 假设相框中图片区域占相框的80%（与下载函数一致）
                const imgAreaWidth = frameWidth * 0.8;
                const imgAreaHeight = frameHeight * 0.8;
                
                // 图片区域的位置（居中）
                const imgAreaX = frameX + (frameWidth - imgAreaWidth) / 2;
                const imgAreaY = frameY + (frameHeight - imgAreaHeight) / 2;
                
                // 计算图片在图片区域内的缩放
                const imgRatio = currentImage.ratio;
                let imgWidth, imgHeight, imgX, imgY;
                
                if (imgRatio > imgAreaWidth / imgAreaHeight) {
                    // 图片较宽，以宽度为基准
                    imgWidth = imgAreaWidth;
                    imgHeight = imgWidth / imgRatio;
                    imgX = imgAreaX;
                    imgY = imgAreaY + (imgAreaHeight - imgHeight) / 2;
                } else {
                    // 图片较高，以高度为基准
                    imgHeight = imgAreaHeight;
                    imgWidth = imgHeight * imgRatio;
                    imgX = imgAreaX + (imgAreaWidth - imgWidth) / 2;
                    imgY = imgAreaY;
                }
                
                // 绘制缩放后的图片
                ctx.drawImage(
                    currentImage.element,
                    0, 0, currentImage.naturalWidth, currentImage.naturalHeight,
                    imgX, imgY, imgWidth, imgHeight
                );
            }
            
            // 使用CSS图像平滑算法进行高质量绘制
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 繪製高品質相框 - 使用完整的原始相框图像
            ctx.drawImage(
                frameImage.element,
                0, 0, frameImage.naturalWidth, frameImage.naturalHeight, // 源相框的完整尺寸
                frameX, frameY, frameWidth, frameHeight // 目标位置和尺寸
            );
            
            // 隱藏上傳提示訊息
            document.getElementById('no-image-message').style.display = 'none';
        }
    }

    // 重繪畫布
    function redrawCanvas() {
        if (!canvas || !ctx) return;
        
        // 获取设备像素比例
        const devicePixelRatio = window.devicePixelRatio || 1;
        const displayWidth = canvas.width / devicePixelRatio;
        const displayHeight = canvas.height / devicePixelRatio;
        
        // 清除畫布
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        
        // 填充白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, displayWidth, displayHeight);
        
        // 设置高质量图像渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 如果有相框和图片，按照相框绘制方式重绘
        if (currentImage && frameImage) {
            drawFrame();
        } 
        // 只有图片没有相框的情况
        else if (currentImage) {
            // 计算图片在画布中的适当位置和尺寸
            let displayWidth, displayHeight, displayX, displayY;
            const imgRatio = currentImage.ratio;
            const canvasRatio = canvas.width / canvas.height;
            
            if (imgRatio > canvasRatio) {
                // 图片较宽，以高度为准
                displayHeight = canvas.height * 0.9 / devicePixelRatio;
                displayWidth = displayHeight * imgRatio;
                displayX = (canvas.width / devicePixelRatio - displayWidth) / 2;
                displayY = (canvas.height / devicePixelRatio - displayHeight) / 2;
            } else {
                // 图片较高，以宽度为准
                displayWidth = canvas.width * 0.9 / devicePixelRatio;
                displayHeight = displayWidth / imgRatio;
                displayX = (canvas.width / devicePixelRatio - displayWidth) / 2;
                displayY = (canvas.height / devicePixelRatio - displayHeight) / 2;
            }
            
            // 绘制图片
            ctx.drawImage(
                currentImage.element,
                0, 0, currentImage.naturalWidth, currentImage.naturalHeight,
                displayX, displayY, displayWidth, displayHeight
            );
        }
    }

    // 應用濾鏡
    function applyFilters() {
        if (!currentImage) {
            alert('請先上傳一張圖片');
            return;
        }

        document.getElementById('loading').style.display = 'flex';

        // 创建一个高分辨率的临时画布
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 使用原始图片的尺寸
        tempCanvas.width = originalImage.naturalWidth;
        tempCanvas.height = originalImage.naturalHeight;

        // 绘制原始图片到临时画布，不进行任何缩放
        tempCtx.drawImage(
            originalImage.element, 
            0, 0, originalImage.naturalWidth, originalImage.naturalHeight,
            0, 0, originalImage.naturalWidth, originalImage.naturalHeight
        );

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
        newImg.crossOrigin = "Anonymous";
        newImg.onload = function () {
            // 保留原始图片的信息，但更新为处理后的图片对象
            currentImage = {
                ...originalImage,
                element: newImg
            };
            
            // 重绘画布
            redrawCanvas();
            document.getElementById('loading').style.display = 'none';
        };
        newImg.src = tempCanvas.toDataURL('image/png', 0.9);
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
            // 重置为原始图片
            currentImage = { ...originalImage };
            
            // 重绘画布
            redrawCanvas();
        }
    }

    // 下載圖片
    function downloadImage() {
        if (!currentImage) {
            alert('請先上傳一張圖片');
            return;
        }

        // 创建一个适应相框比例的临时画布
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 获取当前选中的相框路径
        const frameSrc = document.querySelector('.frame-btn.selected').getAttribute('data-frame');
        const frameImg = new Image();
        frameImg.crossOrigin = "Anonymous";
        
        // 使用异步加载相框后再处理图片
        frameImg.onload = function() {
            // 计算相框的比例
            const frameRatio = frameImg.naturalWidth / frameImg.naturalHeight;
            
            // 设置输出画布大小 - 使用一个合适的分辨率，不需要太大
            const outputWidth = 1200; // 设置一个合理的输出宽度
            const outputHeight = outputWidth / frameRatio;
            
            tempCanvas.width = outputWidth;
            tempCanvas.height = outputHeight;
            
            // 填充白色背景
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // 计算图片在相框中的适当尺寸和位置
            // 假设相框中图片区域占相框的80%（这个值可以根据相框设计调整）
            const imgAreaWidth = tempCanvas.width * 0.8;
            const imgAreaHeight = tempCanvas.height * 0.8;
            
            // 图片区域的位置（居中）
            const imgAreaX = (tempCanvas.width - imgAreaWidth) / 2;
            const imgAreaY = (tempCanvas.height - imgAreaHeight) / 2;
            
            // 计算图片在图片区域内的缩放
            const imgRatio = originalImage.naturalWidth / originalImage.naturalHeight;
            let imgWidth, imgHeight, imgX, imgY;
            
            if (imgRatio > imgAreaWidth / imgAreaHeight) {
                // 图片较宽，以宽度为基准
                imgWidth = imgAreaWidth;
                imgHeight = imgWidth / imgRatio;
                imgX = imgAreaX;
                imgY = imgAreaY + (imgAreaHeight - imgHeight) / 2;
            } else {
                // 图片较高，以高度为基准
                imgHeight = imgAreaHeight;
                imgWidth = imgHeight * imgRatio;
                imgX = imgAreaX + (imgAreaWidth - imgWidth) / 2;
                imgY = imgAreaY;
            }
            
            // 绘制缩放后的图片
            tempCtx.drawImage(
                originalImage.element,
                0, 0, originalImage.naturalWidth, originalImage.naturalHeight, // 源图像的位置和尺寸
                imgX, imgY, imgWidth, imgHeight // 目标位置和尺寸（适应相框）
            );
            
            // 绘制相框
            tempCtx.drawImage(
                frameImg,
                0, 0, frameImg.naturalWidth, frameImg.naturalHeight, // 源相框的位置和尺寸
                0, 0, tempCanvas.width, tempCanvas.height // 目标位置和尺寸
            );
            
            // 下载图片
            const link = document.createElement('a');
            link.href = tempCanvas.toDataURL('image/png', 0.9); // 稍微降低质量以减小文件大小
            link.download = 'framed_photo.png';
            link.click();
        };
        
        // 开始加载相框图片
        frameImg.src = frameSrc;
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