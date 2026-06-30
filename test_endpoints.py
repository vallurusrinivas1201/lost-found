import unittest
import os
import json
import io
from app import create_app
from backend.database import db
from backend.models import LostFound

class LostFoundAPITestCase(unittest.TestCase):
    def setUp(self):
        """Set up a temporary database for testing."""
        self.app = create_app()
        # Override database to a memory-based SQLite db for testing isolation
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # Add one lost and one found mock record
            self.lost_item = LostFound(
                type='lost',
                item_name='Test Lost Laptop',
                category='Laptop',
                description='Grey Dell Laptop',
                bus_route='Route-1 (Patancheru)',
                seat_number='12',
                time='09:00',
                date='2026-06-30',
                student_name='John Doe',
                roll_number='21D71A0501',
                mobile='9999999999',
                email='john@vnrvjiet.in',
                status='Open'
            )
            self.found_item = LostFound(
                type='found',
                item_name='Test Found Keys',
                category='Keys',
                description='Keyring with a red tag',
                bus_route='Route-7 (Kukatpally)',
                seat_number='5',
                time='15:30',
                date='2026-06-29',
                student_name='Jane Finder',
                roll_number='22D71A1202',
                mobile='8888888888',
                email='jane@vnrvjiet.in',
                status='Open'
            )
            db.session.add(self.lost_item)
            db.session.add(self.found_item)
            db.session.commit()
            
            # Store IDs for tests
            self.lost_id = self.lost_item.id
            self.found_id = self.found_item.id

    def tearDown(self):
        """Clean up the database session and tables."""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_get_items(self):
        """Test retrieving all items and filtering."""
        response = self.client.get('/api/items')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['items']), 2)
        
        # Test filtering by type
        response = self.client.get('/api/items?type=lost')
        data = json.loads(response.data)
        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['item_name'], 'Test Lost Laptop')

    def test_get_item_detail(self):
        """Test retrieving a single item's details."""
        response = self.client.get(f'/api/item/{self.lost_id}')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['item_name'], 'Test Lost Laptop')
        self.assertEqual(data['type'], 'lost')

    def test_report_lost_item(self):
        """Test reporting a new lost item via POST with form-data."""
        post_data = {
            'item_name': 'New Wallet',
            'category': 'Wallet',
            'description': 'Brown leather wallet',
            'bus_route': 'Route-2 (LB Nagar)',
            'seat_number': '3',
            'time': '10:00',
            'date': '2026-06-30',
            'student_name': 'Alice Smith',
            'roll_number': '21D71A0410',
            'mobile': '7777777777',
            'email': 'alice@vnrvjiet.in'
        }
        response = self.client.post('/api/lost-item', data=post_data)
        self.assertEqual(response.status_code, 201)
        
        # Check database
        with self.app.app_context():
            item = LostFound.query.filter_by(item_name='New Wallet').first()
            self.assertIsNotNone(item)
            self.assertEqual(item.type, 'lost')
            self.assertEqual(item.status, 'Open')

    def test_report_validation_errors(self):
        """Test field validation checks."""
        # Test invalid phone number (has letters)
        post_data = {
            'item_name': 'Calculator',
            'category': 'Calculator',
            'bus_route': 'Route-3 (Yusufguda)',
            'student_name': 'Bob',
            'roll_number': '21D71A0515',
            'mobile': '999abc9999',  # Invalid phone
            'email': 'bob@vnrvjiet.in'
        }
        response = self.client.post('/api/lost-item', data=post_data)
        self.assertEqual(response.status_code, 400)
        
        # Test invalid email (missing @)
        post_data['mobile'] = '9999999999'
        post_data['email'] = 'bobvnrvjiet.in'  # Invalid email
        response = self.client.post('/api/lost-item', data=post_data)
        self.assertEqual(response.status_code, 400)

    def test_claim_found_item(self):
        """Test claim submission on found item."""
        claim_data = {
            'claimer_name': 'Owner Bob',
            'claimer_roll_number': '21D71A0588',
            'claimer_mobile': '9550005500',
            'claimer_reason': 'The keys have my name engraved on the back tag.'
        }
        response = self.client.put(
            f'/api/claim/{self.found_id}',
            data=json.dumps(claim_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # Check status update
        with self.app.app_context():
            item = LostFound.query.get(self.found_id)
            self.assertEqual(item.status, 'Claim Requested')
            self.assertEqual(item.claimer_name, 'Owner Bob')

    def test_mark_returned_admin(self):
        """Test marking an item as returned."""
        response = self.client.put(f'/api/return/{self.lost_id}')
        self.assertEqual(response.status_code, 200)
        
        # Check database
        with self.app.app_context():
            item = LostFound.query.get(self.lost_id)
            self.assertEqual(item.status, 'Returned')

    def test_delete_item(self):
        """Test deleting an item."""
        response = self.client.delete(f'/api/item/{self.lost_id}')
        self.assertEqual(response.status_code, 200)
        
        # Verify it was removed
        with self.app.app_context():
            item = LostFound.query.get(self.lost_id)
            self.assertIsNone(item)

if __name__ == '__main__':
    unittest.main()
