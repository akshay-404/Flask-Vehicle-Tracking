from flask_socketio import emit
from flask_login import current_user
from extensions import socketio, db
from models import Location, User
from datetime import datetime

latest_locations = {}
active_status = set()
logged_in = 0

@socketio.on("connect")
def handle_connect():
    global logged_in
    logged_in += 1
    admin_count = User.query.filter_by(role="admin", isactive=True).count()
    emit("active_user_count", len(active_status), broadcast=True)
    emit("logged_in_count", logged_in - admin_count, broadcast=True)
    print(f"✅ WebSocket client {current_user.username} connected")

@socketio.on("disconnect")
def handle_disconnect():
    global logged_in
    logged_in -= 1
    admin_count = User.query.filter_by(role="admin", isactive=True).count()
    set_active(False)
    emit("logged_in_count", logged_in - admin_count, broadcast=True)
    print(f"❌ WebSocket client {current_user.username} disconnected")

@socketio.on("share_location")
def handle_share_location(data):
    try:
        set_active(True)
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        ts = datetime.now().isoformat()
        latest_locations[current_user.id] = f"{latitude},{longitude},{ts}"
        print(
            f"📍 Location fetched: {current_user.username} {latitude}, {longitude} {ts}",
            flush=True,
        )
        broadcast_user_status(current_user)

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error fetching location: {e}")

@socketio.on("stop_sharing")
def handle_stop():
    if current_user.is_authenticated:
        user = User.query.get(current_user.id)
        if user:
            set_active(False)
            print(f"🛑 Location sharing stopped for {current_user.username}")

def set_active(is_active, db=db, active_status=active_status, user=current_user):
    if not user.is_authenticated:
        return
    if is_active:
        if user.id not in active_status:
            user.isactive = True
            active_status.add(user.id)
            emit("active_user_count", len(active_status), broadcast=True)
    else:
        if user.id in active_status:
            user.last_known_location = latest_locations[current_user.id]
            user.isactive = False
            active_status.remove(user.id)
            emit("active_user_count", len(active_status), broadcast=True)

    db.session.commit()
    broadcast_user_status(user)

def broadcast_user_status(user):
    if user.role == "admin":
        return
    emit(
        "user_status_update",
        {
            "id": user.id,
            "username": user.username,
            "last_known_location": latest_locations.get(user.id, None),
            "isactive": user.isactive,
        },
        broadcast=True,
    )
