# app.py

import json
import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify 
from flask_sqlalchemy import SQLAlchemy # ORM
from sqlalchemy.exc import IntegrityError
from flask_cors import CORS # 处理跨域请求
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
) # jwt认证

from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-this-in-production' # 实际使用时需要加密，这里就不修改了

# 图片存储配置
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'images')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保目录存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

db = SQLAlchemy(app)
CORS(app)
jwt = JWTManager(app)

# ================= 模型定义 (Models) =================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120), unique=True)
    role = db.Column(db.String(20), default='user')  # user, admin
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected

class ItemType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    # attributes 存储 JSON 字符串: [{"name": "保质期", "type": "date"}, {"name": "作者", "type": "text"}]
    # type类型可以自定义，不做限制，只要能处理
    attributes = db.Column(db.Text, nullable=False, default='[]')

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type_id = db.Column(db.Integer, db.ForeignKey('item_type.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # 新增图片路径字段
    image_path = db.Column(db.String(300), nullable=True) 

    attributes = db.Column(db.Text, default='{}') 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='available')

    item_type = db.relationship('ItemType', backref='items')
    owner = db.relationship('User', backref='items')

# ================= 辅助函数 =================

def create_admin():
    """初始化创建一个默认管理员账号"""
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            status='approved',
            email='admin@ims.com'
        )
        db.session.add(admin)
        
        # 初始化一些类型
        default_types = [
            {
                "name": "食品",
                "attributes": [
                    {"key": "expiry_date", "label": "保质期", "type": "date"},
                    {"key": "quantity", "label": "数量", "type": "number"}
                ]
            },
            {
                "name": "书籍",
                "attributes": [
                    {"key": "author", "label": "作者", "type": "text"},
                    {"key": "isbn", "label": "ISBN", "type": "text"}
                ]
            }
        ]

        for t in default_types:
            if not ItemType.query.filter_by(name=t["name"]).first():
                item_type = ItemType(
                    name=t["name"],
                    attributes=json.dumps(t["attributes"])
                )
                db.session.add(item_type)
        
        db.session.commit()
        print("Admin user and default types created.")

# ================= 路由接口 (Routes) =================

# 1. 认证模块
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter((User.username == data['username']) | (User.email == data['email'])).first():
        return jsonify({"msg": "Username or Email already exists"}), 400
    
    new_user = User(
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        address=data.get('address'),
        phone=data.get('phone'),
        email=data['email']
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"msg": "Registration successful. Please wait for admin approval."}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter((User.username == data['username']) | (User.email == data['username'])).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    if user.status != 'approved':
        return jsonify({"msg": "Account is not approved yet"}), 403
    
    # token = create_access_token(identity={'id': user.id, 'role': user.role, 'username': user.username})
    # identity 必须是字符串 (这里存 user.id)
    # 其他信息放入 additional_claims
    token = create_access_token(
        identity=str(user.id), 
        additional_claims={"role": user.role, "username": user.username}
    )
    return jsonify({
        "token": token,
        "role": user.role,
        "username": user.username,
        "id": user.id      
    }), 200

# 2. 物品类型模块 (公共读取，管理员管理)
@app.route('/types', methods=['GET'])
def get_types():
    types = ItemType.query.all()
    return jsonify([{
        "id": t.id, 
        "name": t.name, 
        "attributes": json.loads(t.attributes)
    } for t in types])

@app.route('/types', methods=['POST'])
@jwt_required()
def add_type():
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    data = request.json
    try:
        new_type = ItemType(
            name=data['name'],
            attributes=json.dumps(data['attributes'])
        )
        db.session.add(new_type)
        db.session.commit()
        return jsonify({"msg": "Type added"}), 201
        
    except IntegrityError:
        db.session.rollback() # 发生错误必须回滚
        return jsonify({"msg": "类型名称已存在，请更换名称"}), 400 # 返回明确的 400 错误
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Server Error: {str(e)}"}), 500

