import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Vehicle, VehicleStatus, RiskLevel } from '../../types';
import { Save, Plus } from 'lucide-react';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Vehicle, 'id'>, id?: string) => void;
  initialVehicle?: Vehicle | null;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVehicle,
}) => {
  const isEditing = !!initialVehicle;

  const [code, setCode] = useState('');
  const [type, setType] = useState('4x4 Hill Terrain Hauler (Ashok Leyland)');
  const [driver, setDriver] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [speedKmH, setSpeedKmH] = useState(45);
  const [fuelPercent, setFuelPercent] = useState(90);
  const [cargo, setCargo] = useState('');
  const [cargoWeightKg, setCargoWeightKg] = useState(3500);
  const [status, setStatus] = useState<VehicleStatus>('Active');
  const [risk, setRisk] = useState<RiskLevel>('Low');
  const [state, setState] = useState('Assam');
  const [eta, setEta] = useState('Today 06:00 PM');
  const [altitudeMeters, setAltitudeMeters] = useState(120);

  useEffect(() => {
    if (initialVehicle) {
      setCode(initialVehicle.code);
      setType(initialVehicle.type);
      setDriver(initialVehicle.driver);
      setDriverPhone(initialVehicle.driverPhone);
      setCurrentLocation(initialVehicle.currentLocation);
      setDestination(initialVehicle.destination);
      setSpeedKmH(initialVehicle.speedKmH);
      setFuelPercent(initialVehicle.fuelPercent);
      setCargo(initialVehicle.cargo);
      setCargoWeightKg(initialVehicle.cargoWeightKg);
      setStatus(initialVehicle.status);
      setRisk(initialVehicle.risk);
      setState(initialVehicle.state);
      setEta(initialVehicle.eta);
      setAltitudeMeters(initialVehicle.telemetry.altitudeMeters);
    } else {
      setCode(`V-${Math.floor(100 + Math.random() * 900)}`);
      setType('4x4 Hill Terrain Hauler (Ashok Leyland)');
      setDriver('');
      setDriverPhone('+91 94350 ');
      setCurrentLocation('Guwahati Logistics Park');
      setDestination('District Hospital, Pasighat');
      setSpeedKmH(42);
      setFuelPercent(92);
      setCargo('Emergency Medical & Vaccines');
      setCargoWeightKg(2800);
      setStatus('Active');
      setRisk('Low');
      setState('Assam');
      setEta('Today 06:30 PM');
      setAltitudeMeters(180);
    }
  }, [initialVehicle, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicleData: Omit<Vehicle, 'id'> = {
      code,
      type,
      driver: driver || 'Assigned Officer',
      driverPhone: driverPhone || '+91 94350 11223',
      currentLocation,
      destination,
      speedKmH: Number(speedKmH),
      fuelPercent: Number(fuelPercent),
      cargo: cargo || 'General Relief Freight',
      cargoWeightKg: Number(cargoWeightKg),
      status,
      risk,
      state,
      eta,
      coordinates: initialVehicle ? initialVehicle.coordinates : [26.1445, 91.7362],
      routeId: initialVehicle ? initialVehicle.routeId : 'route-nh27',
      lastUpdated: 'Just now',
      telemetry: {
        engineTempC: 82,
        altitudeMeters: Number(altitudeMeters),
        satelliteSignal: 'Strong',
        batteryHealthPercent: Number(fuelPercent),
      },
    };

    onSave(vehicleData, initialVehicle?.id);
    onClose();
  };

  const vehicleTypes = [
    '4x4 Hill Terrain Hauler (Ashok Leyland)',
    'Heavy Multi-Axle Freight Truck (Tata Signa)',
    'Inland Waterways Cargo Barge (NW-2 River)',
    'Emergency Medical Heavy Drone (BVLOS SkyShip)',
    'Hill Ambulance & Critical Care Convoy',
  ];

  const statesList = [
    'Assam',
    'Arunachal Pradesh',
    'Meghalaya',
    'Manipur',
    'Mizoram',
    'Nagaland',
    'Sikkim',
    'Tripura',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Vehicle: ${initialVehicle?.code}` : 'Register New Fleet Vehicle'}
      subtitle="DoNER Regional Fleet & Multi-Modal Telemetry Registry"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Vehicle Code / Call-Sign</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. V-409"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Vehicle / Carrier Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
            >
              {vehicleTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned Driver / Pilot</label>
            <input
              type="text"
              required
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              placeholder="e.g. Bhaben Kalita"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Driver Phone Number</label>
            <input
              type="text"
              required
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="+91 94350 XXXXX"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Current Sector / Location</label>
            <input
              type="text"
              required
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. NH-27 Km 142 near Nagaon"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Final Destination</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Pasighat District Hospital"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">State Jurisdiction</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              {statesList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="Active">Active (In-Transit)</option>
              <option value="Delayed">Delayed (Weather / Pass)</option>
              <option value="Idle">Idle (Staged)</option>
              <option value="Maintenance">Maintenance / Yard</option>
              <option value="Emergency">Emergency (Priority / Alert)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Terrain Risk Level</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value as RiskLevel)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Hazard Zone</option>
              <option value="Critical">Critical Cutoff Risk</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Speed (km/h)</label>
            <input
              type="number"
              min="0"
              max="140"
              value={speedKmH}
              onChange={(e) => setSpeedKmH(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Fuel / Battery %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={fuelPercent}
              onChange={(e) => setFuelPercent(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Cargo Weight (kg)</label>
            <input
              type="number"
              min="0"
              value={cargoWeightKg}
              onChange={(e) => setCargoWeightKg(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Target ETA</label>
            <input
              type="text"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Consignment Payload Description</label>
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="e.g. Life-saving Oxygen Cylinders & Cryogenic Buffer"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isEditing ? 'Save Vehicle Updates' : 'Register Vehicle'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
