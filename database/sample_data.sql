USE grocery_manager;

INSERT INTO grocery_items
(item_name, quantity, unit, category, price, purchase_date, priority, status, notes)
VALUES
('Milk', 2, 'L', 'Dairy', 3.50, '2026-07-05', 'High', 'Pending', 'Buy low fat milk'),
('Bananas', 6, 'pcs', 'Fruits', 2.25, '2026-07-05', 'Medium', 'Purchased', 'Ripe bananas'),
('Bread', 1, 'pack', 'Bakery', 1.75, '2026-07-04', 'Low', 'Pending', 'Whole wheat bread');
