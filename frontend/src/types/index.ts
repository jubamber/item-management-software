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
    key: string;      // 存入数据库的键名 (如: expiry_date)
    label: string;    // 显示给用户的名称 (如: 保质期)
    type: 'text' | 'number' | 'date' | 'select'; // 增加 select 类型
    options?: string[]; // 当 type 为 select 时，存储选项列表 (如: ["S", "M", "L"])
    required?: boolean; // 可选：是否必填
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