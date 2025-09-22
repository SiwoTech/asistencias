// Generador automático de iconos PWA
class PWAIconGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.sizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
        this.generated = [];
    }

    // Cargar imagen base
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => img.src = e.target.result;
                reader.readAsDataURL(file);
            } else {
                img.src = file;
            }
        });
    }

    // Generar icono en tamaño específico
    generateIcon(img, size) {
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Limpiar canvas
        this.ctx.clearRect(0, 0, size, size);
        
        // Fondo opcional (puedes cambiarlo)
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(0, 0, size, size);
        
        // Calcular dimensiones para centrar la imagen
        const padding = size * 0.1; // 10% de padding
        const iconSize = size - (padding * 2);
        
        // Dibujar imagen centrada
        this.ctx.drawImage(img, padding, padding, iconSize, iconSize);
        
        // Convertir a blob
        return new Promise(resolve => {
            this.canvas.toBlob(resolve, 'image/png');
        });
    }

    // Generar todos los tamaños
    async generateAllSizes(imageSource) {
        try {
            const img = await this.loadImage(imageSource);
            const icons = [];
            
            for (const size of this.sizes) {
                console.log(`Generando icono ${size}x${size}...`);
                const blob = await this.generateIcon(img, size);
                
                icons.push({
                    size: size,
                    blob: blob,
                    filename: `icon-${size}x${size}.png`
                });
            }
            
            this.generated = icons;
            return icons;
        } catch (error) {
            console.error('Error generando iconos:', error);
            throw error;
        }
    }

    // Descargar iconos como ZIP
    async downloadAsZip() {
        if (!window.JSZip) {
            console.error('JSZip no está disponible');
            return;
        }

        const zip = new JSZip();
        const iconsFolder = zip.folder('icons');

        for (const icon of this.generated) {
            iconsFolder.file(icon.filename, icon.blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        this.downloadBlob(content, 'pwa-icons.zip');
    }

    // Descargar iconos individualmente
    downloadIcons() {
        this.generated.forEach(icon => {
            this.downloadBlob(icon.blob, icon.filename);
        });
    }

    // Función auxiliar para descargar
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Crear preview de los iconos
    createPreview(container) {
        container.innerHTML = '<h3>Vista previa de iconos generados:</h3>';
        
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
            margin-top: 20px;
        `;

        this.generated.forEach(icon => {
            const iconDiv = document.createElement('div');
            iconDiv.style.cssText = `
                text-align: center;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: white;
            `;

            const img = document.createElement('img');
            img.src = URL.createObjectURL(icon.blob);
            img.style.cssText = `
                width: 64px;
                height: 64px;
                border-radius: 8px;
                margin-bottom: 8px;
            `;

            const label = document.createElement('div');
            label.textContent = `${icon.size}x${icon.size}`;
            label.style.cssText = `
                font-size: 12px;
                color: #666;
                font-weight: bold;
            `;

            iconDiv.appendChild(img);
            iconDiv.appendChild(label);
            grid.appendChild(iconDiv);
        });

        container.appendChild(grid);
    }
}

// Crear interfaz de usuario
function createIconGeneratorUI() {
    // Verificar si ya existe
    if (document.getElementById('icon-generator')) {
        return;
    }

    const ui = document.createElement('div');
    ui.id = 'icon-generator';
    ui.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        font-family: Arial, sans-serif;
    `;

    ui.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">Generador de Iconos PWA</h2>
            <button onclick="closeIconGenerator()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold;">Selecciona tu logo:</label>
            <input type="file" id="logo-input" accept="image/*" style="
                width: 100%;
                padding: 10px;
                border: 2px dashed #ddd;
                border-radius: 5px;
                cursor: pointer;
            ">
            <div style="margin-top: 10px; font-size: 14px; color: #666;">
                Formatos soportados: PNG, JPG, SVG (recomendado: imagen cuadrada de al menos 512x512px)
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <button id="generate-btn" onclick="generateIcons()" disabled style="
                background: #e74c3c;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-right: 10px;
            ">Generar Iconos</button>
            
            <button id="download-btn" onclick="downloadIcons()" disabled style="
                background: #27ae60;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-right: 10px;
            ">Descargar Todo</button>
            
            <button id="download-zip-btn" onclick="downloadAsZip()" disabled style="
                background: #3498db;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Descargar ZIP</button>
        </div>
        
        <div id="progress" style="display: none; margin-bottom: 20px;">
            <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                <div id="progress-bar" style="
                    background: #e74c3c;
                    height: 20px;
                    width: 0%;
                    transition: width 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                "></div>
            </div>
        </div>
        
        <div id="preview-container"></div>
    `;

    document.body.appendChild(ui);

    // Crear backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'icon-generator-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
    `;
    backdrop.onclick = closeIconGenerator;
    document.body.insertBefore(backdrop, ui);

    // Setup event listeners
    const fileInput = document.getElementById('logo-input');
    const generateBtn = document.getElementById('generate-btn');

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
        }
    });
}

// Variables globales
let iconGenerator;
let selectedFile;

// Funciones globales
function generateIcons() {
    const fileInput = document.getElementById('logo-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor selecciona un archivo de imagen');
        return;
    }

    iconGenerator = new PWAIconGenerator();
    selectedFile = file;

    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progress-bar');
    
    progress.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = 'Generando...';

    iconGenerator.generateAllSizes(file)
        .then(icons => {
            progressBar.style.width = '100%';
            progressBar.textContent = 'Completado';
            
            setTimeout(() => {
                progress.style.display = 'none';
                
                // Habilitar botones de descarga
                document.getElementById('download-btn').disabled = false;
                document.getElementById('download-zip-btn').disabled = false;
                
                // Mostrar preview
                const previewContainer = document.getElementById('preview-container');
                iconGenerator.createPreview(previewContainer);
            }, 500);
        })
        .catch(error => {
            alert('Error generando iconos: ' + error.message);
            progress.style.display = 'none';
        });
}

function downloadIcons() {
    if (iconGenerator) {
        iconGenerator.downloadIcons();
    }
}

function downloadAsZip() {
    if (iconGenerator) {
        // Cargar JSZip si no está disponible
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => iconGenerator.downloadAsZip();
            document.head.appendChild(script);
        } else {
            iconGenerator.downloadAsZip();
        }
    }
}

function closeIconGenerator() {
    const ui = document.getElementById('icon-generator');
    const backdrop = document.getElementById('icon-generator-backdrop');
    
    if (ui) ui.remove();
    if (backdrop) backdrop.remove();
}

// Auto-inicializar si estamos en la página correcta
if (window.location.pathname.includes('asistencias')) {
    console.log('🎨 Generador de iconos PWA disponible');
    console.log('Ejecuta: createIconGeneratorUI() para abrir el generador');
}