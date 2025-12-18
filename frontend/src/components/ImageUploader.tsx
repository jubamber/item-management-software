// src/components/ImageUploader.tsx

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import api from '../api';
import './ImageUploader.css';

interface ImageUploaderProps {
    currentImage?: string | null;
    onImageUploaded: (path: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ currentImage, onImageUploaded }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [uploading, setUploading] = useState(false);

    // 文件选择处理
    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl as string);
        }
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

    // 执行裁剪并上传
    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setUploading(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) return;

            const formData = new FormData();
            // 文件名可以是任意的，后端会重命名
            formData.append('file', croppedImageBlob, 'item-image.jpg');

            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const serverPath = res.data.path;
            onImageUploaded(serverPath); // 回调父组件
            setImageSrc(null); // 关闭裁剪窗口，显示预览
            alert("图片上传成功！");
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
            <label>物品示意图:</label>
            
            {/* 1. 如果正在裁剪中，显示裁剪界面 */}
            {imageSrc ? (
                <div className="cropper-wrapper">
                    <div className="cropper-area">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={4 / 3} // 统一比例 4:3
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
                                aria-labelledby="Zoom"
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
                /* 2. 否则显示当前图片预览 + 上传按钮 */
                <div className="preview-area">
                    {currentImage && (
                        <div className="current-image-preview">
                            <img src={`http://localhost:5000${currentImage}`} alt="Current" />
                        </div>
                    )}
                    
                    <div className="file-input-wrapper">
                        <input type="file" accept="image/*" onChange={onFileChange} id="file-upload" className="hidden-input" />
                        <label htmlFor="file-upload" className="upload-btn-label">
                            {currentImage ? '更换图片' : '上传图片'}
                        </label>
                        <span className="file-hint">支持 JPG, PNG</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;