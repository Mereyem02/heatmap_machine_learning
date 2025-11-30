# 🔥 Heatmap Studio - Image Analysis with Machine Learning Filters

A powerful image analysis application that generates heatmaps using various computer vision filters. Available as both a **Python/Tkinter desktop application** and a **modern web interface**.

![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Features

- **Multiple Analysis Methods**
  - 🔆 **Intensity Analysis** - Convert images to grayscale intensity maps
  - 📐 **Sobel Edge Detection** - Detect edges using gradient-based filtering
  - 🔍 **Laplacian Filter** - Second-order derivative edge detection
  - 🌊 **Gabor Filter** - Texture analysis with configurable parameters

- **Colormap Visualization**
  - **Jet** - Rainbow color palette from blue to red
  - **Hot** - Heat-based palette from black through red/yellow to white

- **Manual Implementation** - All convolution operations and filters are implemented from scratch without relying on pre-built filter functions

- **Dual Interface**
  - Desktop application with Python/Tkinter
  - Modern responsive web interface with dark/light themes

## 🖥️ Desktop Application (Python)

### Prerequisites

```bash
pip install numpy opencv-python pillow
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `numpy` | >=1.21.0 | Numerical computations and array operations |
| `opencv-python` | >=4.8.0 | Image loading and color space conversions |
| `pillow` | >=9.0.0 | Image display in Tkinter |
| `tkinter` | Built-in | GUI framework |

### Running the Desktop App

```bash
python main.py
```

### Desktop App Features

- Modern Tkinter interface with rounded buttons
- Scrollable control panel
- Responsive image display
- Support for various image formats (PNG, JPG, JPEG, BMP, etc.)

## 🌐 Web Application

### Running the Web App

Simply open `index.html` in a modern web browser. No server or build process required!

```bash
# Using Python's built-in server (optional)
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

### Web App Features

- 🎨 Beautiful animated gradient background
- 🌙 Dark/Light theme toggle
- 📱 Fully responsive design
- 🖱️ Drag & drop image upload
- 📊 Side-by-side and overlay comparison views
- ⬇️ Download generated heatmaps
- 🔔 Toast notification system

## 🔧 How It Works

### Image Processing Pipeline

1. **Load Image** - Read image and convert to BGR format
2. **Grayscale Conversion** - Convert to single-channel intensity values
3. **Apply Filter** - Process with selected analysis method
4. **Normalize** - Scale values to 0-255 range
5. **Apply Colormap** - Map intensity to colors
6. **Display/Export** - Show result and enable download

### Filter Algorithms

#### Sobel Edge Detection
Calculates image gradients using 3x3 convolution kernels:
```
Gx = [[-1, 0, 1],      Gy = [[-1, -2, -1],
      [-2, 0, 2],            [ 0,  0,  0],
      [-1, 0, 1]]            [ 1,  2,  1]]

Magnitude = √(Gx² + Gy²)
```

#### Laplacian Filter
Second-order derivative using the kernel:
```
[[0,  1, 0],
 [1, -4, 1],
 [0,  1, 0]]
```

#### Gabor Filter
Texture analysis filter combining Gaussian envelope with sinusoidal wave:

**Parameters:**
| Parameter | Description | Default |
|-----------|-------------|---------|
| ksize | Kernel size | 31 |
| sigma | Gaussian envelope standard deviation | 4.0 |
| theta | Orientation (radians) | 0.0 |
| lambda | Sinusoidal wavelength | 10.0 |
| gamma | Spatial aspect ratio | 0.5 |

## 📂 Project Structure

```
heatmap_machine_learning/
├── README.md           # Project documentation
├── main.py             # Python/Tkinter desktop application
├── index.html          # Web interface HTML
├── script.js           # Web application JavaScript
└── style.css           # Web interface styles
```

## 🖼️ Usage Examples

### Desktop Application

1. Run `python main.py`
2. Click "Charger Image" to select an image
3. Choose an analysis method (Intensity, Sobel, Laplacian, or Gabor)
4. Adjust Gabor parameters if using Gabor filter
5. Select a colormap (Jet or Hot)
6. View the generated heatmap

### Web Application

1. Open `index.html` in a browser
2. Drag & drop an image or click the upload zone
3. Select an analysis method from the grid
4. Configure Gabor parameters if needed
5. Choose a color palette
6. Click "Appliquer le filtre" to generate the heatmap
7. Download the result with the download button

## 🎯 Use Cases

- **Image Analysis** - Visualize intensity distributions in images
- **Edge Detection** - Identify boundaries and contours in images
- **Texture Analysis** - Extract texture patterns with Gabor filters
- **Educational** - Learn about computer vision filter implementations
- **Research** - Prototype image processing pipelines

## 🔬 Technical Details

### Manual Convolution Implementation

The project features a completely manual 2D convolution implementation:

```python
def convolve2d_manual(image, kernel):
    # Pad image with reflection
    padded = pad_image(image, pad_h, pad_w)
    # Flip kernel for convolution
    k = np.flipud(np.fliplr(kernel))
    # Apply convolution
    for y in range(height):
        for x in range(width):
            out[y, x] = np.sum(padded[y:y+kh, x:x+kw] * k)
    return out
```

### Colormap Implementation

Custom colormap functions for Jet and Hot palettes:

- **Jet**: Blue → Cyan → Green → Yellow → Red
- **Hot**: Black → Red → Yellow → White

## 🌍 Language

The interface is in **French**:
- "Charger l'image" = Load image
- "Méthode d'analyse" = Analysis method
- "Palette de couleurs" = Color palette
- "Appliquer le filtre" = Apply filter
- "Télécharger" = Download
- "Réinitialiser" = Reset

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Made with ❤️ for image processing enthusiasts
