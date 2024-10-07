from flask import Flask, request, jsonify
from flask_cors import CORS
from app.services import DataService
from app.config import Config
from app.database import DatabaseOperations

def create_app() -> Flask:
    app = Flask(__name__)
    

    cors_config = {
        "origins": ["http://localhost:3000"],  
        "methods": ["GET", "POST"], 
        "allow_headers": ["Content-Type"], 
    }
    CORS(app, resources={r"/*": cors_config})

    config = Config()
    db_ops = DatabaseOperations(config)
    data_service = DataService(db_ops)

    @app.route('/', methods=['POST'])
    def receive_data():
        data = request.get_json()
        table = data.get('table')
        key = data.get('key')
        value = data.get('value')
        short = data.get('short')
        time = data.get('time')
        owner = data.get('owner')
        
        # Sanitize inputs to prevent SQL injection
        if owner:
            owner = owner.replace("'", "\\'")
        if value:
            value = value.replace("'", "\\'")

        if not key or not value:
            return jsonify({'error': 'Invalid data format'}), 400

        if data_service.serv_add_data(table, key, value, short, time, owner):
            return jsonify({'message': 'Data received and inserted successfully'}), 200
        else:
            return jsonify({'error': 'Key already exists'}), 400

    @app.route('/check/<table>/<key>', methods=['GET'])
    def check_data(table, key: str):
        value = data_service.serv_retrieve_data(table, key)
        if value:
            return jsonify({
                'exists': True, 
                'value': value[0], 
                'short': value[1], 
                'time': value[2], 
                'owner': value[3]
            }), 200
        return jsonify({'exists': False}), 404
        
    @app.route('/update-short/', methods=['POST'])
    def update_data_short():
        data = request.get_json()
        table = data.get('table')
        key = data.get('key')
        short = data.get('short')

        if short:
            short = short.replace("'", "\\'")  # Sanitize input

        if not key:
            return jsonify({'error': 'Invalid data format'}), 400
        
        data_service.serv_update_short(table, key, short)
        return jsonify({'message': 'Data updated successfully'}), 200
        
    @app.route('/update-time/', methods=['POST'])
    def update_data_time():
        data = request.get_json()
        table = data.get('table')
        key = data.get('key')
        time = data.get('time')
        owner = data.get('owner')

        if owner:
            owner = owner.replace("'", "\\'")  # Sanitize input

        if not key:
            return jsonify({'error': 'Invalid data format'}), 400
        
        data_service.serv_update_time(table, key, time, owner)
        return jsonify({'message': 'Data updated successfully'}), 200

        
    @app.route('/update-time-short/', methods=['POST'])
    def update_data_time_short():
        data = request.get_json()
        table = data['table']
        key = data['key']
        short = data['short']
        time = data['time']
        owner = data['owner']

        if short:
            short = short.replace("'", "\\'")
        if owner:
            owner = owner.replace("'", "\\'")
        
        try:
            data_service.serv_update_time_short(table, key, short, time, owner)
            return jsonify({"status": "success"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    return app
