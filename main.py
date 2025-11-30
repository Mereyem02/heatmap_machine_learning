"""
Heatmap Project complet avec interface Tkinter ultra-moderne, boutons arrondis,
scrollable frame pour les contrôles et image responsive.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
import cv2
import numpy as np
import math

# ---------------------- Utilitaires ----------------------

def load_image(path):
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError('Impossible de charger l\'image: ' + path)
    if img.ndim == 2:
        img_bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 3:
        img_bgr = img
    else:
        img_bgr = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img_bgr
#La fonction va retourner toujours une image BGR 3 canaux, peu importe le format d’entrée.
#Ça évite des crashs plus tard.

def get_gray(img_bgr):
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
#Résumé version simple
# BGR → gris :
# pour passer de 3 valeurs par pixel à une seule valeur utile.
#
# uint8 → float32 :
# pour éviter les dépassements et faire des filtres mathématiques sans fausser les résultats.

def normalize_to_uint8(img):
    mn, mx = img.min(), img.max()
    if mx - mn < 1e-6:
        return np.zeros_like(img, dtype=np.uint8)
#     return ((img - mn) / (mx - mn) * 255).astype(np.uint8)
# C’est exactement la normalisation linéaire :
# (img - mn) : tu déplaces les valeurs pour que le minimum devienne 0
# / (mx - mn) : tu mets tout entre 0 et 1
# * 255 : tu étales entre 0 et 255
# .astype(np.uint8) : tu convertis en format image standard
# Ça te permet ensuite d’appliquer une colormap type jet ou hot proprement.

# ---------------------- Convolution manuelle ----------------------

def pad_image(img, pad_h, pad_w, mode='reflect'):
    return np.pad(img, ((pad_h, pad_h), (pad_w, pad_w)), mode=mode)

def convolve2d_manual(image, kernel):
    ih, iw = image.shape
    kh, kw = kernel.shape
    pad_h, pad_w = kh // 2, kw // 2
    padded = pad_image(image, pad_h, pad_w)
    out = np.zeros_like(image, dtype=np.float32)
    k = np.flipud(np.fliplr(kernel)).astype(np.float32)
    for y in range(ih):
        for x in range(iw):
            out[y, x] = np.sum(padded[y:y+kh, x:x+kw] * k)
    return out

# ---------------------- Filtres ----------------------

def sobel_manual(gray):
    gx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]],dtype=np.float32)
    gy = np.array([[-1,-2,-1],[0,0,0],[1,2,1]],dtype=np.float32)
    return np.sqrt(convolve2d_manual(gray,gx)*2 + convolve2d_manual(gray,gy)*2)

def laplacian_manual(gray):
    kernel = np.array([[0,1,0],[1,-4,1],[0,1,0]],dtype=np.float32)
    return np.abs(convolve2d_manual(gray,kernel))

def gabor_kernel_manual(ksize,sigma,theta,lambd,gamma,psi):
    half = ksize//2
    kernel = np.zeros((ksize,ksize),dtype=np.float32)
    for y in range(-half,half+1):
        for x in range(-half,half+1):
            x_theta = x*math.cos(theta)+y*math.sin(theta)
            y_theta = -x*math.sin(theta)+y*math.cos(theta)
            kernel[y+half,x+half] = math.exp(-0.5*((x_theta*2)/(sigma2)+(y_theta2)/(sigma2/gamma*2))) * math.cos(2*math.pi*x_theta/lambd + psi)
    kernel -= kernel.mean()
    norm = np.sqrt((kernel**2).sum())
    if norm != 0: kernel /= norm
    return kernel

def gabor_manual(gray,ksize=31,sigma=4,theta=0,lambd=10,gamma=0.5,psi=0):
    kernel = gabor_kernel_manual(ksize,sigma,theta,lambd,gamma,psi)
    return np.abs(convolve2d_manual(gray,kernel))

# ---------------------- Colormap ----------------------

def colormap_manual(score_u8, cmap_name='JET'):
    h,w = score_u8.shape
    colored = np.zeros((h,w,3),dtype=np.uint8)
    norm = score_u8/255.0
    for y in range(h):
        for x in range(w):
            v = norm[y,x]
            if cmap_name=='JET':
                if v<0.25: r,g,b = 0,0,int(255*4*v)
                elif v<0.5: r,g,b = 0,int(255*4*(v-0.25)),255
                elif v<0.75: r,g,b = int(255*4*(v-0.5)),255,int(255*4*(0.75-v))
                else: r,g,b = 255,int(255*4*(1-v)),0
            elif cmap_name=='HOT':
                if v<0.33: r,g,b = int(255*3*v),0,0
                elif v<0.66: r,g,b = 255,int(255*3*(v-0.33)),0
                else: r,g,b = 255,255,int(255*3*(v-0.66))
            colored[y,x] = [np.clip(r,0,255), np.clip(g,0,255), np.clip(b,0,255)]
    return colored

# ---------------------- Pipeline ----------------------

def apply_method(img_bgr, method, g_params=None):
    gray = get_gray(img_bgr)
    if method=='intensité': return gray
    elif method=='sobel': return sobel_manual(gray)
    elif method=='laplacien': return laplacian_manual(gray)
    elif method=='gabor': return gabor_manual(gray, **g_params)

# ---------------------- Bouton arrondi ----------------------

class RoundedButton(tk.Canvas):
    def _init_(self, parent, width, height, cornerradius, bg, fg, text, command=None):
        tk.Canvas._init_(self, parent, width=width, height=height, borderwidth=0, highlightthickness=0)
        self.command = command; self.bg = bg; self.fg = fg
        self.create_rounded_rect(0,0,width,height,cornerradius,fill=bg)
        self.text_id = self.create_text(width//2,height//2,text=text,fill=fg,font=('Segoe UI',11,'bold'))
        self.bind("<Button-1>", self.on_click)

    def create_rounded_rect(self,x1,y1,x2,y2,r=25,**kwargs):
        points = [x1+r, y1, x2-r, y1, x2, y1+r, x2, y2-r, x2-r, y2, x1+r, y2, x1, y2-r, x1, y1+r]
        return self.create_polygon(points, smooth=True, **kwargs)

    def on_click(self,event):
        if self.command: self.command()
