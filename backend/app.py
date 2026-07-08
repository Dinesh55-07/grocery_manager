from pathlib import Path

import mysql.connector
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from database import get_connection

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / 'frontend'

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path='')
CORS(app)


def to_item(row):
    if row is None:
        return None

    return {
        'id': row['id'],
        'item_name': row['item_name'],
        'quantity': row['quantity'],
        'unit': row['unit'],
        'category': row['category'],
        'price': float(row['price']) if row['price'] is not None else 0,
        'purchase_date': row['purchase_date'].isoformat() if row['purchase_date'] else None,
        'priority': row['priority'],
        'status': row['status'],
        'notes': row['notes'],
        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None,
    }


def validate_payload(data):
    errors = {}

    item_name = str(data.get('item_name', '')).strip()
    unit = str(data.get('unit', '')).strip()
    category = str(data.get('category', '')).strip()
    priority = str(data.get('priority', 'Medium')).strip() or 'Medium'
    status = str(data.get('status', 'Pending')).strip() or 'Pending'
    notes = str(data.get('notes', '')).strip()
    purchase_date = data.get('purchase_date') or None

    try:
        quantity = int(data.get('quantity'))
    except (TypeError, ValueError):
        quantity = None
        errors['quantity'] = 'Quantity must be an integer.'

    try:
        price = float(data.get('price', 0) or 0)
    except (TypeError, ValueError):
        price = None
        errors['price'] = 'Price must be a number.'

    if not item_name:
        errors['item_name'] = 'Item name cannot be empty.'

    if quantity is not None and quantity <= 0:
        errors['quantity'] = 'Quantity must be greater than zero.'

    if price is not None and price < 0:
        errors['price'] = 'Price cannot be negative.'

    if not category:
        errors['category'] = 'Category is required.'

    if status not in {'Pending', 'Purchased'}:
        status = 'Pending'

    if priority not in {'High', 'Medium', 'Low'}:
        priority = 'Medium'

    payload = {
        'item_name': item_name,
        'quantity': quantity,
        'unit': unit,
        'category': category,
        'price': price if price is not None else 0,
        'purchase_date': purchase_date,
        'priority': priority,
        'status': status,
        'notes': notes,
    }

    return payload, errors


def fetch_all_items():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM grocery_items ORDER BY created_at DESC, id DESC')
        return [to_item(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        connection.close()


def fetch_item(item_id):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM grocery_items WHERE id = %s', (item_id,))
        return to_item(cursor.fetchone())
    finally:
        cursor.close()
        connection.close()


@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        return jsonify(fetch_all_items())
    except mysql.connector.Error as exc:
        return jsonify({'error': 'Unable to connect to the local MySQL database.', 'details': str(exc)}), 503


@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    try:
        item = fetch_item(item_id)
        if item is None:
            return jsonify({'error': 'Grocery item not found.'}), 404
        return jsonify(item)
    except mysql.connector.Error as exc:
        return jsonify({'error': 'Unable to connect to the local MySQL database.', 'details': str(exc)}), 503


@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.get_json(silent=True) or {}
    payload, errors = validate_payload(data)
    if errors:
        return jsonify({'error': 'Validation failed.', 'fields': errors}), 400

    query = '''
        INSERT INTO grocery_items
        (item_name, quantity, unit, category, price, purchase_date, priority, status, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    '''

    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            query,
            (
                payload['item_name'],
                payload['quantity'],
                payload['unit'],
                payload['category'],
                payload['price'],
                payload['purchase_date'],
                payload['priority'],
                payload['status'],
                payload['notes'],
            ),
        )
        connection.commit()
        new_item = fetch_item(cursor.lastrowid)
        return jsonify(new_item), 201
    except mysql.connector.Error as exc:
        connection.rollback()
        return jsonify({'error': 'Unable to create the grocery item.', 'details': str(exc)}), 500
    finally:
        cursor.close()
        connection.close()


@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    data = request.get_json(silent=True) or {}
    payload, errors = validate_payload(data)
    if errors:
        return jsonify({'error': 'Validation failed.', 'fields': errors}), 400

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM grocery_items WHERE id = %s', (item_id,))
        if cursor.fetchone() is None:
            return jsonify({'error': 'Grocery item not found.'}), 404

        update_query = '''
            UPDATE grocery_items
            SET item_name = %s,
                quantity = %s,
                unit = %s,
                category = %s,
                price = %s,
                purchase_date = %s,
                priority = %s,
                status = %s,
                notes = %s
            WHERE id = %s
        '''

        cursor.execute(
            update_query,
            (
                payload['item_name'],
                payload['quantity'],
                payload['unit'],
                payload['category'],
                payload['price'],
                payload['purchase_date'],
                payload['priority'],
                payload['status'],
                payload['notes'],
                item_id,
            ),
        )
        connection.commit()
        return jsonify(fetch_item(item_id))
    except mysql.connector.Error as exc:
        connection.rollback()
        return jsonify({'error': 'Unable to update the grocery item.', 'details': str(exc)}), 500
    finally:
        cursor.close()
        connection.close()


@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute('DELETE FROM grocery_items WHERE id = %s', (item_id,))
        if cursor.rowcount == 0:
            return jsonify({'error': 'Grocery item not found.'}), 404

        connection.commit()
        return jsonify({'message': 'Grocery item deleted successfully.'})
    except mysql.connector.Error as exc:
        connection.rollback()
        return jsonify({'error': 'Unable to delete the grocery item.', 'details': str(exc)}), 500
    finally:
        cursor.close()
        connection.close()


@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/<path:filename>')
def frontend_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