@app.route('/types/<int:type_id>', methods=['PUT'])
@jwt_required()
def update_type(type_id):
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    item_type = ItemType.query.get_or_404(type_id)
    data = request.json
    
    try:
        if 'name' in data:
            item_type.name = data['name']
        
        if 'attributes' in data:
            item_type.attributes = json.dumps(data['attributes'])
            
        db.session.commit()
        return jsonify({"msg": "Type updated successfully"}), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({"msg": "该类型名称已存在，无法修改为该名称"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error: {str(e)}"}), 500

@app.route('/types/<int:type_id>', methods=['DELETE'])
@jwt_required()
def delete_type(type_id):
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    item_type = ItemType.query.get_or_404(type_id)
    
    # 检查是否有物品正在使用该类型，如果有则阻止删除（或做级联删除）
    if Item.query.filter_by(type_id=type_id).first():
        return jsonify({"msg": "Cannot delete type: It is being used by existing items."}), 400
        
    db.session.delete(item_type)
    db.session.commit()
    return jsonify({"msg": "Type deleted successfully"}), 200

# 3. 物品管理模块
@app.route('/items', methods=['POST'])
@jwt_required()
def add_item():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    data = request.json
    
    new_item = Item(
        type_id=data['type_id'],
        owner_id=user.id,
        name=data['name'],
        description=data.get('description'),
        address=data.get('address', user.address),
        phone=data.get('phone', user.phone),
        email=data.get('email', user.email),
        # 接收 image_path
        image_path=data.get('image_path', None),
        attributes=json.dumps(data.get('attributes', {})),
        status='available'
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({"msg": "Item added successfully"}), 201

@app.route('/items', methods=['GET'])
def get_items():
    type_id = request.args.get('type_id')
    keyword = request.args.get('keyword')
    owner_id = request.args.get('owner_id')
    
    query = Item.query
    if type_id: query = query.filter_by(type_id=type_id)
    if owner_id: query = query.filter_by(owner_id=owner_id)
    if keyword:
        search = f"%{keyword}%"
        query = query.filter((Item.name.like(search)) | (Item.description.like(search)))
        
    items = query.order_by(Item.created_at.desc()).all()
    
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "type_name": item.item_type.name,
            "description": item.description,
            "address": item.address,
            "owner": item.owner.username,
            "owner_id": item.owner_id,
            # 返回 image_path
            "image_path": item.image_path,
            "attributes": json.loads(item.attributes),
            "status": item.status,
            "created_at": item.created_at.strftime('%Y-%m-%d')
        })
    return jsonify(result)

@app.route('/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    current_user_id = int(get_jwt_identity()) # 获取 ID
    identity = get_jwt()
    item = Item.query.get_or_404(item_id)
    
    # 允许所有者或管理员删除
    if item.owner_id != current_user_id and identity['role'] != 'admin':
        return jsonify({"msg": "Permission denied"}), 403
        
    db.session.delete(item)
    db.session.commit()
    return jsonify({"msg": "Item deleted"}), 200

# 3.1 修改物品信息 (含 标记已领走 功能)
@app.route('/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    current_user_id = int(get_jwt_identity())
    identity = get_jwt()
    item = Item.query.get_or_404(item_id)
    
    # 权限验证：只有所有者或管理员可以修改
    if item.owner_id != current_user_id and identity['role'] != 'admin':
        return jsonify({"msg": "Permission denied"}), 403
    
    data = request.json
    
    # 更新基本字段 (如果请求中包含该字段则更新)
    if 'name' in data: item.name = data['name']
    if 'description' in data: item.description = data['description']
    if 'address' in data: item.address = data['address']
    if 'phone' in data: item.phone = data['phone']
    if 'email' in data: item.email = data['email']
    # 更新图片路径
    if 'image_path' in data: item.image_path = data['image_path']
    
    # 更新状态 (Mark as Taken)
    if 'status' in data:
        # 限制状态只能是 available 或 taken
        if data['status'] in ['available', 'taken']:
            item.status = data['status']
            
    # 更新动态属性
    if 'attributes' in data:
        # 确保传入的是字典
        item.attributes = json.dumps(data['attributes'])
        
    db.session.commit()
    return jsonify({"msg": "Item updated successfully"}), 200

# 4. 管理员模块
@app.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
        
    status = request.args.get('status')
    keyword = request.args.get('keyword') # 新增关键词参数
    
    query = User.query
    
    # 筛选状态
    if status:
        query = query.filter_by(status=status)
    
    # 筛选关键词 (用户名 或 邮箱 或 电话)
    if keyword:
        search_term = f"%{keyword}%"
        query = query.filter(
            (User.username.like(search_term)) | 
            (User.email.like(search_term)) |
            (User.phone.like(search_term))
        )
        
    users = query.all()
    
    # 返回更详细的信息
    return jsonify([{
        "id": u.id, 
        "username": u.username, 
        "email": u.email,
        "phone": u.phone,
        "address": u.address,
        "status": u.status, 
        "role": u.role
    } for u in users])

# 删除用户接口
@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    user = User.query.get_or_404(user_id)
    
    # 防止删除自己（如果需要取消注释下面两行）
    if str(user.id) == get_jwt_identity():
        return jsonify({"msg": "Cannot delete yourself"}), 400

    try:
        # 手动级联删除：先删除该用户发布的所有物品
        Item.query.filter_by(owner_id=user.id).delete()
        
        # 删除用户
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "User and their items deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Delete failed: {str(e)}"}), 500
    
# 注销用户接口
@app.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_self(user_id):
    current_user_id = int(get_jwt_identity())
    if user_id != current_user_id:
        return jsonify({"msg": "Permission denied"}), 403
    user = User.query.get_or_404(user_id)
    try:
        # 手动级联删除：先删除该用户发布的所有物品
        Item.query.filter_by(owner_id=user.id).delete()
        
        # 删除用户
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "User and their items deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Delete failed: {str(e)}"}), 500
    
