from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from models import User

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.route("/dashboard")
@login_required
def dashboard():
    if current_user.role != "admin":
        return "Unauthorized", 403
    total_users = User.query.filter_by(role="user").count()

    return render_template(
        "admin/dashboard.html", total_users=total_users, user=current_user
    )

@admin_bp.route("/api/users")
@login_required
def get_users():
    users = User.query.all()
    data = []
    for user in users:
        if user.role == "admin":
            continue
        data.append(
            {
                "id": user.id,
                "username": user.username,
                "last_known_location": user.last_known_location,
                "isactive": user.isactive,
            }
        )
    return jsonify(data)

@admin_bp.route("/api/users_count")
@login_required
def get_users_count():
    active_count = User.query.filter_by(isactive=True, role="user").count()
    return jsonify({
            "active_user_count": active_count
        })
