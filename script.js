// ========================================
// Application State
// ========================================

const state = {
    originalImage: null,
    originalCanvas: null,
    resultCanvas: null,
    currentMethod: 'intensity',
    currentColormap: 'jet',
    gaborParams: {
        ksize: 31,
        sigma: 4.0,
        theta: 0.0,
        lambda: 10.0,
        gamma: 0.5
    }
};

// ========================================
// Utility Functions
// ========================================

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#43e97b" stroke-width="2"/><path d="M8 12L11 15L16 9" stroke="#43e97b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f5576c" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="#f5576c" stroke-width="2" stroke-linecap="round"/></svg>',
        info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="2"/><path d="M12 16V12M12 8H12.01" stroke="#667eea" stroke-width="2" stroke-linecap="round"/></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 250ms reverse';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

function updateCanvasInfo(canvasType, width, height) {
    const infoElement = document.getElementById(`${canvasType}Info`);
    if (width && height) {
        infoElement.innerHTML = `<span class="info-badge">${width} × ${height} px</span>`;
    } else {
        infoElement.innerHTML = `<span class="info-badge">—</span>`;
    }
}

// ========================================
// Image Loading
// ========================================

function loadImage(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.match('image.*')) {
            reject(new Error('Le fichier doit être une image'));
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            reject(new Error('L\'image ne doit pas dépasser 10MB'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Impossible de charger l\'image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
        reader.readAsDataURL(file);
    });
}

function displayImage(img, canvasId, emptyStateId) {
    const canvas = document.getElementById(canvasId);
    const emptyState = document.getElementById(emptyStateId);
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Show canvas, hide empty state
    canvas.classList.add('visible');
    emptyState.classList.add('hidden');

    // Update info
    const canvasType = canvasId.replace('Canvas', '');
    updateCanvasInfo(canvasType, img.width, img.height);

    return canvas;
}

// ========================================
// Image Processing
// ========================================

function getGrayscale(imageData) {
    const data = imageData.data;
    const gray = new Float32Array(imageData.width * imageData.height);

    for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    return { data: gray, width: imageData.width, height: imageData.height };
}

function convolve2D(gray, kernel) {
    const { data, width, height } = gray;
    const kh = kernel.length;
    const kw = kernel[0].length;
    const padH = Math.floor(kh / 2);
    const padW = Math.floor(kw / 2);
    const result = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let ky = 0; ky < kh; ky++) {
                for (let kx = 0; kx < kw; kx++) {
                    const py = y + ky - padH;
                    const px = x + kx - padW;
                    if (py >= 0 && py < height && px >= 0 && px < width) {
                        sum += data[py * width + px] * kernel[ky][kx];
                    }
                }
            }
            result[y * width + x] = sum;
        }
    }

    return { data: result, width, height };
}

function sobelFilter(gray) {
    const gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    const gradX = convolve2D(gray, gx);
    const gradY = convolve2D(gray, gy);

    const result = new Float32Array(gray.width * gray.height);
    for (let i = 0; i < result.length; i++) {
        result[i] = Math.sqrt(gradX.data[i] ** 2 + gradY.data[i] ** 2);
    }

    return { data: result, width: gray.width, height: gray.height };
}

function laplacianFilter(gray) {
    const kernel = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
    const result = convolve2D(gray, kernel);

    // Take absolute values
    for (let i = 0; i < result.data.length; i++) {
        result.data[i] = Math.abs(result.data[i]);
    }

    return result;
}

function gaborKernel(ksize, sigma, theta, lambda, gamma, psi = 0) {
    const kernel = [];
    const half = Math.floor(ksize / 2);

    for (let y = -half; y <= half; y++) {
        const row = [];
        for (let x = -half; x <= half; x++) {
            const xTheta = x * Math.cos(theta) + y * Math.sin(theta);
            const yTheta = -x * Math.sin(theta) + y * Math.cos(theta);
            const value = Math.exp(-0.5 * ((xTheta ** 2 + gamma ** 2 * yTheta ** 2) / sigma ** 2)) *
                Math.cos(2 * Math.PI * xTheta / lambda + psi);
            row.push(value);
        }
        kernel.push(row);
    }

    // Normalize kernel
    let sum = 0;
    for (let row of kernel) {
        for (let val of row) {
            sum += Math.abs(val);
        }
    }
    if (sum > 0) {
        for (let i = 0; i < kernel.length; i++) {
            for (let j = 0; j < kernel[i].length; j++) {
                kernel[i][j] /= sum;
            }
        }
    }

    return kernel;
}

