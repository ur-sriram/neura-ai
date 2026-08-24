import asyncio
import uuid
from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal, engine, Base
from app.models.schema import (
    User, Location, Vehicle, CargoType, Delivery, Driver
)

def hash_pass(password: str) -> str:
    return bcrypt.hash(password)

async def seed_data():
    async with AsyncSessionLocal() as session:
        print("Seeding NE-Setu database...")

        # 1. Seed Cargo Types
        cargos = [
            CargoType(code='MEDICAL', base_priority=90, risk_tolerance=0.50, needs_cold_chain=False, is_passenger=False),
            CargoType(code='MEDICINE_COLD', base_priority=95, risk_tolerance=0.40, needs_cold_chain=True, is_passenger=False),
            CargoType(code='FOOD', base_priority=70, risk_tolerance=0.65, needs_cold_chain=False, is_passenger=False),
            CargoType(code='WATER', base_priority=75, risk_tolerance=0.65, needs_cold_chain=False, is_passenger=False),
            CargoType(code='GENERAL', base_priority=40, risk_tolerance=0.80, needs_cold_chain=False, is_passenger=False),
            CargoType(code='PASSENGER', base_priority=85, risk_tolerance=0.45, needs_cold_chain=False, is_passenger=True),
        ]
        for c in cargos:
            await session.merge(c)
        await session.flush()
        print("  - Cargo types seeded.")

        # 2. Seed Users
        users = [
            User(id=uuid.UUID('11111111-1111-1111-1111-111111111111'), name='Operational Manager', role='manager', pass_hash=hash_pass('demo123')),
            User(id=uuid.UUID('22222222-2222-2222-2222-222222222222'), name='Disaster Officer', role='officer', pass_hash=hash_pass('demo123')),
            User(id=uuid.UUID('33333333-3333-3333-3333-333333333333'), name='Field Driver 1', role='driver', pass_hash=hash_pass('demo123')),
        ]
        for u in users:
            await session.merge(u)
        await session.flush()
        print("  - Seed users created.")

        # 3. Seed Locations (Depots, Health Facilities, Villages)
        depots_data = [
            ('Guwahati Central Depot', 'depot', 26.1445, 91.7362, 'urban', True, True),
            ('Shillong Forward Point', 'depot', 25.5788, 91.8933, 'high', True, True),
            ('Jowai Sub-depot', 'depot', 25.4497, 92.2086, 'medium', False, True),
        ]
        
        health_data = [
            ('Nongpoh Civil Hospital', 'health', 25.9012, 91.8821, 'medium', True, True),
            ('Shillong Civil Hospital', 'health', 25.5721, 91.8845, 'high', True, True),
            ('NEIGRIHMS Shillong', 'health', 25.5942, 91.9312, 'urban', True, True),
            ('Jowai Civil Hospital', 'health', 25.4512, 92.2145, 'medium', True, True),
            ('Umsning CHC', 'health', 25.7523, 91.8912, 'medium', False, True),
            ('Byrnihat PHC', 'health', 26.0512, 91.8845, 'medium', False, True),
            ('Mawryngkneng CHC', 'health', 25.5612, 92.0512, 'low', False, True),
            ('Shangpung PHC', 'health', 25.4812, 92.3212, 'low', False, False),
            ('Sonapur Health Center', 'health', 26.1212, 91.9812, 'medium', False, True),
            ('Dispur Hospital', 'health', 26.1412, 91.7912, 'urban', True, True),
        ]
        
        villages_data = [
            ('Jorabat Village', 'village', 26.1112, 91.8612, 'medium', False, False),
            ('Khanapara Border', 'village', 26.1212, 91.8212, 'high', False, True),
            ('Burnihat Town', 'village', 26.0412, 91.8712, 'medium', False, False),
            ('Umling Village', 'village', 25.8612, 91.8712, 'low', False, False),
            ('Umsning Market', 'village', 25.7412, 91.8912, 'medium', False, True),
            ('Barapani Lake Village', 'village', 25.6612, 91.9012, 'medium', False, True),
            ('Upper Shillong', 'village', 25.5412, 91.8512, 'medium', False, False),
            ('Laitlyngkot Village', 'village', 25.4412, 91.8412, 'low', False, False),
            ('Smit Village', 'village', 25.5212, 91.9512, 'medium', False, False),
            ('Puriang Village', 'village', 25.5412, 92.0812, 'low', False, False),
            ('Wahiajer Village', 'village', 25.4912, 92.1512, 'low', False, False),
            ('Jowai Town Center', 'village', 25.4412, 92.2012, 'high', False, True),
            ('Shangpung Village', 'village', 25.4712, 92.3112, 'low', False, False),
            ('Nartiang Monolith Village', 'village', 25.5712, 92.2212, 'low', False, False),
            ('Thadlaskein Lake', 'village', 25.5012, 92.1712, 'medium', False, True),
            ('Mawlynnong Village', 'village', 25.2012, 91.9112, 'low', False, False),
            ('Cherrapunji Town', 'village', 25.2912, 91.7312, 'medium', False, False),
            ('Dawki Border Village', 'village', 25.1812, 92.0112, 'medium', False, False),
        ]

        locations_list = []
        location_map = {}

        for name, kind, lat, lon, pop, cold, acc in depots_data + health_data + villages_data:
            loc_id = uuid.uuid4()
            loc = Location(
                id=loc_id,
                name=name,
                kind=kind,
                geom=f'SRID=4326;POINT({lon} {lat})',
                population_class=pop,
                cold_chain=cold,
                accessible_entry=acc
            )
            session.add(loc)
            location_map[name] = loc_id
            locations_list.append((name, loc_id, kind))
            
        await session.flush()
        print(f"  - Seeded {len(location_map)} locations (depots, health, villages).")

        guwahati_depot_id = location_map['Guwahati Central Depot']
        shillong_depot_id = location_map['Shillong Forward Point']
        jowai_depot_id = location_map['Jowai Sub-depot']

        # 4. Seed Vehicles (12 vehicles)
        vehicles_data = [
            ('HT-01', 'heavy', 8000, 15.0, 2.5, 10000, False, False, guwahati_depot_id),
            ('HT-02', 'heavy', 8000, 15.0, 2.5, 10000, False, False, guwahati_depot_id),
            ('HT-03', 'heavy', 8000, 15.0, 2.5, 10000, False, False, shillong_depot_id),
            ('MT-01', 'mini', 2500, 8.0, 2.0, 3500, False, False, guwahati_depot_id),
            ('MT-02', 'mini', 2500, 8.0, 2.0, 3500, False, False, shillong_depot_id),
            ('MT-03', 'mini', 2500, 8.0, 2.0, 3500, False, False, shillong_depot_id),
            ('MT-04', 'mini', 2500, 8.0, 2.0, 3500, False, False, jowai_depot_id),
            ('4X-01', '4x4', 800, 4.0, 1.9, 2500, False, False, shillong_depot_id),
            ('4X-02', '4x4', 800, 4.0, 1.9, 2500, False, False, jowai_depot_id),
            ('4X-03', '4x4', 800, 4.0, 1.9, 2500, False, False, guwahati_depot_id),
            ('AM-01', 'ambulance', 500, 3.5, 2.1, 3000, True, True, shillong_depot_id),
            ('AV-01', 'accessible_van', 600, 4.0, 2.2, 2800, False, True, shillong_depot_id),
        ]

        vehicles_list = []
        for label, vclass, cap, vol, width, weight, cold, acc, depot in vehicles_data:
            v_id = uuid.uuid4()
            v = Vehicle(
                id=v_id,
                label=label,
                vclass=vclass,
                capacity_kg=cap,
                volume_m3=vol,
                width_m=width,
                weight_kg=weight,
                cold_chain=cold,
                accessible=acc,
                home_depot=depot,
                range_km=500.0
            )
            session.add(v)
            vehicles_list.append(v)
            
        await session.flush()
        print("  - Seeded 12 vehicles across 3 depots.")

        driver = Driver(
            name='Rajesh Sharma',
            vehicle_id=vehicles_list[7].id,
            user_id=uuid.UUID('33333333-3333-3333-3333-333333333333'),
            duty_status='available'
        )
        session.add(driver)

        # 5. Seed Deliveries (35 deliveries)
        non_depot_locs = [loc_id for name, loc_id, kind in locations_list if kind != 'depot']
        
        delivery_specs = [
            ('MEDICINE_COLD', 150, 0.8, location_map['Nongpoh Civil Hospital'], 'Health Dept', 8, True),
            ('MEDICAL', 300, 1.5, location_map['Shillong Civil Hospital'], 'Disaster Response', 6, True),
            ('MEDICINE_COLD', 200, 1.0, location_map['NEIGRIHMS Shillong'], 'Health Dept', 4, True),
            ('MEDICAL', 400, 2.0, location_map['Jowai Civil Hospital'], 'Emergency Cell', 10, True),
            ('PASSENGER', 150, 2.0, location_map['Umsning CHC'], 'Assisted Mobility', 12, True),
            ('FOOD', 1500, 6.0, location_map['Burnihat Town'], 'Civil Supplies', 18, False),
            ('WATER', 2000, 8.0, location_map['Umling Village'], 'PHED Assam', 16, False),
            ('FOOD', 1200, 5.0, location_map['Barapani Lake Village'], 'Civil Supplies', 24, False),
            ('GENERAL', 800, 4.0, location_map['Upper Shillong'], 'PWD Meghalaya', 36, False),
            ('FOOD', 2500, 10.0, location_map['Smit Village'], 'Civil Supplies', 20, False),
            ('WATER', 1800, 7.0, location_map['Puriang Village'], 'PHED Meghalaya', 24, False),
            ('FOOD', 3000, 12.0, location_map['Jowai Town Center'], 'Dist Admn West Jaintia', 18, False),
            ('MEDICAL', 250, 1.2, location_map['Byrnihat PHC'], 'Health Dept', 8, True),
            ('FOOD', 800, 3.5, location_map['Shangpung Village'], 'Civil Supplies', 30, False),
            ('GENERAL', 1100, 4.5, location_map['Nartiang Monolith Village'], 'Block Dev Office', 40, False),
            ('WATER', 1500, 6.0, location_map['Thadlaskein Lake'], 'PHED Meghalaya', 22, False),
            ('PASSENGER', 120, 1.5, location_map['Mawryngkneng CHC'], 'Assisted Mobility', 14, False),
            ('FOOD', 900, 3.8, location_map['Sonapur Health Center'], 'Relief Cell', 28, False),
            ('GENERAL', 2200, 9.0, location_map['Dispur Hospital'], 'PWD Assam', 48, False),
            ('FOOD', 1300, 5.5, location_map['Jorabat Village'], 'Civil Supplies', 24, False),
        ]

        for i in range(15):
            loc_target = non_depot_locs[i % len(non_depot_locs)]
            ccode = ['FOOD', 'WATER', 'GENERAL'][i % 3]
            delivery_specs.append(
                (ccode, 500 + (i * 100), 2.0 + (i * 0.5), loc_target, 'Routine Logistics', 24 + i*2, False)
            )

        for ccode, w_kg, vol, dest, req, deadline, is_emerg in delivery_specs:
            deliv = Delivery(
                cargo_code=ccode,
                weight_kg=w_kg,
                volume_m3=vol,
                dest_id=dest,
                requested_by=req,
                deadline_sim=deadline,
                priority_score=95.0 if is_emerg else (75.0 if ccode in ['FOOD','WATER'] else 45.0),
                status='NEW',
                is_emergency=is_emerg,
                created_sim=0
            )
            session.add(deliv)

        await session.commit()
        print("  - Seeded 35 delivery requests (5 emergency).")
        print("Database seeding complete successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
