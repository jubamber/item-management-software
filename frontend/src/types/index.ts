// src/types/index.ts
// 通用类型定义

export interface User {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
    token?: string;
}

export interface AttributeDefinition {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
}

export interface ItemType {
    id: number;
    name: string;
    attributes: AttributeDefinition[];
}

export interface Item {
    id: number;
    name: string;
    type_name: string;
    description: string;
    address: string;
    owner: string;
    owner_id: number;
    attributes: Record<string, any>; // 动态属性键值对
    status: string;
    created_at: string;
}

export interface LoginResponse {
    token: string;
    role: 'user' | 'admin';
    username: string;
    id: number;
}