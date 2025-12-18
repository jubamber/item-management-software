// src/components/ImageUploader.tsx

import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import api from '../api';
import './ImageUploader.css';

interface ImageUploaderProps {
    // currentImage 在此组件内部主要用于判断是否显示"更换"的文案，
    // 但核心预览将移交父组件处理，这里主要负责动作。
    onImageUploaded: (path: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUploaded }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    
    // 拖拽状态
    const [dragActive, setDragActive] = useState(false);
    
    // 引用隐藏的 input
    const inputRef = useRef<HTMLInputElement>(null);

    // 处理文件读取
    const processFile = async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl as string);
        } else {
            alert("请上传图片文件");
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    // 拖拽事件处理
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    // 触发点击上传
    const handleClickUpload = () => {
        inputRef.current?.click();
    };

    const readFile = (file: File) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result), false);
            reader.readAsDataURL(file);
        });
    };

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setUploading(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) return;

            const formData = new FormData();
            formData.append('file', croppedImageBlob, 'item-image.jpg');

            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const serverPath = res.data.path;
            onImageUploaded(serverPath); 
            setImageSrc(null); // 关闭裁剪窗口
            // 注意：这里不再alert，体验更流畅
        } catch (e) {
            console.error(e);
            alert("图片上传失败");
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setImageSrc(null);
        setZoom(1);
    };

    return (
        <div className="image-uploader-container">
            {/* 1. 裁剪模式：保持原样 */}
            {imageSrc ? (
                <div className="cropper-wrapper">
                    <div className="cropper-area">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={4 / 3}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div className="cropper-controls">
                        <div className="zoom-slider">
                            <label>缩放:</label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                onChange={(e) => setZoom(Number(e.target.value))}
                            />
                        </div>
                        <div className="cropper-buttons">
                            <button type="button" onClick={handleCancel} disabled={uploading} className="btn-secondary">
                                取消
                            </button>
                            <button type="button" onClick={handleSave} disabled={uploading} className="btn-primary">
                                {uploading ? '上传中...' : '确认裁剪并上传'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* 2. 拖拽/点击上传区域 (替代旧的预览区域) */
                <div 
                    className={`upload-drop-zone ${dragActive ? 'active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleClickUpload}
                >
                    <input 
                        ref={inputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={onFileChange} 
                        className="hidden-input" 
                    />
                    
                    {/* SVG 图标：深灰色图片图标 */}
                    <div className="upload-icon">
                        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                    
                    <p className="upload-text">点击或拖拽上传</p>
                    <span className="upload-hint">支持 JPG, PNG (自动裁剪 4:3)</span>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;