@app.route('/admin/promote/<int:user_id>', methods=['POST'])
@jwt_required()
def promote_user(user_id):
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    user = User.query.get_or_404(user_id)
    if user.role == 'admin':
        return jsonify({"msg": "User is already an admin"}), 400

    user.role = 'admin'
    db.session.commit()
    return jsonify({"msg": f"{user.username} has been promoted to admin"}), 200

@app.route('/admin/demote/<int:user_id>', methods=['POST'])
@jwt_required()
def demote_user(user_id):
    identity = get_jwt()
    current_user_id = int(get_jwt_identity())
    
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    if user_id == current_user_id:
        return jsonify({"msg": "Cannot demote yourself"}), 400  # 防止降级自己

    user = User.query.get_or_404(user_id)
    if user.role != 'admin':
        return jsonify({"msg": "User is not an admin"}), 400

    user.role = 'user'
    db.session.commit()
    return jsonify({"msg": f"{user.username} has been demoted to user"}), 200

@app.route('/admin/approve/<int:user_id>', methods=['POST'])
@jwt_required()
def approve_user(user_id):
    # identity = get_jwt_identity()
    identity = get_jwt()
    if identity['role'] != 'admin': return jsonify({"msg": "Admin only"}), 403
    
    action = request.json.get('action') # 'approve' or 'reject'
    user = User.query.get_or_404(user_id)
    
    if action == 'approve':
        user.status = 'approved'
    elif action == 'reject':
        user.status = 'rejected'
        
    db.session.commit()
    return jsonify({"msg": f"User {action}d"}), 200

# 4.1 修改个人信息 (User Profile Update)
@app.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user_profile(user_id):
    current_user_id = int(get_jwt_identity())
    
    # 只能修改自己的信息
    if user_id != current_user_id:
        return jsonify({"msg": "Permission denied"}), 403
        
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'phone' in data: user.phone = data['phone']
    if 'address' in data: user.address = data['address']
    # 如果需要支持修改密码，需在此处处理 generate_password_hash
    
    db.session.commit()
    return jsonify({"msg": "Profile updated successfully"}), 200

@app.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_detail(user_id):
    current_user_id = int(get_jwt_identity())
    identity = get_jwt()
    
    # 允许 admin 查看任何人，或用户查看自己
    if user_id != current_user_id and identity['role'] != 'admin':
        return jsonify({"msg": "Permission denied"}), 403
        
    user = User.query.get_or_404(user_id)
    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "role": user.role,
        "status": user.status
    })

# 图片上传接口
@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():
    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    if file:
        # 生成唯一文件名
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        file.save(filepath)
        
        # 返回相对路径供前端存储和访问
        # 注意：前端访问时路径为 http://host:port/static/images/filename
        return jsonify({"path": f"/static/images/{filename}"}), 201


# 启动
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_admin()
    app.run(debug=True, port=5000)