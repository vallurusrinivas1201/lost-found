import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from ..database import db
from ..models import LostFound

lost_found_bp = Blueprint('lost_found_api', __name__)

def allowed_file(filename):
    """Check if the uploaded file has a valid image extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

def save_image(image_file):
    """Save upload to the uploads folder and return unique filename."""
    if not image_file or image_file.filename == '':
        return None
    
    if not allowed_file(image_file.filename):
        raise ValueError("Invalid image file format. Only JPG, JPEG, and PNG are allowed.")
    
    # Ensure secure name with UUID prefix for uniqueness
    file_ext = image_file.filename.rsplit('.', 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{file_ext}"
    
    upload_dir = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_dir, exist_ok=True)
    
    save_path = os.path.join(upload_dir, unique_name)
    image_file.save(save_path)
    return unique_name

def notify_clients(action, item_data):
    """Broadcast real-time status updates using Flask-SocketIO if available."""
    try:
        socketio = current_app.extensions.get('socketio')
        if socketio:
            socketio.emit('item_update', {'action': action, 'item': item_data})
    except Exception as e:
        current_app.logger.warning(f"Failed to broadcast socket update: {e}")

@lost_found_bp.route('/api/items', methods=['GET'])
def get_items():
    """Retrieve items with filtering, search, and pagination."""
    query = LostFound.query
    
    # Filters
    item_type = request.args.get('type')  # 'lost', 'found' or 'all'
    status = request.args.get('status')    # 'Open', 'Claim Requested', 'Returned', 'Closed'
    category = request.args.get('category')
    route = request.args.get('route')
    date = request.args.get('date')
    search = request.args.get('search')
    
    if item_type and item_type != 'all':
        query = query.filter(LostFound.type == item_type)
        
    if status and status != 'all':
        query = query.filter(LostFound.status == status)
        
    if category and category != 'all':
        query = query.filter(LostFound.category == category)
        
    if route and route != 'all':
        query = query.filter(LostFound.bus_route == route)
        
    if date:
        query = query.filter(LostFound.date == date)
        
    if search:
        search_pat = f"%{search}%"
        query = query.filter(
            (LostFound.item_name.like(search_pat)) |
            (LostFound.category.like(search_pat)) |
            (LostFound.bus_route.like(search_pat)) |
            (LostFound.student_name.like(search_pat)) |
            (LostFound.roll_number.like(search_pat))
        )
        
    # Sort newest first
    query = query.order_by(LostFound.created_at.desc())
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 6, type=int)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': [item.to_dict() for item in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'per_page': pagination.per_page,
        'has_prev': pagination.has_prev,
        'has_next': pagination.has_next
    })

@lost_found_bp.route('/api/item/<int:item_id>', methods=['GET'])
def get_item(item_id):
    """Retrieve details for a single item."""
    item = LostFound.query.get_or_404(item_id)
    return jsonify(item.to_dict())

@lost_found_bp.route('/api/lost-item', methods=['POST'])
def report_lost_item():
    """Create a new report for a lost item."""
    try:
        # Validate required fields
        item_name = request.form.get('item_name')
        category = request.form.get('category')
        bus_route = request.form.get('bus_route')
        student_name = request.form.get('student_name')
        roll_number = request.form.get('roll_number')
        mobile = request.form.get('mobile')
        email = request.form.get('email')
        
        if not all([item_name, category, bus_route, student_name, roll_number, mobile, email]):
            return jsonify({'error': 'Missing required fields.'}), 400
            
        if not mobile.isdigit():
            return jsonify({'error': 'Mobile number must contain only digits.'}), 400
            
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email address.'}), 400
            
        # File upload
        image_name = None
        if 'image' in request.files:
            image_file = request.files['image']
            image_name = save_image(image_file)
            
        # Save record
        item = LostFound(
            type='lost',
            item_name=item_name,
            category=category,
            description=request.form.get('description'),
            bus_route=bus_route,
            seat_number=request.form.get('seat_number'),
            time=request.form.get('time'),
            date=request.form.get('date'),
            image=image_name,
            student_name=student_name,
            roll_number=roll_number,
            mobile=mobile,
            email=email,
            status='Open'
        )
        db.session.add(item)
        db.session.commit()
        
        item_data = item.to_dict()
        notify_clients('create', item_data)
        
        return jsonify({'message': 'Lost item report submitted successfully!', 'item': item_data}), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@lost_found_bp.route('/api/found-item', methods=['POST'])
def report_found_item():
    """Create a new report for a found item."""
    try:
        # Validate required fields
        item_name = request.form.get('item_name')
        category = request.form.get('category')
        bus_route = request.form.get('bus_route')
        finder_name = request.form.get('finder_name')
        roll_number = request.form.get('roll_number')
        mobile = request.form.get('mobile')
        email = request.form.get('email')
        
        if not all([item_name, category, bus_route, finder_name, roll_number, mobile, email]):
            return jsonify({'error': 'Missing required fields.'}), 400
            
        if not mobile.isdigit():
            return jsonify({'error': 'Mobile number must contain only digits.'}), 400
            
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email address.'}), 400
            
        # File upload
        image_name = None
        if 'image' in request.files:
            image_file = request.files['image']
            image_name = save_image(image_file)
            
        # Save record
        item = LostFound(
            type='found',
            item_name=item_name,
            category=category,
            description=request.form.get('description'),
            bus_route=bus_route,
            seat_number=request.form.get('seat_number'),
            time=request.form.get('time'),
            date=request.form.get('date'),
            image=image_name,
            student_name=finder_name,  # student_name column is used to store reporter name
            roll_number=roll_number,
            mobile=mobile,
            email=email,
            status='Open'
        )
        db.session.add(item)
        db.session.commit()
        
        item_data = item.to_dict()
        notify_clients('create', item_data)
        
        return jsonify({'message': 'Found item report submitted successfully!', 'item': item_data}), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@lost_found_bp.route('/api/claim/<int:item_id>', methods=['PUT'])
def claim_item(item_id):
    """Claim a found item by submitting claimant details."""
    item = LostFound.query.get_or_404(item_id)
    
    if item.type != 'found':
        return jsonify({'error': 'Only found items can be claimed.'}), 400
        
    if item.status == 'Returned' or item.status == 'Closed':
        return jsonify({'error': 'This item is already returned or closed.'}), 400
        
    data = request.get_json() or {}
    name = data.get('claimer_name')
    roll = data.get('claimer_roll_number')
    phone = data.get('claimer_mobile')
    reason = data.get('claimer_reason')
    
    if not all([name, roll, phone, reason]):
        return jsonify({'error': 'All claim details (name, roll, phone, reason) are required.'}), 400
        
    if not phone.isdigit():
        return jsonify({'error': 'Claimer phone number must contain only digits.'}), 400
        
    try:
        item.claimer_name = name
        item.claimer_roll_number = roll
        item.claimer_mobile = phone
        item.claimer_reason = reason
        item.status = 'Claim Requested'
        
        db.session.commit()
        
        item_data = item.to_dict()
        notify_clients('update', item_data)
        
        return jsonify({'message': 'Claim request submitted successfully!', 'item': item_data}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@lost_found_bp.route('/api/return/<int:item_id>', methods=['PUT'])
def mark_returned(item_id):
    """Mark an item as returned (status -> Returned)."""
    item = LostFound.query.get_or_404(item_id)
    
    try:
        item.status = 'Returned'
        db.session.commit()
        
        item_data = item.to_dict()
        notify_clients('update', item_data)
        
        return jsonify({'message': 'Item marked as returned successfully!', 'item': item_data}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@lost_found_bp.route('/api/item/<int:item_id>/status', methods=['PUT'])
def update_item_status(item_id):
    """Generic status update for admin users (Approve, Close, Open, etc.)."""
    item = LostFound.query.get_or_404(item_id)
    data = request.get_json() or {}
    new_status = data.get('status')
    
    valid_statuses = {'Open', 'Claim Requested', 'Returned', 'Closed'}
    if not new_status or new_status not in valid_statuses:
        return jsonify({'error': f"Invalid status. Must be one of {valid_statuses}"}), 400
        
    try:
        item.status = new_status
        db.session.commit()
        
        item_data = item.to_dict()
        notify_clients('update', item_data)
        
        return jsonify({'message': f"Item status updated to '{new_status}' successfully!", 'item': item_data}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500

@lost_found_bp.route('/api/item/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete a report from the database."""
    item = LostFound.query.get_or_404(item_id)
    
    try:
        # If there's an image file, we delete it from disk if possible (optional but good practice)
        if item.image:
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], item.image)
            if os.path.exists(image_path):
                os.remove(image_path)
                
        db.session.delete(item)
        db.session.commit()
        
        notify_clients('delete', {'id': item_id})
        
        return jsonify({'message': 'Report deleted successfully!', 'id': item_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500
