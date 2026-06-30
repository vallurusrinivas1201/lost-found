from app import create_app, socketio

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # Start SocketIO when run directly
    socketio.run(app)
