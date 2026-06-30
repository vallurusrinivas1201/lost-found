from datetime import datetime
from .database import db

class LostFound(db.Model):
    """
    Model representing lost and found items.
    All data is stored in the 'lost_found' table.
    """
    __tablename__ = 'lost_found'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String(10), nullable=False)  # 'lost' or 'found'
    item_name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    bus_route = db.Column(db.String(100), nullable=False)
    seat_number = db.Column(db.String(20), nullable=True)
    time = db.Column(db.String(50), nullable=True)  # Approximate time
    date = db.Column(db.String(50), nullable=True)  # Date format (e.g. YYYY-MM-DD)
    image = db.Column(db.String(255), nullable=True)  # File path of upload
    
    # Submitter / Reporter Details
    student_name = db.Column(db.String(100), nullable=False)
    roll_number = db.Column(db.String(20), nullable=False)
    mobile = db.Column(db.String(15), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    
    # Status: 'Open', 'Claim Requested', 'Returned', 'Closed'
    status = db.Column(db.String(20), nullable=False, default='Open')
    
    # Claimant details (added to satisfy the claim functionality in a single table)
    claimer_name = db.Column(db.String(100), nullable=True)
    claimer_roll_number = db.Column(db.String(20), nullable=True)
    claimer_mobile = db.Column(db.String(15), nullable=True)
    claimer_reason = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert the model instance to a dictionary for API delivery."""
        return {
            'id': self.id,
            'type': self.type,
            'item_name': self.item_name,
            'category': self.category,
            'description': self.description,
            'bus_route': self.bus_route,
            'seat_number': self.seat_number,
            'time': self.time,
            'date': self.date,
            'image': self.image,
            'student_name': self.student_name,
            'roll_number': self.roll_number,
            'mobile': self.mobile,
            'email': self.email,
            'status': self.status,
            'claimer_name': self.claimer_name,
            'claimer_roll_number': self.claimer_roll_number,
            'claimer_mobile': self.claimer_mobile,
            'claimer_reason': self.claimer_reason,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
