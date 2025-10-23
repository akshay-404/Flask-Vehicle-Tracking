from flask import Flask, render_template
from extensions import db, login_manager, bcrypt, socketio
from sockets import *
from flask_socketio import SocketIO
from auth.routes import auth_bp
from user.routes import user_bp
from admin.routes import admin_bp
from models import User
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    login_manager.init_app(app)
    bcrypt.init_app(app)
    socketio.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp, url_prefix="/user")
    app.register_blueprint(admin_bp)

    @app.route("/")
    def landing():
        return render_template("index.html")

    with app.app_context():
        db.create_all()
        if not User.query.filter_by(role="admin").first():
            admin = User(
                username=os.getenv("ADMIN_USERNAME"),
                password=bcrypt.generate_password_hash(os.getenv("ADMIN_PASSWORD")).decode("utf-8"),
                role="admin",
            )
            db.session.add(admin)
            db.session.commit()
    return app


if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
