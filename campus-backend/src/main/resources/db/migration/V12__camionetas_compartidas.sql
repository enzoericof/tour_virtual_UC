CREATE TABLE campus_vehicles (
    id text PRIMARY KEY CHECK (id ~ '^raptor-[0-7]$'),
    pose jsonb NOT NULL,
    driver uuid,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX campus_vehicles_driver ON campus_vehicles(driver) WHERE driver IS NOT NULL;
-- Posiciones métricas estimadas del estacionamiento del LED; quedan durables al conducir.
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-0', '{"id": "raptor-0", "x": 84.0869353321703, "y": 0, "z": -119.05111164833367, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-1', '{"id": "raptor-1", "x": 83.41739490793975, "y": 0, "z": -122.33352168066071, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-2', '{"id": "raptor-2", "x": 82.7478544837092, "y": 0, "z": -125.61593171298776, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-3', '{"id": "raptor-3", "x": 82.07831405947864, "y": 0, "z": -128.89834174531478, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-4', '{"id": "raptor-4", "x": 81.4087736352481, "y": 0, "z": -132.18075177764183, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-5', '{"id": "raptor-5", "x": 80.73923321101755, "y": 0, "z": -135.46316180996888, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-6', '{"id": "raptor-6", "x": 80.069692786787, "y": 0, "z": -138.74557184229593, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
INSERT INTO campus_vehicles(id,pose) VALUES ('raptor-7', '{"id": "raptor-7", "x": 79.40015236255645, "y": 0, "z": -142.02798187462295, "yaw": -2.9403747464873344, "speed": 0, "steer": 0, "driver": null, "at": 0}'::jsonb);