function gaborFilter(gray, params) {
    const kernel = gaborKernel(params.ksize, params.sigma, params.theta, params.lambda, params.gamma);
    const result = convolve2D(gray, kernel);

    // Take absolute values
    for (let i = 0; i < result.data.length; i++) {
        result.data[i] = Math.abs(result.data[i]);
    }

    return result;
}

function normalizeToUint8(data) {
    let min = Infinity, max = -Infinity;
    for (let val of data) {
        if (val < min) min = val;
        if (val > max) max = val;
    }

    const range = max - min;
    if (range < 1e-6) {
        return new Uint8ClampedArray(data.length).fill(0);
    }

    const result = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = ((data[i] - min) / range) * 255;
    }

    return result;
}

// ========================================
// Colormaps
// ========================================

function applyColormap(scoreU8, width, height, cmapName) {
    const colored = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < scoreU8.length; i++) {
        const v = scoreU8[i] / 255;
        let r, g, b;

        switch (cmapName) {
            case 'jet':
                if (v < 0.25) {
                    r = 0;
                    g = 0;
                    b = Math.floor(255 * 4 * v);
                } else if (v < 0.5) {
                    r = 0;
                    g = Math.floor(255 * 4 * (v - 0.25));
                    b = 255;
                } else if (v < 0.75) {
                    r = Math.floor(255 * 4 * (v - 0.5));
                    g = 255;
                    b = Math.floor(255 * 4 * (0.75 - v));
                } else {
                    r = 255;
                    g = Math.floor(255 * 4 * (1 - v));
                    b = 0;
                }
                break;

            case 'hot':
                if (v < 0.33) {
                    r = Math.floor(255 * 3 * v);
                    g = 0;
                    b = 0;
                } else if (v < 0.66) {
                    r = 255;
                    g = Math.floor(255 * 3 * (v - 0.33));
                    b = 0;
                } else {
                    r = 255;
                    g = 255;
                    b = Math.floor(255 * 3 * (v - 0.66));
                }
                break;

            default:
                r = g = b = scoreU8[i];
        }

        colored[i * 4] = Math.min(255, Math.max(0, r));
        colored[i * 4 + 1] = Math.min(255, Math.max(0, g));
        colored[i * 4 + 2] = Math.min(255, Math.max(0, b));
        colored[i * 4 + 3] = 255;
    }

    return new ImageData(colored, width, height);
}

// ========================================
// Main Processing Pipeline
// ========================================

function processImage() {
    if (!state.originalCanvas) {
        showToast('Aucune image', 'Veuillez d\'abord charger une image', 'error');
        return;
    }

    // Show processing overlay
    const processingOverlay = document.getElementById('processingOverlay');
    processingOverlay.classList.add('active');

    setTimeout(() => {
        try {
            const ctx = state.originalCanvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, state.originalCanvas.width, state.originalCanvas.height);

            // Convert to grayscale
            const gray = getGrayscale(imageData);

            // Apply selected method
            let result;
            switch (state.currentMethod) {
                case 'intensity':
                    result = gray;
                    break;
                case 'sobel':
                    result = sobelFilter(gray);
                    break;
                case 'laplacian':
                    result = laplacianFilter(gray);
                    break;
                case 'gabor':
                    result = gaborFilter(gray, state.gaborParams);
                    break;
                default:
                    result = gray;
            }

            // Normalize to uint8
            const normalized = normalizeToUint8(result.data);

            // Apply colormap
            const coloredImageData = applyColormap(normalized, result.width, result.height, state.currentColormap);

            // Display result
            const resultCanvas = document.getElementById('resultCanvas');
            const resultEmptyState = document.getElementById('emptyStateResult');
            const ctx2 = resultCanvas.getContext('2d');

            resultCanvas.width = result.width;
            resultCanvas.height = result.height;
            ctx2.putImageData(coloredImageData, 0, 0);

            resultCanvas.classList.add('visible');
            resultEmptyState.classList.add('hidden');

            updateCanvasInfo('result', result.width, result.height);

            // Enable download button
            document.getElementById('downloadBtn').disabled = false;

            showToast('Succès', 'Heatmap généré avec succès!', 'success');
        } catch (error) {
            console.error('Processing error:', error);
            showToast('Erreur', 'Erreur lors du traitement de l\'image', 'error');
        } finally {
            processingOverlay.classList.remove('active');
        }
    }, 100);
}

