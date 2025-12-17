// src/components/Loading.tsx

import React from 'react';
import './Loading.css';

const Loading: React.FC = () => {
    return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>加载中，请稍候...</p>
        </div>
    );
};

export default Loading;
