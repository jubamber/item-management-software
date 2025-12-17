# app.py

import json
from datetime import datetime
from flask import Flask, request, jsonify 
from flask_sqlalchemy import SQLAlchemy # ORM
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
    
    # 存储特定属性值的 JSON 字符串: {"保质期": "2023-12-31", "作者": "鲁迅"}
    attributes = db.Column(db.Text, default='{}') 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='available') # available, taken

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
        food_type = ItemType(name='食品', attributes=json.dumps([
            {"key": "expiry_date", "label": "保质期", "type": "date"},
            {"key": "quantity", "label": "数量", "type": "number"}
        ]))
        book_type = ItemType(name='书籍', attributes=json.dumps([
            {"key": "author", "label": "作者", "type": "text"},
            {"key": "isbn", "label": "ISBN", "type": "text"}
        ]))
        db.session.add(food_type)
        db.session.add(book_type)
        
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
    return jsonify({"token": token, "role": user.role, "username": user.username}), 200

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
    identity = get_jwt()  # 获取额外载荷
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
    
    data = request.json
    new_type = ItemType(
        name=data['name'],
        attributes=json.dumps(data['attributes']) # Expect list of dicts
    )
    db.session.add(new_type)
    db.session.commit()
    return jsonify({"msg": "Type added"}), 201

# 3. 物品管理模块
@app.route('/items', methods=['POST'])
@jwt_required()
def add_item():
    current_user_id = get_jwt_identity() # 现在这只是一个字符串 ID "1"
    user = User.query.get(int(current_user_id)) # 转回整数查询数据库
    data = request.json
    
    new_item = Item(
        type_id=data['type_id'],
        owner_id=user.id,
        name=data['name'],
        description=data.get('description'),
        address=data.get('address', user.address), # 默认使用用户地址
        phone=data.get('phone', user.phone),
        email=data.get('email', user.email),
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
    
    if type_id:
        query = query.filter_by(type_id=type_id)
    if owner_id:
        query = query.filter_by(owner_id=owner_id)
    if keyword:
        search = f"%{keyword}%"
        query = query.filter(
            (Item.name.like(search)) | 
            (Item.description.like(search))
        )
        
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

# 4. 管理员模块
@app.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    identity = get_jwt()
    if identity['role'] != 'admin':
        return jsonify({"msg": "Admin only"}), 403
        
    status = request.args.get('status')
    query = User.query
    if status:
        query = query.filter_by(status=status)
        
    users = query.all()
    return jsonify([{
        "id": u.id, "username": u.username, "email": u.email, 
        "status": u.status, "role": u.role
    } for u in users])

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

# 启动
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_admin()
    app.run(debug=True, port=5000)