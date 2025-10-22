from flask import Flask, render_template
from extensions import db, login_manager, bcrypt, socketio
from sockets import *
from flask_socketio import SocketIO
from auth.routes import auth_bp
from user.routes import user_bp
from admin.routes import admin_bp
from models import User

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "supersecretkey"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///vehicle-tracker.db"

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    bcrypt.init_app(app)
    socketio.init_app(app)  # ✅ Attach SocketIO to this Flask app

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp, url_prefix="/user")
    app.register_blueprint(admin_bp)

    # Landing page
    @app.route("/")
    def landing():
        return render_template("index.html")

    # Create admin user if not existing
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(role="admin").first():
            admin = User(
                username="admin",
                password=bcrypt.generate_password_hash("admin123").decode("utf-8"),
                role="admin",
            )
            db.session.add(admin)
            db.session.commit()

    return app


if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
