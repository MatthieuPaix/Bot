from flask import Flask, request, jsonify
from flask_cors import CORS
from app.services import DataService
from app.config import Config
from app.database import DatabaseOperations

def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

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
        recOwner = data.get('recOwner')

        if not key or not value:
            return jsonify({'error': 'Invalid data format'}), 400

        if data_service.add_data(key, value, short):
            return jsonify({'message': 'Data received and inserted successfully'}), 200
        else:
            return jsonify({'error': 'Key already exists'}), 400

    @app.route('/check/<table>/<key>', methods=['GET'])
    def check_data(table, key: str):
        value = data_service.retrieve_data(table, key)
        if value is not None:
            return jsonify({'exists': True, 'value': value,}), 200
        else:
            return jsonify({'exists': False}), 404
        
    @app.route('/update-short/', methods=['POST'])
    def update_data_short():
        data = request.get_json()
        table = data.get('table')
        key = data.get('key')
        short = data.get('short')

        if not key:
            return jsonify({'error': 'Invalid data format'}), 400

        if data_service.udpate_short(table, key, short):
            return jsonify({'message': 'Data received and inserted successfully'}), 200
        
    @app.route('/update-time/', methods=['POST'])
    def update_data_time():
        data = request.get_json()
        table = data.get('table')
        key = data.get('key')
        time = data.get('time')
        owner = data.get('owner')

        if not key:
            return jsonify({'error': 'Invalid data format'}), 400

        if data_service.udpate_time(table, key, time, owner):
            return jsonify({'message': 'Data received and inserted successfully'}), 200
        