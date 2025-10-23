# 🚗 Vehicle Tracking System (Flask + Socket.IO + Leaflet)

A **real-time web application** for tracking users or vehicles using Flask as the backend, Socket.IO for live updates, and Leaflet.js for interactive map visualization.  
Admins can monitor active users, view their last known locations, and dynamically display or hide markers on the map.

---

## ⚙️ Features

✅ **Live Location Updates** – Uses WebSockets to update user positions in real-time.  
✅ **Admin Dashboard** – View all users, active/inactive status, and toggle markers.  
✅ **Leaflet Map Integration** – Display and interact with user markers on an OpenStreetMap base layer.  
✅ **User Authentication** – Secure login and registration system using Flask-Login.  
✅ **Dynamic UI Updates** – Frontend built with JavaScript for seamless user experience.  
✅ **SQLite Database** – Lightweight and easy to deploy.  

---

## 🏗️ Tech Stack

| Layer | Technologies Used |
|-------|--------------------|
| **Backend** | Flask, Flask-SocketIO, Flask-Login |
| **Frontend** | HTML, CSS, JavaScript, Leaflet.js |
| **Database** | SQLite |
| **Realtime** | Socket.IO |
| **Environment** | Python (virtualenv / .venv) |

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/<your-username>/vehicle-tracking-flask.git
cd vehicle-tracking-flask
```

### 2️⃣ Create and Activate a Virtual Environment
```bash
python -m venv .venv
source .venv/bin/activate      # Linux/macOS
# OR
.venv\Scripts\activate         # Windows
```

### 3️⃣ Install Dependencies
```bash
pip install -r requirements.txt
```

### 4️⃣ Run the Application
```bash
flask run
```
or (if using Socket.IO)
```bash
python app.py
```

Then open your browser at:  
👉 `http://127.0.0.1:5000`

---

## 🗺️ Project Structure

```
Vehicle-Tracking/
├── app.py                # Main application entry point
├── sockets.py            # WebSocket events (real-time updates)
├── models.py             # Database models
├── auth/                 # Authentication routes (login/register)
├── user/                 # User dashboard routes
├── admin/                # Admin dashboard routes
├── static/               # JS, CSS, and image assets
├── templates/            # HTML templates
├── instance/             # Database and config (ignored in Git)
└── requirements.txt      # Dependencies
```

---

## 📊 Admin Dashboard Preview

- Displays total and active users  
- Toggle visibility of user markers  
- Track live updates directly on map  
- Filter and sort user table dynamically  

---

## 🔒 Security Notes

- Never push your `instance/` or `.db` files — they may contain sensitive data.  
- Store your environment variables (like secret keys) in a `.env` file or system-level config.

---

## 🤝 Contributing

Pull requests are welcome! If you’d like to suggest a feature or fix, open an issue describing your idea.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
