import os
from app import create_app
from backend.database import db
from backend.models import LostFound

# Initialize app and context
app = create_app()

with app.app_context():
    # Make sure all tables are created
    db.create_all()
    
    # Check if there is already data in the table
    if LostFound.query.count() == 0:
        print("Seeding database with realistic mock data...")
        
        mock_items = [
            LostFound(
                type='lost',
                item_name='VNRVJIET College ID Card',
                category='ID Card',
                description='Blue lanyard with VNRVJIET logo. ID Card belongs to a 3rd year CSE student. Lost it during the morning transit.',
                bus_route='Route-9 (KPHB via Nizampet)',
                seat_number='Seat 18 (near emergency exit)',
                time='08:30',
                date='2026-06-29',
                student_name='Siddharth Rao',
                roll_number='21D71A05C2',
                mobile='9848022338',
                email='siddharth21@vnrvjiet.in',
                status='Open'
            ),
            LostFound(
                type='found',
                item_name='Casio fx-991EX ClassWiz Calculator',
                category='Calculator',
                description='Black color scientific calculator with a grid design on the cover. Found on the back seat. Handed over to the bus driver.',
                bus_route='Route-7 (Kukatpally)',
                seat_number='Last row center seat',
                time='16:15',
                date='2026-06-28',
                student_name='Ananya Sen',
                roll_number='23D71A1204',
                mobile='7702581496',
                email='ananya23@vnrvjiet.in',
                status='Open'
            ),
            LostFound(
                type='lost',
                item_name='Redmi Note 12 Pro (Mobile)',
                category='Mobile',
                description='Blue color phone with clear silicon bumper cover. Lock screen wallpaper shows a mountain peak.',
                bus_route='Route-2 (LB Nagar)',
                seat_number='Row 5 window seat',
                time='08:10',
                date='2026-06-30',
                student_name='Karthik Reddy',
                roll_number='22D71A0314',
                mobile='8899001122',
                email='karthik22@vnrvjiet.in',
                status='Open'
            ),
            LostFound(
                type='found',
                item_name='Adidas Black Backpack',
                category='Bag',
                description='Contains a blue water bottle, a math notebook, and a headphone charger. Left on the luggage rack. Handed over to college reception counter.',
                bus_route='Route-11 (HCU)',
                seat_number='Overhead luggage rack',
                time='16:45',
                date='2026-06-26',
                student_name='Rohan Varma',
                roll_number='21D71A0289',
                mobile='9988776655',
                email='rohan21@vnrvjiet.in',
                status='Returned',
                claimer_name='Nikhil Gowd',
                claimer_roll_number='21D71A0292',
                claimer_mobile='9955112233',
                claimer_reason='I forgot my Adidas backpack on the HCU bus on Friday evening. It contains my blue water bottle, a math notebook, and a charger.'
            )
        ]
        
        # Add to session and commit
        db.session.bulk_save_objects(mock_items)
        db.session.commit()
        print("Database seeded successfully with 4 realistic records!")
    else:
        print("Database already contains records. Skipping seeding.")