// ========================================
// Event Handlers
// ========================================

function setupEventListeners() {
    // Upload zone
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');

    uploadZone.addEventListener('click', () => imageInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file) {
            try {
                const img = await loadImage(file);
                state.originalImage = img;
                state.originalCanvas = displayImage(img, 'originalCanvas', 'emptyStateOriginal');
                showToast('Image chargée', `${file.name} chargée avec succès`, 'success');
            } catch (error) {
                showToast('Erreur', error.message, 'error');
            }
        }
    });

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const img = await loadImage(file);
                state.originalImage = img;
                state.originalCanvas = displayImage(img, 'originalCanvas', 'emptyStateOriginal');
                showToast('Image chargée', `${file.name} chargée avec succès`, 'success');
            } catch (error) {
                showToast('Erreur', error.message, 'error');
            }
        }
    });

    // Method selection
    const methodCards = document.querySelectorAll('.method-card');
    methodCards.forEach(card => {
        card.addEventListener('click', () => {
            methodCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.currentMethod = card.dataset.method;

            // Show/hide Gabor parameters
            const gaborParams = document.getElementById('gaborParams');
            if (state.currentMethod === 'gabor') {
                gaborParams.style.display = 'flex';
            } else {
                gaborParams.style.display = 'none';
            }
        });
    });

    // Colormap selection
    const colormapOptions = document.querySelectorAll('.colormap-option');
    colormapOptions.forEach(option => {
        option.addEventListener('click', () => {
            colormapOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            state.currentColormap = option.dataset.colormap;
        });
    });

    // Gabor parameters
    const params = ['ksize', 'sigma', 'theta', 'lambda', 'gamma'];
    params.forEach(param => {
        const slider = document.getElementById(param);
        const valueDisplay = document.getElementById(`${param}Value`);

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            state.gaborParams[param] = value;

            if (param === 'ksize') {
                valueDisplay.textContent = value;
            } else {
                valueDisplay.textContent = value.toFixed(2);
            }
        });
    });

    // Apply button
    document.getElementById('applyBtn').addEventListener('click', processImage);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        state.originalImage = null;
        state.originalCanvas = null;

        const originalCanvas = document.getElementById('originalCanvas');
        const resultCanvas = document.getElementById('resultCanvas');
        const emptyStateOriginal = document.getElementById('emptyStateOriginal');
        const emptyStateResult = document.getElementById('emptyStateResult');

        originalCanvas.classList.remove('visible');
        resultCanvas.classList.remove('visible');
        emptyStateOriginal.classList.remove('hidden');
        emptyStateResult.classList.remove('hidden');

        updateCanvasInfo('original');
        updateCanvasInfo('result');

        document.getElementById('downloadBtn').disabled = true;

        showToast('Réinitialisation', 'Interface réinitialisée', 'info');
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const resultCanvas = document.getElementById('resultCanvas');
        const link = document.createElement('a');
        link.download = `heatmap_${Date.now()}.png`;
        link.href = resultCanvas.toDataURL('image/png');
        link.click();

        showToast('Téléchargement', 'Image téléchargée avec succès', 'success');
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
    });

    // View controls
    const viewBtns = document.querySelectorAll('.view-btn');
    const canvasContainer = document.getElementById('canvasContainer');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            canvasContainer.className = `canvas-container ${view}`;
        });
    });
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Show welcome toast
    setTimeout(() => {
        showToast('Bienvenue', 'Chargez une image pour commencer l\'analyse', 'info');
    }, 500);
});
