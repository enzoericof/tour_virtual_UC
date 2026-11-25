-- Ocho plazas nuevas en el césped del LED; conserva los vehículos y reservas existentes.
ALTER TABLE campus_vehicles DROP CONSTRAINT campus_vehicles_id_check;
ALTER TABLE campus_vehicles ADD CONSTRAINT campus_vehicles_id_check CHECK (id ~ '^raptor-([0-9]|1[0-5])$');
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-8', '{"id":"raptor-8","x":38.84419215459826,"y":0,"z":-98.44283178962112,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-9', '{"id":"raptor-9","x":42.30338526672189,"y":0,"z":-100.015721808992,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-10', '{"id":"raptor-10","x":45.76257837884551,"y":0,"z":-101.58861182836287,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-11', '{"id":"raptor-11","x":49.22177149096912,"y":0,"z":-103.16150184773375,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-12', '{"id":"raptor-12","x":58.995428454013286,"y":0,"z":-106.0676383842266,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-13', '{"id":"raptor-13","x":62.45462156613691,"y":0,"z":-107.64052840359746,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-14', '{"id":"raptor-14","x":65.91381467826052,"y":0,"z":-109.21341842296832,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-15', '{"id":"raptor-15","x":69.37300779038412,"y":0,"z":-110.7863084423392,"yaw":1.9975506756241184,"speed":0,"steer":0,"driver":null,"at":0}'::jsonb) ON CONFLICT(id) DO NOTHING;
