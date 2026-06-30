import os
from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO
from backend.database import db
from backend.routes.lost_found import lost_found_bp

# Initialize Flask-SocketIO globally
socketio = SocketIO()

def create_app():
    app = Flask(__name__, 
                template_folder='templates',
                static_folder='static')
    
    # Configuration
    base_dir = os.path.abspath(os.path.dirname(__file__))
    
    # Database config - uses SQLite locally. 
    # Switch to MySQL later by changing the URI below.
    # SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://username:password@localhost/db_name'
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(base_dir, 'lost_found.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 5MB Max Content Length
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
    
    # Upload folder
    app.config['UPLOAD_FOLDER'] = os.path.join(base_dir, 'uploads')
    
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Bind extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    
    # Store SocketIO in app extensions so blueprint can access it
    app.extensions['socketio'] = socketio
    
    # Register blueprints
    app.register_blueprint(lost_found_bp)
    
    # Create tables automatically inside context
    with app.app_context():
        db.create_all()
        
    # --- Template Routes ---
    @app.route('/')
    def index():
        return render_template('index.html')
        
    @app.route('/report-lost')
    def report_lost():
        return render_template('report_lost.html')
        
    @app.route('/report-found')
    def report_found():
        return render_template('report_found.html')
        
    @app.route('/view-item/<int:item_id>')
    def view_item(item_id):
        # We render view_item.html and Javascript will load details via GET /api/item/<id>
        return render_template('view_item.html', item_id=item_id)
        
    @app.route('/admin')
    def admin():
        return render_template('admin.html')
        
    # --- Serve Uploads ---
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        
    return app

if __name__ == '__main__':
    app = create_app()
    print("--------------------------------------------------")
    print("VJ Bus Lost & Found module running independently!")
    print("Access application: http://127.0.0.1:5000")
    print("--------------------------------------------------")
    socketio.run(app, debug=True, port=5000)
